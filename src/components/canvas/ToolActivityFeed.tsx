'use client';

import { useState } from 'react';
import { useActivity } from '@/state/activity-store';

const kindStyle: Record<string, string> = { register: 'text-accepted', unregister: 'text-text-faint', invoke: 'text-brand' };
const kindGlyph: Record<string, string> = { register: '+', unregister: '−', invoke: '→' };

export function ToolActivityFeed() {
  const registered = useActivity((s) => s.registered);
  const entries = useActivity((s) => s.entries);
  const recent = entries.slice(0, 6);
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-border bg-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-3 py-2 ${open ? 'border-b border-border' : ''}`}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accepted opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accepted" />
          </span>
          <span className="text-xs font-semibold tracking-tight">Site tools</span>
          <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] font-medium text-text-faint">WebMCP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-text-muted">{registered.length} live</span>
          <span className="text-[10px] text-text-faint">{open ? 'Hide' : 'Show'}</span>
        </div>
      </button>

      {open && (
        <>
          <div className="px-3 py-2">
            <div className="min-h-[3rem] space-y-1">
              {recent.length === 0 ? (
                <p className="py-1.5 text-[11px] leading-relaxed text-text-faint">
                  Every edit to the canvas runs through a registered tool. Calls stream here as the AI (or you) act.
                </p>
              ) : (
                recent.map((e) => (
                  <div key={e.id} className="flex items-baseline gap-2 font-mono text-[11px]">
                    <span className={kindStyle[e.kind]}>{kindGlyph[e.kind]}</span>
                    <span className="text-text-muted">{e.tool}</span>
                    {e.detail && <span className="truncate text-text-faint">{e.detail}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="border-t border-border px-3 py-2">
            <p className="text-[11px] leading-relaxed text-text-faint">
              Open this page in ChatGPT&rsquo;s browser and pick <span className="text-text-muted">Site tools</span> — ChatGPT can draw on the same canvas.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
