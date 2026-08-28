'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { executeAction, toRealtimeTools } from '@/actions/registry';
import { currentSlide, useMeeting } from '@/state/meeting-store';
import type { BoardSeat } from '@/state/types';
import { buildInstructions } from './instructions';
import { addressedPersona, CHAIR, personas, pickSpeaker, type Persona } from './personas';

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface RealtimeEvent {
  type: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  transcript?: string;
  error?: { message?: string };
}

interface Agent {
  persona: Persona;
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  stream?: MediaStream;
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
  const [activeSpeaker, setActiveSpeaker] = useState<BoardSeat | null>(null);

  const agents = useRef<Agent[]>([]);
  const mic = useRef<MediaStream | null>(null);
  const lastSpeaker = useRef<BoardSeat | null>(null);
  const speaking = useRef(false);
  // one <audio> element, unlocked during the Start click, that plays whoever is currently speaking
  const sharedAudio = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<BoardSeat | null>(null);

  const agentFor = (seat: BoardSeat) => agents.current.find((a) => a.persona.seat === seat);
  const sendTo = (agent: Agent | undefined, payload: object) =>
    agent?.dc.readyState === 'open' && agent.dc.send(JSON.stringify(payload));

  // route the given agent's audio to the shared element (used when a persona becomes the speaker)
  const attachAudio = (agent: Agent | undefined) => {
    const el = sharedAudio.current;
    if (el && agent?.stream) {
      el.srcObject = agent.stream;
      el.play().catch(() => {});
    }
  };

  const setActive = (seat: BoardSeat | null) => {
    activeRef.current = seat;
    setActiveSpeaker(seat);
    if (seat) attachAudio(agentFor(seat));
  };

