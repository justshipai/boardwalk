'use client';

import { useCallback, useRef, useState } from 'react';
import { executeAction, toChatTools } from '@/actions/registry';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM = `You are a collaborative visual partner sharing a live infinite canvas with the user, like a Miro or tldraw board. You sketch and edit ONLY by calling the tools: add_shape (kind = rectangle, ellipse, diamond, note or text), connect_shapes, update_shape, delete_shape, auto_layout, set_title, get_canvas. Every call shows on the canvas instantly.

How to work:
- Just do it. When asked to sketch, map, diagram or plan something, add the shapes, connect them, then call auto_layout — without narrating your steps. Use short labels (2-4 words). Use notes for ideas, rectangles for components/steps, diamonds for decisions, text for headings.
- Only call get_canvas when you genuinely need to see what is already there (e.g. before editing an existing sketch). Do NOT say things like "let me take a look at the board" — just read it silently if needed.
- Use colour meaningfully: red for risks, green for done, amber for in-progress, blue for systems.
- Build on what the user has already drawn; you share the canvas.
- Keep every written reply to ONE short sentence, and never repeat yourself. The canvas is the output, not chat.`;

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
