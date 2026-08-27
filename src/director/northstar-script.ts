// Deterministic board responses for the Northstar demo. Each step is spoken (transcript) and/or
// invokes a registered action through the same executeAction path the Realtime voice will use.
// This guarantees both signature wow moments (§7) without depending on live model behaviour.

import type { BoardSeat } from '@/state/types';

export interface ScriptStep {
  say?: string;
  seat?: BoardSeat;
  tool?: string;
  args?: Record<string, unknown>;
  pauseMs?: number;
}

export const northstarScript: Record<string, ScriptStep[]> = {
  // Wow moment one — interrupt the seasonal framing, focus NRR, flag, pin a question
  'slide-4': [
    {
      seat: 'lead-investor',
      say: 'Hold on. Before we move past retention — I want to look at that number properly.',
      tool: 'focus_evidence',
      args: { slideId: 'slide-4', metricId: 'nrr' },
      pauseMs: 600,
    },
    {
      seat: 'lead-investor',
      say: 'Net revenue retention has gone 108, 104, 99 across three quarters. That is not a seasonal dip — it is a trend, and it has crossed below 100.',
      tool: 'flag_assumption',
      args: {
        statement: '“The retention decline is mostly seasonal.”',
        whyItMatters:
          'The decline is monotonic across three quarters and now sits below 100%, so the existing base is shrinking net of expansion. Calling it seasonal removes the pressure to fix it.',
        seat: 'lead-investor',
        severity: 'critical',
        slideId: 'slide-4',
        metricId: 'nrr',
      },
      pauseMs: 700,
    },
    {
      seat: 'lead-investor',
      say: 'And I am striking the seasonal framing until you can support it.',
      tool: 'annotate_evidence',
      args: { kind: 'strike', claimId: 'slide-4-b1', label: 'Not seasonal', severity: 'critical' },
      pauseMs: 500,
    },
    {
      seat: 'independent-chair',
      say: 'What evidence separates seasonality from structural churn? Cohort curves, logo vs dollar churn, anything.',
      tool: 'raise_board_question',
      args: {
        statement: 'What evidence distinguishes seasonal softness from structural churn in the retention decline?',
        whyItMatters:
          'If it is structural, spending more on new logos while the base leaks is value-destructive. The board cannot weigh the hiring ask without this.',
        seat: 'independent-chair',
        severity: 'material',
        slideId: 'slide-4',
        metricId: 'nrr',
      },
    },
  ],

  // Growth channels — drill into the paid mix
  'slide-5': [
    {
      seat: 'operator',
      say: 'Seventy-one percent of new ARR from paid, up from thirty-eight. I want the split behind that.',
      tool: 'request_metric_drilldown',
      args: {
        metricId: 'paid-share',
        statement: 'Break new ARR into paid vs organic by quarter, and show CAC payback alongside it.',
        whyItMatters: 'Growth that is increasingly bought at a 19-month payback is a different business than the headline suggests.',
        seat: 'operator',
      },
    },
  ],

  // Sales efficiency — flag the deteriorating denominator behind the hiring case
  'slide-6': [
    {
      seat: 'lead-investor',
      say: 'The magic number has halved to 0.6. Below 0.75, every rep you add burns capital rather than compounding it.',
      tool: 'flag_assumption',
      args: {
        statement: '“The sales team is productive and ready to scale.”',
        whyItMatters: 'Sales efficiency fell from 1.1 to 0.6. The hiring case rests on a denominator that is getting worse, not better.',
        seat: 'lead-investor',
        severity: 'material',
        slideId: 'slide-6',
        metricId: 'magic-number',
      },
    },
  ],

  // Wow moment two — resurface the prior commitment, expose the roadmap gap, force a decision
  'slide-7': [
    {
      seat: 'independent-chair',
      say: 'Last meeting we committed to stabilising retention above 105% before any further sales expansion. I do not see it on this roadmap.',
      tool: 'focus_evidence',
      args: { slideId: 'slide-7' },
      pauseMs: 500,
    },
    {
      seat: 'independent-chair',
      say: 'There is no material retention or expansion workstream here at all.',
      tool: 'flag_assumption',
      args: {
        statement: 'The roadmap contains no retention or expansion initiative.',
        whyItMatters:
          'Retention is the quarter’s clearest problem and the subject of an open prior commitment, yet the roadmap invests entirely in new-logo acquisition.',
        seat: 'independent-chair',
        severity: 'critical',
        slideId: 'slide-7',
        claimId: 'slide-7-b3',
      },
      pauseMs: 700,
    },
    {
      seat: 'independent-chair',
      say: 'So the board needs a decision: do we delay the sales hiring, or do we explicitly reverse last quarter’s retention commitment? One or the other.',
      tool: 'record_decision',
      args: {
        question: 'Delay the sales hiring until retention stabilises, or explicitly reverse the prior retention commitment?',
        options: ['Delay sales hiring until NRR ≥ 105%', 'Reverse the prior retention commitment', 'Fund a retention workstream in parallel'],
      },
    },
  ],

  // The ask — propose the concrete follow-up for founder approval
  'slide-8': [
    {
      seat: 'lead-investor',
      say: 'If you want the headcount, bring a retention plan with an owner and a threshold to the next meeting. I’ll propose that as a commitment.',
      tool: 'propose_commitment',
      args: {
        action: 'Bring a retention plan with a named owner and an NRR threshold before sales headcount is approved',
        owner: 'CEO',
        dueDate: 'Next board meeting',
      },
    },
  ],
};

export const scriptedSlideIds = new Set(Object.keys(northstarScript));