  const configureAgent = useCallback((agent: Agent) => {
    const isChair = agent.persona.seat === CHAIR.seat;
    sendTo(agent, {
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: buildInstructions(agent.persona, useMeeting.getState().intensity),
        tools: toRealtimeTools(),
        tool_choice: 'auto',
        max_output_tokens: 160, // keep spoken turns to a sentence or two
        audio: {
          input: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,
              silence_duration_ms: 900,
              prefix_padding_ms: 300,
              create_response: false, // the conductor decides who speaks — never auto-respond
              interrupt_response: false,
            },
            transcription: isChair ? { model: 'gpt-4o-mini-transcribe' } : undefined,
          },
        },
      },
    });
  }, []);

  // ask one persona to speak now
  const trigger = useCallback((seat: BoardSeat, instructions?: string) => {
    const agent = agentFor(seat);
    if (!agent) return;
    speaking.current = true;
    setActive(seat);
    sendTo(agent, { type: 'response.create', response: instructions ? { instructions, tool_choice: 'none' } : {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // decide whether the board reacts to the founder's turn, and if so, who
  const conduct = useCallback(
    (founderText: string) => {
      if (speaking.current) return; // never talk over whoever is speaking
      const text = founderText.trim();
      // if the founder addressed someone by name, that member always answers
      const named = addressedPersona(text);
      if (named) {
        trigger(named.seat);
        return;
      }
      const speaker = pickSpeaker(text, lastSpeaker.current);
      const relevant = text.includes('?') || speaker.keywords.some((k) => text.toLowerCase().includes(k));
      // stay silent while the founder is simply presenting; only step in when it's relevant to a seat
      if (!relevant) return;
      trigger(speaker.seat);
    },
    [trigger],
  );

  const handleEvent = useCallback(
    (agent: Agent, evt: RealtimeEvent) => {
      const seat = agent.persona.seat;
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
          sendTo(agent, {
            type: 'conversation.item.create',
            item: { type: 'function_call_output', call_id: evt.call_id, output: JSON.stringify({ summary: outcome.summary, ...(outcome.data ?? {}) }) },
          });
          sendTo(agent, { type: 'session.update', session: { type: 'realtime', tools: toRealtimeTools() } });
          sendTo(agent, { type: 'response.create' });
          break;
        }
        case 'response.created':
          speaking.current = true;
          setActive(seat);
          break;
        case 'response.done':
          speaking.current = false;
          lastSpeaker.current = seat;
          setActive(null);
          break;
        case 'response.output_audio_transcript.done':
          if (evt.transcript) useMeeting.getState().addTranscript({ speaker: 'board', seat, text: evt.transcript });
          break;
        case 'conversation.item.input_audio_transcription.completed':
          // only the chair transcribes the founder; use it to drive the whole board
          if (seat === CHAIR.seat && evt.transcript) {
            useMeeting.getState().addTranscript({ speaker: 'founder', text: evt.transcript });
            conduct(evt.transcript);
          }
          break;
        case 'error':
          setError(evt.error?.message ?? 'Realtime error');
          break;
      }
    },
    [conduct],
  );

  const cleanup = useCallback(() => {
    for (const a of agents.current) {
      a.dc.close();
      a.pc.close();
    }
    agents.current = [];
    if (sharedAudio.current) sharedAudio.current.srcObject = null;
    activeRef.current = null;
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    lastSpeaker.current = null;
    speaking.current = false;
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus('idle');
    setActiveSpeaker(null);
  }, [cleanup]);

  const connectAgent = useCallback(
    async (persona: Persona, stream: MediaStream | null): Promise<Agent> => {
      const res = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: persona.voice }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? 'Voice is not available right now.');
      }
      const session = await res.json();
      const secret = extractSecret(session);
      if (!secret) throw new Error('Realtime session did not return a usable token.');
      const model = (session.model as string) ?? 'gpt-realtime-2';

      const pc = new RTCPeerConnection();
      const agent: Agent = { persona, pc, dc: undefined as unknown as RTCDataChannel };
      pc.ontrack = (e) => {
        agent.stream = e.streams[0];
        if (activeRef.current === persona.seat) attachAudio(agent);
      };
      if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      else pc.addTransceiver('audio', { direction: 'recvonly' });

      const dc = pc.createDataChannel('oai-events');
      agent.dc = dc;
      dc.onopen = () => configureAgent(agent);
      dc.onmessage = (e) => {
        try {
          handleEvent(agent, JSON.parse(e.data));
        } catch {
          /* ignore non-JSON frames */
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/sdp' },
      });
      if (!sdpRes.ok) throw new Error('Could not establish the audio connection.');
      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
      return agent;
    },
    [configureAgent, handleEvent],
  );

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    // create + prime the shared audio element inside the click gesture so playback is unlocked
    if (!sharedAudio.current) {
      const el = new Audio();
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      try {
        el.style.display = 'none';
        document.body.appendChild(el);
      } catch {
        /* detached playback still works in most browsers */
      }
      sharedAudio.current = el;
    }
    sharedAudio.current.play().catch(() => {});

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.current = stream;
      } catch {
        stream = null;
      }

      const settled = await Promise.allSettled(personas.map((p) => connectAgent(p, stream)));
      const connected = settled.filter((r): r is PromiseFulfilledResult<Agent> => r.status === 'fulfilled').map((r) => r.value);
      if (connected.length === 0) {
        const firstError = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
        throw new Error(firstError?.reason?.message ?? 'Could not connect the board.');
      }
      agents.current = connected;
      setStatus('connected');

      // the chair opens; everyone else waits for the conductor
      const chair = agentFor(CHAIR.seat) ? CHAIR.seat : connected[0].persona.seat;
      setTimeout(() => {
        trigger(
          chair,
          `You are opening the board meeting. Greet the founder warmly in one short sentence and invite them to walk you through the quarter. Do not raise any issue and do not call any tool.`,
        );
        lastSpeaker.current = chair;
      }, 400);
    } catch (err) {
      cleanup();
      setError(err instanceof Error ? err.message : 'Could not connect.');
      setStatus('error');
    }
  }, [connectAgent, cleanup, trigger]);

  // push the current slide to every board member on founder navigation (no response forced)
  useEffect(() => {
    if (status !== 'connected') return;
    let prev = useMeeting.getState().currentSlideId;
    return useMeeting.subscribe((s) => {
      if (s.currentSlideId === prev) return;
      prev = s.currentSlideId;
      const slide = currentSlide(s);
      if (!slide) return;
      const content = slide.pageText ?? [slide.narrative, ...slide.bullets].filter(Boolean).join('. ');
      const item = {
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `[context, no reply needed: the founder is now on slide ${slide.index + 1}, "${slide.title}". On-screen: ${content}]` }] },
      };
      for (const a of agents.current) sendTo(a, item);
    });
  }, [status]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  // text fallback: route a typed founder turn to the most relevant board member
  const sendText = useCallback((text: string) => {
    if (agents.current.length === 0) return false;
    useMeeting.getState().addTranscript({ speaker: 'founder', text });
    const speaker = pickSpeaker(text, lastSpeaker.current);
    const agent = agentFor(speaker.seat);
    if (!agent) return false;
    sendTo(agent, { type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
    speaking.current = true;
    setActive(speaker.seat);
    sendTo(agent, { type: 'response.create' });
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, error, muted, activeSpeaker, boardSpeaking: activeSpeaker !== null, connect, disconnect, toggleMute, sendText };
}
