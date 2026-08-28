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

const INSTRUCTIONS = `You are a visual thinking partner on a shared, infinite Miro-style canvas, speaking by voice. You sketch by calling tools: add_shape (kind = rectangle, ellipse, diamond, note, text; optional x,y to place it), connect_shapes, update_shape, delete_shape, auto_layout, set_title, get_canvas. The user sees every change instantly.

CHOOSE THE RIGHT FORM — do not default to a top-down flowchart. Match the thinking:
- Process/sequence → boxes + arrows, then auto_layout.
- Mind map → a central idea near x:650,y:400 with branches placed around it using x,y; arrows optional.
- Wireframe/layout → position rectangles with x,y (header top, sidebar left, content middle); usually no arrows.
- Ideas/brainstorm/list → sticky notes (kind:note) clustered or stacked with x,y; rarely arrows.
The canvas is ~1400 wide and ~900 tall; place things deliberately with room to breathe.

- Use arrows ONLY when a real relationship or flow matters — most sketches need few or none. Only auto_layout arrow-based flows; position mind maps/wireframes yourself with x,y.
- Reuse existing shapes by label; never duplicate. Just do it, don't narrate ("let me look at the board"); read get_canvas silently only if needed.
- After acting, say ONE short sentence. Never repeat yourself. Short labels (2-4 words), colour meaningfully. Build on what the user draws.`;

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
          // semantic VAD waits for a semantically complete thought, so mid-sentence pauses don't cut you off
          input: { turn_detection: { type: 'semantic_vad', eagerness: 'low', create_response: true, interrupt_response: true } },
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
