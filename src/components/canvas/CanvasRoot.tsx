'use client';

import { useEffect, useRef, useState } from 'react';
import { startWebMcpSync } from '@/actions/webmcp';
import { useAgent } from '@/agent/useAgent';
import { clearCanvas } from '@/canvas/editor';
import { useCanvasMeta } from '@/canvas/stores';
import { useVoice } from '@/realtime/useVoice';
import { CanvasBoard } from './CanvasBoard';
import { ToolActivityFeed } from './ToolActivityFeed';

const STARTERS = [
  {
    label: 'Run a launch war room',
    prompt: 'Turn a messy product-launch brainstorm into a decision-ready launch map: objectives, audiences, key moments, risks, owners, and open decisions.',
    featured: true,
  },
  {
    label: 'Untangle a customer journey',
    prompt: 'Map a customer journey for a new subscription app, including the moments that build trust, create friction, and need an experiment.',
  },
  {
    label: 'Shape a team offsite',
    prompt: 'Help me turn an offsite brainstorm into a clear agenda with themes, activities, decisions, and owners.',
  },
];

const COLLABORATOR_PROMPT =
  'Join me on this Boardwalk canvas. Use the site tools to read the current map, then add and connect ideas with me as we talk. Keep the work spatial and visible. Start by helping me run a launch war room.';

export function CanvasRoot() {
  const started = useRef(false);
  const agent = useAgent();
  const voice = useVoice();
  const title = useCanvasMeta((s) => s.title);
  const setTitle = useCanvasMeta((s) => s.setTitle);
  const clear = () => {
    clearCanvas();
    setTitle('Untitled canvas');
  };
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

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

  const copyCollaboratorPrompt = async () => {
    try {
      await navigator.clipboard.writeText(COLLABORATOR_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="text-sm font-semibold tracking-tight">Boardwalk</span>
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

          {voice.status === 'connected' ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-accepted">
                <span className={`h-2 w-2 rounded-full ${voice.speaking ? 'bg-material' : 'bg-accepted'} ${voice.speaking ? 'animate-ping' : ''}`} />
                {voice.speaking ? 'Boardwalk is speaking' : 'Listening'}
              </span>
              <button type="button" onClick={voice.toggleMute} className="rounded-md border border-border-strong px-2.5 py-1 text-xs text-text-muted transition hover:text-text">
                {voice.muted ? 'Unmute' : 'Mute'}
              </button>
              <button type="button" onClick={voice.disconnect} className="rounded-md border border-border-strong px-2.5 py-1 text-xs text-text-muted transition hover:text-critical">
                End voice
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={voice.connect}
              disabled={voice.status === 'connecting'}
              className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-medium text-text-muted transition hover:text-text disabled:opacity-50"
              title={voice.error ?? 'Talk to the AI and draw by voice'}
            >
              {voice.status === 'connecting' ? 'Connecting…' : '🎙 Talk'}
            </button>
          )}

          <button type="button" onClick={clear} className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted transition hover:text-text">
            New canvas
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <CanvasBoard />
        </div>

        <aside className="flex w-[360px] shrink-0 flex-col border-l border-border">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-tight">Think out loud</h2>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">shared canvas</span>
            </div>
            <p className="mt-0.5 text-xs text-text-faint">An agent can shape the same canvas with you, in real time.</p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
            {agent.messages.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-brand/30 bg-brand-soft p-3">
                  <p className="text-xs font-semibold text-text">Start a working session</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    Add a fragment, ask for structure, then keep changing the map together. The canvas—not the chat—is the shared answer.
                  </p>
                </div>
                {STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => submit(starter.prompt)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition hover:border-border-strong ${
                      starter.featured ? 'border-brand/40 bg-panel-2' : 'border-border bg-panel'
                    }`}
                  >
                    <span className="block text-sm font-medium text-text">{starter.label}</span>
                    {starter.featured && <span className="mt-0.5 block text-xs text-text-faint">A complete demo-ready collaboration</span>}
                  </button>
                ))}
                <p className="px-1 text-[11px] leading-relaxed text-text-faint">
                  In ChatGPT&rsquo;s browser, ask ChatGPT to use this page&rsquo;s Site tools. It can collaborate on the canvas you&rsquo;re both watching.
                </p>
                <button
                  type="button"
                  onClick={copyCollaboratorPrompt}
                  className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-left text-xs font-medium text-text-muted transition hover:border-border-strong hover:text-text"
                >
                  {copied ? 'Copied — paste this into ChatGPT' : 'Copy a prompt for your ChatGPT collaborator'}
                </button>
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
                placeholder="Add a thought, ask for structure, or change the map…"
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
