'use client';

import type { MeetingPhase } from '@/state/types';
import { phaseLabel } from './display';

const flow: MeetingPhase[] = ['opening', 'operating-review', 'strategy', 'close'];

export function MeetingPhaseBar({ phase }: { phase: MeetingPhase }) {
  const activeIndex = flow.indexOf(phase);
  return (
    <div className="flex items-center gap-1.5">
      {flow.map((p, i) => {
        const active = p === phase;
        const done = activeIndex > i && activeIndex !== -1;
        return (
          <div key={p} className="flex items-center gap-1.5">
            <span
              className={`text-xs ${active ? 'font-semibold text-text' : done ? 'text-text-muted' : 'text-text-faint'}`}
            >
              {phaseLabel[p]}
            </span>
            {i < flow.length - 1 && <span className="text-text-faint">·</span>}
          </div>
        );
      })}
    </div>
  );
}
