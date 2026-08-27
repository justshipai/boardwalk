import type { CompanyContext, Slide } from '@/state/types';

export interface PendingDeck {
  company: CompanyContext;
  slides: Slide[];
}

// module-scoped handoff: the landing page parses a PDF, stashes the deck here, then routes to
// /meeting, which consumes it once. Kept in memory (not storage) because rendered page images
// are large and never need to leave the browser (§12 privacy).
let pending: PendingDeck | null = null;

export function setPendingDeck(deck: PendingDeck) {
  pending = deck;
}

export function consumePendingDeck(): PendingDeck | null {
  const deck = pending;
  pending = null;
  return deck;
}
