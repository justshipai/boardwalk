'use client';

import { useCallback, useRef, useState } from 'react';
import { executeAction, toChatTools } from '@/actions/registry';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM = `You are a visual thinking partner on a shared, infinite Miro-style canvas. You sketch by calling tools: add_shape (kind = rectangle, ellipse, diamond, note, text; optional x,y to place it), connect_shapes, update_shape, delete_shape, auto_layout, set_title, get_canvas. Every call shows instantly.

CHOOSE THE RIGHT FORM — do not default to a top-down flowchart. Match the shape of the thinking:
- A process or sequence → boxes connected by arrows; add them, connect, then auto_layout.
- A mind map → a central idea in the middle (around x:650,y:400) with branches placed AROUND it using x,y (up, down, left, right). Arrows optional.
- A wireframe / screen layout → position rectangles spatially with x,y: header across the top, sidebar on the left, content in the middle, etc. Usually NO arrows.
- Brainstorm / ideas / a list → sticky notes (kind:note) clustered or stacked with x,y. Rarely any arrows.
- A comparison → two columns of shapes side by side.
The canvas is roughly 1400 wide and 900 tall; place things deliberately and leave breathing room.

RULES:
- Use arrows ONLY when a real relationship, flow or dependency matters. Most sketches need few or none. Never connect everything by reflex.
- Only call auto_layout for arrow-based flow diagrams. For mind maps, wireframes and layouts you position shapes yourself with x,y — do NOT auto_layout those.
- Reuse existing shapes by their label; never create a duplicate of something already on the canvas.
- Just do it — never narrate ("let me look at the board"). Call get_canvas silently only if you must. Use short labels (2-4 words). Colour meaningfully (red risk, green done, amber wip, blue system).
- Build on what the user has drawn. Reply in ONE short sentence, and never repeat yourself. The canvas is the output.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawMessage = Record<string, any>;

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const convo = useRef<RawMessage[]>([{ role: 'system', content: SYSTEM }]);
  const busyRef = useRef(false);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: trimmed }]);
    convo.current.push({ role: 'user', content: trimmed });

    try {
      for (let i = 0; i < 8; i++) {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: convo.current, tools: toChatTools() }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'The AI request failed.');
        }
        const { message } = await res.json();
        if (!message) break;
        convo.current.push(message);

        if (message.tool_calls?.length) {
          for (const tc of message.tool_calls) {
            let args: Record<string, unknown> = {};
            try {
              args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
            } catch {
              args = {};
            }
            const outcome = executeAction(tc.function?.name, args);
            convo.current.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ summary: outcome.summary, ...(outcome.data ?? {}) }),
            });
          }
          continue; // let the model react to the results
        }

        if (message.content) setMessages((m) => [...m, { role: 'assistant', content: message.content }]);
        break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return { messages, busy, error, send };
}
