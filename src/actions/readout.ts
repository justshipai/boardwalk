import type { BoardReadout, Meeting } from '@/state/types';

export function buildReadout(m: Meeting): BoardReadout {
  const questions = m.interventions.filter((i) => i.kind === 'question');
  const flags = m.interventions.filter((i) => i.kind === 'flag');
  const openDecisions = m.decisions.filter((d) => d.status === 'open' || d.status === 'parked');
  const accepted = m.commitments.filter((c) => c.status === 'accepted');
  const openPrev = m.commitments.filter((c) => c.source === 'previous' && c.status === 'open');

  return {
    likelyQuestions: questions.slice(0, 5).map((q) => q.statement),
    weakestAssumptions: flags.slice(0, 3).map((f) => f.statement),
    contradictions: [
      ...flags.filter((f) => f.severity === 'critical').map((f) => f.whyItMatters),
      ...openPrev.map((c) => `Unresolved prior commitment: ${c.action}`),
    ].slice(0, 4),
    decisionsRequired: openDecisions.map((d) => d.question),
    acceptedCommitments: accepted.map((c) => `${c.owner}: ${c.action} (${c.dueDate})`),
    openingRecommendation:
      'Open by naming the retention decline before the board does, separate structural churn from seasonality with evidence, and bring a concrete retention plan alongside — not instead of — any hiring ask.',
  };
}
