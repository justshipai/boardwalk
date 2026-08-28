'use client';

import { useCallback, useRef, useState } from 'react';
import { executeAction, toChatTools } from '@/actions/registry';
import { useCanvas } from '@/canvas/canvas-store';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM = `You are a collaborative diagramming partner sharing a live canvas with the user. You build and edit the canvas ONLY by calling the provided tools (add_node, connect_nodes, update_node, auto_layout, delete_node, set_title, get_canvas). Every tool call is shown to the user instantly.

Guidelines:
- When asked to design, map or diagram something, add the nodes, connect them into a flow, then call auto_layout to tidy it. Use short labels (2-4 words).
- Before changing an existing diagram, call get_canvas first, and refer to nodes by their label.
- Use colour meaningfully: red for risks/problems, green for done/approved, amber for in-progress, blue for systems. Keep it clean and readable.
- You and the user edit the SAME canvas together — build on what they have already added.
- Keep written replies to ONE short sentence. The diagram is the output, not a wall of text.`;

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
        useCanvas.getState().setPresence({ actor: 'ai', x: 0, y: 0, label: 'AI' });
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
      useCanvas.getState().setPresence({ actor: null, x: 0, y: 0 });
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return { messages, busy, error, send };
}
