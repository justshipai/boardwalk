import type { BoardSeat, InterventionKind, Severity } from '@/state/types';

export const seatLabel: Record<BoardSeat, string> = {
  'lead-investor': 'Lead investor',
  operator: 'Operator',
  'independent-chair': 'Independent chair',
};

export const seatShort: Record<BoardSeat, string> = {
  'lead-investor': 'LI',
  operator: 'OP',
  'independent-chair': 'IC',
};

export const severityStyle: Record<Severity, { text: string; dot: string; chip: string }> = {
  watch: { text: 'text-watch', dot: 'bg-watch', chip: 'bg-watch-soft text-watch' },
  material: { text: 'text-material', dot: 'bg-material', chip: 'bg-material-soft text-material' },
  critical: { text: 'text-critical', dot: 'bg-critical', chip: 'bg-critical-soft text-critical' },
};

export const kindLabel: Record<InterventionKind, string> = {
  question: 'Question',
  flag: 'Flag',
  drilldown: 'Drill-down',
  commitment: 'Commitment',
  decision: 'Decision',
};

export const phaseLabel: Record<string, string> = {
  prepare: 'Prepare',
  opening: 'Opening',
  'operating-review': 'Operating review',
  strategy: 'Strategy',
  close: 'Close',
  readout: 'Readout',
};
