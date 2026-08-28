'use client';

import { useEffect, useRef, useState } from 'react';
import { startWebMcpSync } from '@/actions/webmcp';
import { useAgent } from '@/agent/useAgent';
import { useCanvas } from '@/canvas/canvas-store';
import { CanvasBoard } from './CanvasBoard';
import { ToolActivityFeed } from './ToolActivityFeed';

const EXAMPLES = [
  'Design the architecture for a food-delivery app',
  'Map a user onboarding flow',
  'Diagram how OAuth login works',
];

export function CanvasRoot() {
  const started = useRef(false);
  const agent = useAgent();
  const nodes = useCanvas((s) => s.nodes);
  const title = useCanvas((s) => s.title);
  const clear = useCanvas((s) => s.clear);
  const setTitle = useCanvas((s) => s.setTitle);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const stop = startWebMcpSync();
    return () => {
      stop();
      started.current = false;
    };
  }, []);

  const submit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput('');
    agent.send(value);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="text-sm font-semibold tracking-tight">Weave</span>
          </div>
          <span className="text-border-strong">/</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-56 rounded bg-transparent px-1 py-0.5 text-sm text-text-muted outline-none hover:bg-panel focus:bg-panel focus:text-text"
          />
        </div>
        <div className="flex items-center gap-3">
          {agent.busy && (
            <span className="flex items-center gap-1.5 text-xs text-brand">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand" /> AI is drawing…
            </span>
          )}
          <button type="button" onClick={clear} className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted transition hover:text-text">
            New canvas
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <CanvasBoard />
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="max-w-xs text-center text-sm text-text-faint">
                Blank canvas. Ask the AI to sketch something, drag boxes yourself, or drive it from ChatGPT.
              </p>
            </div>
          )}
        </div>

        <aside className="flex w-[360px] shrink-0 flex-col border-l border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Ask the AI</h2>
            <p className="mt-0.5 text-xs text-text-faint">It draws on the canvas with you, in real time.</p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
            {agent.messages.length === 0 ? (
              <div className="space-y-2">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => submit(e)}
                    className="w-full rounded-lg border border-border bg-panel px-3 py-2.5 text-left text-sm text-text-muted transition hover:border-border-strong hover:text-text"
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : (
              agent.messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <span
                    className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === 'user' ? 'bg-brand-soft text-text' : 'bg-panel text-text-muted'
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              ))
            )}
            {agent.error && <p className="text-xs text-critical">{agent.error}</p>}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !agent.busy && submit()}
                placeholder="Ask the AI to draw or change something…"
                className="flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-border-strong"
              />
              <button
                type="button"
                onClick={() => submit()}
                disabled={agent.busy}
                className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-stage-ink transition hover:brightness-110 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>

          <div className="border-t border-border p-3">
            <ToolActivityFeed />
          </div>
        </aside>
      </div>
    </div>
  );
}
