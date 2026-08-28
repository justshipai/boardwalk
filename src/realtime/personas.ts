import type { BoardSeat } from '@/state/types';

export interface Persona {
  seat: BoardSeat;
  name: string;
  role: string;
  voice: string;
  blurb: string;
  // topics this seat owns — used by the conductor to pick who speaks
  keywords: string[];
}

// three default board members, each with a distinct voice and remit
export const personas: Persona[] = [
  {
    seat: 'lead-investor',
    name: 'Dana Ruiz',
    role: 'Lead investor',
    voice: 'marin',
    blurb: 'Growth, capital efficiency, fundraising risk and returns.',
    keywords: ['cac', 'payback', 'arr', 'mrr', 'growth', 'revenue', 'burn', 'runway', 'raise', 'fundrais', 'capital', 'margin', 'unit econ', 'ltv', 'spend', 'efficiency', 'valuation', 'magic number', 'nrr', 'retention rate', 'gross'],
  },
  {
    seat: 'operator',
    name: 'Marcus Feld',
    role: 'Operator',
    voice: 'cedar',
    blurb: 'Product, execution, org and customer reality.',
    keywords: ['product', 'activation', 'onboarding', 'funnel', 'churn', 'retention', 'customer', 'roadmap', 'hiring', 'hire', 'team', 'execution', 'sales cycle', 'pipeline', 'ship', 'feature', 'engineering', 'support', 'channel'],
  },
  {
    seat: 'independent-chair',
    name: 'Priya Shah',
    role: 'Independent chair',
    voice: 'sage',
    blurb: 'Decision quality, governance and unresolved commitments.',
    keywords: ['decision', 'approve', 'commit', 'commitment', 'governance', 'risk', 'contingency', 'board', 'vote', 'condition', 'compliance', 'covenant', 'warehouse', 'liquidity', 'runway'],
  },
];

export const CHAIR: Persona = personas.find((p) => p.seat === 'independent-chair')!;

export const personaBySeat = new Map(personas.map((p) => [p.seat, p]));

// if the founder addressed a specific board member by first name or role, return them
export function addressedPersona(text: string): Persona | null {
  const lower = text.toLowerCase();
  return (
    personas.find((p) => {
      const first = p.name.split(' ')[0].toLowerCase();
      return new RegExp(`\\b${first}\\b`).test(lower) || lower.includes(p.role.toLowerCase());
    }) ?? null
  );
}

// pick the board member whose remit best fits what the founder just said; avoid repeating the
// same speaker back-to-back unless they clearly own the topic
export function pickSpeaker(text: string, lastSeat: BoardSeat | null): Persona {
  const addressed = addressedPersona(text);
  if (addressed) return addressed;
  const lower = text.toLowerCase();
  const scored = personas.map((p) => ({ p, score: p.keywords.reduce((n, k) => (lower.includes(k) ? n + 1 : n), 0) }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (top.score === 0) {
    // nothing specific — rotate to someone other than the last speaker, default the chair
    const alt = personas.find((p) => p.seat !== lastSeat && p.seat === 'independent-chair') ?? personas.find((p) => p.seat !== lastSeat);
    return alt ?? CHAIR;
  }
  // if the top scorer just spoke and a different seat is nearly as relevant, hand off for variety
  if (top.p.seat === lastSeat) {
    const other = scored.find((s) => s.p.seat !== lastSeat && s.score >= top.score - 1 && s.score > 0);
    if (other) return other.p;
  }
  return top.p;
}
