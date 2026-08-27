'use client';

import type { BoardSeat } from '@/state/types';
import { seatLabel } from './display';

const seats: BoardSeat[] = ['lead-investor', 'operator', 'independent-chair'];

const focus: Record<BoardSeat, string> = {
  'lead-investor': 'Growth, capital efficiency, fundraising risk',
  operator: 'Product, execution, customer reality',
  'independent-chair': 'Decision quality, governance, unresolved commitments',
};

export function BoardSeats({ speakingSeat }: { speakingSeat: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {seats.map((seat) => {
        const active = speakingSeat === seat;
        return (
          <div
            key={seat}
            title={focus[seat]}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 transition ${
              active ? 'border-material bg-material-soft' : 'border-border bg-panel'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-material' : 'bg-text-faint'}`} />
            <span className={`text-xs font-medium ${active ? 'text-material' : 'text-text-muted'}`}>
              {seatLabel[seat]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
