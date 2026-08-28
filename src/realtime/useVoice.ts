'use client';

import { useCallback, useRef, useState } from 'react';
import { executeAction, toRealtimeTools } from '@/actions/registry';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface RealtimeEvent {
  type: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  error?: { message?: string };
}

const INSTRUCTIONS = `You are a collaborative diagramming partner sharing a live canvas with the user, speaking by voice. You draw and edit the canvas by calling the tools (add_node, connect_nodes, update_node, auto_layout, delete_node, set_title, get_canvas). The user sees every change instantly.

- When the user asks you to draw, add, connect or change something, DO IT with the tools — then say one short sentence confirming what you drew. Use short labels (2-4 words).
- After building a new diagram, call auto_layout to tidy it.
- Before changing an existing diagram, call get_canvas and refer to nodes by their label.
- Use colour meaningfully: red for risks, green for done, amber for in-progress, blue for systems.
- You and the user draw on the SAME canvas together — build on what they add. Keep every spoken reply to one short sentence; the diagram is the output, not talk.`;

function extractSecret(session: Record<string, unknown>): string | null {
  if (typeof session.value === 'string') return session.value;
  const cs = session.client_secret as { value?: string } | string | undefined;
  if (typeof cs === 'string') return cs;
  if (cs && typeof cs.value === 'string') return cs.value;
  return null;
}

export function useVoice() {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const send = (payload: object) => dc.current?.readyState === 'open' && dc.current.send(JSON.stringify(payload));

  const pushSession = useCallback((withGreeting: boolean) => {
    send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: INSTRUCTIONS,
        tools: toRealtimeTools(),
        tool_choice: 'auto',
        audio: {
          input: { turn_detection: { type: 'server_vad', threshold: 0.55, silence_duration_ms: 700, create_response: true, interrupt_response: true } },
        },
      },
    });
    if (withGreeting) {
      send({
        type: 'response.create',
        response: { instructions: 'Greet the user in one short sentence and invite them to tell you what to draw.', tool_choice: 'none' },
      });
    }
  }, []);

  const handleEvent = useCallback(
    (evt: RealtimeEvent) => {
      switch (evt.type) {
        case 'response.function_call_arguments.done': {
          if (!evt.name || !evt.call_id) return;
          let args: Record<string, unknown> = {};
          try {
            args = evt.arguments ? JSON.parse(evt.arguments) : {};
          } catch {
            args = {};
          }
          const outcome = executeAction(evt.name, args);
          send({
            type: 'conversation.item.create',
            item: { type: 'function_call_output', call_id: evt.call_id, output: JSON.stringify({ summary: outcome.summary, ...(outcome.data ?? {}) }) },
          });
          send({ type: 'session.update', session: { type: 'realtime', tools: toRealtimeTools() } });
          send({ type: 'response.create' });
          break;
        }
        case 'response.created':
          setSpeaking(true);
          break;
        case 'response.done':
          setSpeaking(false);
          break;
        case 'error':
          setError(evt.error?.message ?? 'Voice error');
          break;
      }
    },
    [],
  );

  const cleanup = useCallback(() => {
    dc.current?.close();
    pc.current?.close();
    mic.current?.getTracks().forEach((t) => t.stop());
    if (audio.current) audio.current.srcObject = null;
    dc.current = null;
    pc.current = null;
    mic.current = null;
    setSpeaking(false);
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    // unlock audio inside the click gesture
    if (!audio.current) {
      const el = new Audio();
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      try {
        el.style.display = 'none';
        document.body.appendChild(el);
      } catch {
        /* detached playback still works in most browsers */
      }
      audio.current = el;
    }
    audio.current.play().catch(() => {});

    try {
      const res = await fetch('/api/realtime/session', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Voice is not available right now.');
      }
      const session = await res.json();
      const secret = extractSecret(session);
      if (!secret) throw new Error('No usable session token.');
      const model = (session.model as string) ?? 'gpt-realtime-2';

      const peer = new RTCPeerConnection();
      peer.ontrack = (e) => {
        if (audio.current) {
          audio.current.srcObject = e.streams[0];
          audio.current.play().catch(() => {});
        }
      };
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.current = stream;
        stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      } catch {
        peer.addTransceiver('audio', { direction: 'recvonly' });
      }

      const channel = peer.createDataChannel('oai-events');
      dc.current = channel;
      channel.onopen = () => {
        pushSession(true);
        setStatus('connected');
      };
      channel.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          /* ignore non-JSON */
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/sdp' },
      });
      if (!sdpRes.ok) throw new Error('Could not establish the audio connection.');
      await peer.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
      pc.current = peer;
    } catch (err) {
      cleanup();
      setError(err instanceof Error ? err.message : 'Could not connect.');
      setStatus('error');
    }
  }, [cleanup, handleEvent, pushSession]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  return { status, error, muted, speaking, connect, disconnect, toggleMute };
}
