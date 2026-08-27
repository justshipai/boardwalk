'use client';

import { personas } from '@/realtime/personas';

export function BoardSeats({ speakingSeat }: { speakingSeat: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {personas.map((p) => {
        const active = speakingSeat === p.seat;
        return (
          <div
            key={p.seat}
            title={p.blurb}
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition ${
              active ? 'border-material bg-material-soft' : 'border-border bg-panel'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-material' : 'bg-text-faint'}`} />
            <div className="leading-tight">
              <div className={`text-xs font-medium ${active ? 'text-material' : 'text-text'}`}>{p.name}</div>
              <div className="text-[10px] text-text-faint">{p.role}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
