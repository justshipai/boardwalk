'use client';

import { useState } from 'react';
import { useActivity } from '@/state/activity-store';

const kindStyle: Record<string, string> = {
  register: 'text-accepted',
  unregister: 'text-text-faint',
  invoke: 'text-brand',
};

const kindGlyph: Record<string, string> = {
  register: '+',
  unregister: '−',
  invoke: '→',
};

export function ToolActivityFeed() {
  const registered = useActivity((s) => s.registered);
  const entries = useActivity((s) => s.entries);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accepted" />
          <span className="text-xs font-medium text-text-muted">Site tools</span>
          <span className="rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-text-muted">
            {registered.length} live
          </span>
        </div>
        <span className="text-xs text-text-faint">{open ? 'Hide' : 'Activity'}</span>
      </button>

      {open && (
        <div className="border-t border-border px-3 py-2">
          <div className="mb-2 flex flex-wrap gap-1">
            {registered.map((t) => (
              <span key={t} className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                {t}
              </span>
            ))}
          </div>
          <div className="max-h-40 space-y-1 overflow-auto">
            {entries.length === 0 ? (
              <p className="text-[11px] text-text-faint">Tool registrations and calls stream here.</p>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="flex items-baseline gap-2 font-mono text-[11px]">
                  <span className={kindStyle[e.kind]}>{kindGlyph[e.kind]}</span>
                  <span className="text-text-muted">{e.tool}</span>
                  {e.detail && <span className="truncate text-text-faint">{e.detail}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
