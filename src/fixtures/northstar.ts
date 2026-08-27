import type { CompanyContext, Commitment, Slide } from '@/state/types';

export const northstarCompany: CompanyContext = {
  name: 'Northstar',
  stage: 'Series A B2B SaaS',
  currentPriority: 'Accelerate new-logo growth and expand the sales team',
  decisionNeeded: 'Approve a plan to add six account executives next quarter',
};

export const northstarSlides: Slide[] = [
  {
    id: 'slide-1',
    index: 0,
    title: 'Northstar — Q3 board update',
    narrative: 'Strong quarter. Growth is healthy and we are ready to invest behind it.',
    bullets: [
      'Series A B2B SaaS, 42 employees',
      'Quarter framed around growth and expansion',
      'Ask: approve six new account executives',
    ],
    metrics: [],
  },
  {
    id: 'slide-2',
    index: 1,
    title: 'Highlights',
    narrative: 'ARR grew 27% quarter over quarter, we landed marquee logos, and the pipeline is strong.',
    bullets: [
      'ARR $4.8M → $6.1M',
      'Six new enterprise logos',
      'Pipeline described as the strongest we have seen',
    ],
    metrics: [
      {
        id: 'arr',
        label: 'ARR',
        unit: '$M',
        current: 6.1,
        trend: 'up',
        history: [
          { period: 'Q1', value: 4.2 },
          { period: 'Q2', value: 4.8 },
          { period: 'Q3', value: 6.1 },
        ],
      },
    ],
  },
  {
    id: 'slide-3',
    index: 2,
    title: 'New logos',
    narrative: 'Six new enterprise logos this quarter, up from four last quarter.',
    bullets: ['4 → 6 new enterprise logos', 'Two are lighthouse accounts'],
    metrics: [
      {
        id: 'new-logos',
        label: 'New enterprise logos',
        unit: '',
        current: 6,
        trend: 'up',
        history: [
          { period: 'Q1', value: 3 },
          { period: 'Q2', value: 4 },
          { period: 'Q3', value: 6 },
        ],
      },
    ],
  },
  {
    id: 'slide-4',
    index: 3,
    title: 'Retention',
    narrative: 'Retention softened slightly this quarter, but we believe it is mostly seasonal.',
    bullets: ['Net revenue retention 99%', 'Framed as a seasonal dip'],
    metrics: [
      {
        id: 'nrr',
        label: 'Net revenue retention',
        unit: '%',
        current: 99,
        trend: 'down',
        caveat:
          'NRR fell from 108% to 99% over three quarters — a sustained decline, not a one-quarter dip. Below 100% means the existing base is shrinking net of expansion.',
        history: [
          { period: 'Q1', value: 108 },
          { period: 'Q2', value: 104 },
          { period: 'Q3', value: 99 },
        ],
      },
    ],
    subtext:
      'The seasonal framing is unsupported: the decline is monotonic across three quarters and crosses below 100%.',
  },
  {
    id: 'slide-5',
    index: 4,
    title: 'Growth channels',
    narrative: 'We are acquiring efficiently and the engine is working.',
    bullets: ['New ARR heavily weighted to paid acquisition', 'Blended CAC rising'],
    metrics: [
      {
        id: 'paid-share',
        label: 'Share of new ARR from paid',
        unit: '%',
        current: 71,
        trend: 'up',
        caveat: 'Growth is disproportionately bought: 71% of new ARR now comes from paid, up from 38%.',
        history: [
          { period: 'Q1', value: 38 },
          { period: 'Q2', value: 55 },
          { period: 'Q3', value: 71 },
        ],
      },
      {
        id: 'cac-payback',
        label: 'CAC payback',
        unit: 'months',
        current: 19,
        trend: 'up',
        caveat: 'Payback lengthened from 11 to 19 months as paid mix rose.',
        history: [
          { period: 'Q1', value: 11 },
          { period: 'Q2', value: 15 },
          { period: 'Q3', value: 19 },
        ],
      },
    ],
    subtext: 'Headline growth is real but increasingly purchased, and the unit economics are deteriorating.',
  },
  {
    id: 'slide-6',
    index: 5,
    title: 'Sales efficiency',
    narrative: 'The sales team is productive and ready to scale.',
    bullets: ['Adding capacity to capture pipeline'],
    metrics: [
      {
        id: 'magic-number',
        label: 'Magic number',
        unit: '',
        current: 0.6,
        trend: 'down',
        caveat: 'Sales efficiency fell from 1.1 to 0.6 — below 0.75, adding reps destroys capital rather than compounding it.',
        history: [
          { period: 'Q1', value: 1.1 },
          { period: 'Q2', value: 0.8 },
          { period: 'Q3', value: 0.6 },
        ],
      },
    ],
    subtext: 'Efficiency has halved; the case for more reps rests on a deteriorating denominator.',
  },
  {
    id: 'slide-7',
    index: 6,
    title: 'Product roadmap',
    narrative: 'Next two quarters focus on new logos: onboarding, integrations, and a self-serve tier.',
    bullets: [
      'Guided onboarding revamp',
      'Two new integrations',
      'Self-serve trial funnel',
      'No dedicated retention or expansion workstream',
    ],
    metrics: [],
    subtext:
      'The roadmap contains no material retention initiative, despite retention being the quarter’s clearest problem and the subject of a prior commitment.',
  },
  {
    id: 'slide-8',
    index: 7,
    title: 'The ask',
    narrative: 'Approve six new account executives to press our advantage while the pipeline is strong.',
    bullets: [
      'Hire 6 AEs next quarter',
      '~$1.4M incremental annual cost',
      'Expected to accelerate new-logo ARR',
    ],
    metrics: [],
    subtext:
      'The expansion request directly contradicts the prior commitment to stabilise retention before further sales expansion.',
  },
];

export const northstarPreviousCommitments: Commitment[] = [
  {
    id: 'prev-1',
    owner: 'CEO',
    action: 'Stabilise net revenue retention above 105% before further sales expansion',
    dueDate: 'End of last quarter',
    source: 'previous',
    status: 'open',
  },
  {
    id: 'prev-2',
    owner: 'VP Product',
    action: 'Ship a customer health-scoring capability to reduce churn risk',
    dueDate: 'End of last quarter',
    source: 'previous',
    status: 'open',
  },
];
