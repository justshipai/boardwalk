'use client';

import { useCallback, useRef, useState } from 'react';
import { executeAction, toRealtimeTools } from '@/actions/registry';
import { useMeeting } from '@/state/meeting-store';
import { buildInstructions } from './instructions';

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface RealtimeEvent {
  type: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  transcript?: string;
  error?: { message?: string };
}

function extractSecret(session: Record<string, unknown>): string | null {
  if (typeof session.value === 'string') return session.value;
  const cs = session.client_secret as { value?: string } | string | undefined;
  if (typeof cs === 'string') return cs;
  if (cs && typeof cs.value === 'string') return cs.value;
  return null;
}

export function useRealtime() {
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [boardSpeaking, setBoardSpeaking] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const send = (payload: object) => dc.current?.readyState === 'open' && dc.current.send(JSON.stringify(payload));

  const pushTools = useCallback(() => {
    send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: buildInstructions(useMeeting.getState().intensity),
        tools: toRealtimeTools(),
        tool_choice: 'auto',
      },
    });
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
            item: {
              type: 'function_call_output',
              call_id: evt.call_id,
              output: JSON.stringify({ summary: outcome.summary, ...(outcome.data ?? {}) }),
            },
          });
          pushTools(); // dynamic lifecycle may have changed the available tools
          send({ type: 'response.create' });
          break;
        }
        case 'response.created':
          setBoardSpeaking(true);
          break;
        case 'response.done':
          setBoardSpeaking(false);
          break;
        case 'response.output_audio_transcript.done':
          if (evt.transcript) useMeeting.getState().addTranscript({ speaker: 'board', text: evt.transcript });
          break;
        case 'conversation.item.input_audio_transcription.completed':
          if (evt.transcript) useMeeting.getState().addTranscript({ speaker: 'founder', text: evt.transcript });
          break;
        case 'error':
          setError(evt.error?.message ?? 'Realtime error');
          break;
      }
    },
    [pushTools],
  );

  const cleanup = useCallback(() => {
    dc.current?.close();
    pc.current?.close();
    mic.current?.getTracks().forEach((t) => t.stop());
    if (audio.current) audio.current.srcObject = null;
    dc.current = null;
    pc.current = null;
    mic.current = null;
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus('idle');
    setBoardSpeaking(false);
  }, [cleanup]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      const res = await fetch('/api/realtime/session', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Voice is not available right now.');
      }
      const session = await res.json();
      const secret = extractSecret(session);
      if (!secret) throw new Error('Realtime session did not return a usable token.');
      const model = (session.model as string) ?? 'gpt-realtime-2';

      const peer = new RTCPeerConnection();
      peer.ontrack = (e) => {
        if (!audio.current) {
          audio.current = new Audio();
          audio.current.autoplay = true;
        }
        audio.current.srcObject = e.streams[0];
      };

      // mic is best-effort — if it is denied or absent we still connect and fall back to typed input
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.current = stream;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      } catch {
        peer.addTransceiver('audio', { direction: 'recvonly' });
      }

      const channel = peer.createDataChannel('oai-events');
      dc.current = channel;
      channel.onopen = () => {
        pushTools();
        setStatus('connected');
      };
      channel.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          /* ignore non-JSON frames */
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
  }, [handleEvent, pushTools, cleanup]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  // text fallback: drive the live board model with a typed founder turn (P0 mic-failure path)
  const sendText = useCallback((text: string) => {
    if (dc.current?.readyState !== 'open') return false;
    useMeeting.getState().addTranscript({ speaker: 'founder', text });
    send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
    send({ type: 'response.create' });
    return true;
  }, []);

  return { status, error, muted, boardSpeaking, connect, disconnect, toggleMute, sendText };
}
