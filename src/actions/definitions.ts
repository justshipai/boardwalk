import { currentSlide, findMetric, useMeeting } from '@/state/meeting-store';
import type { BoardSeat, InterventionKind, Meeting, Severity } from '@/state/types';
import { buildReadout } from './readout';
import type { BoardAction } from './types';

const SEATS: BoardSeat[] = ['lead-investor', 'operator', 'independent-chair'];
const SEVERITIES: Severity[] = ['watch', 'material', 'critical'];

const seatEnum = { type: 'string', enum: SEATS };
const severityEnum = { type: 'string', enum: SEVERITIES };

const notInReadout = (phase: string) => phase !== 'readout';
const empty = { type: 'object' as const, properties: {}, additionalProperties: false };

function slideText(s: Meeting['slides'][number]): string {
  return s.pageText ?? [s.narrative, ...s.bullets].filter(Boolean).join('. ');
}

function reviewState(m: Meeting) {
  return {
    concerns: m.interventions.map((i) => ({
      id: i.id,
      kind: i.kind,
      statement: i.statement,
      severity: i.severity,
      status: i.status,
      slideId: i.slideId,
    })),
    decisions: m.decisions.map((d) => ({ id: d.id, question: d.question, options: d.options, chosen: d.chosen, status: d.status })),
    commitments: m.commitments.map((c) => ({ id: c.id, owner: c.owner, action: c.action, dueDate: c.dueDate, source: c.source, status: c.status })),
  };
}

export const boardActions: BoardAction[] = [
  // ---- Read tools (readOnlyHint) ----
  {
    name: 'get_meeting_context',
    description: 'Read the company, board seats, intensity, phase, and the live review so far (concerns, decisions, commitments).',
    inputSchema: empty,
    annotations: { title: 'Get meeting context', readOnlyHint: true },
    isAvailable: () => true,
    handler: (_args, m) => ({
      summary: `${m.company.name || 'No deck'} — phase ${m.phase}; ${m.interventions.length} concern(s), ${m.decisions.length} decision(s).`,
      data: {
        company: m.company,
        phase: m.phase,
        intensity: m.intensity,
        deckLoaded: m.deckLoaded,
        meetingStarted: m.meetingStarted,
        slideCount: m.slides.length,
        boardSeats: SEATS,
        review: reviewState(m),
      },
    }),
  },
  {
    name: 'get_deck',
    description: "Read the whole deck at once: every slide's id, title, text and metrics. Use this to review the deck holistically.",
    inputSchema: empty,
    annotations: { title: 'Get deck', readOnlyHint: true },
    isAvailable: (m) => m.deckLoaded,
    handler: (_args, m) => ({
      summary: `${m.slides.length} slide(s) in ${m.company.name || 'the deck'}.`,
      data: {
        company: m.company,
        slides: m.slides.map((s) => ({
          id: s.id,
          index: s.index,
          title: s.title,
          text: slideText(s),
          metrics: s.metrics.map((x) => ({ id: x.id, label: x.label, current: x.current, unit: x.unit, trend: x.trend })),
        })),
      },
    }),
  },
  {
    name: 'get_current_slide',
    description: 'Read the active slide: its title, narrative, bullets, extracted text and any metrics it exposes.',
    inputSchema: empty,
    annotations: { title: 'Get current slide', readOnlyHint: true },
    isAvailable: (m) => m.deckLoaded,
    handler: (_args, m) => {
      const slide = currentSlide(m);
      if (!slide) return { summary: 'No slide is active.', data: { slide: null } };
      return {
        summary: `Slide ${slide.index + 1}: ${slide.title}`,
        data: {
          id: slide.id,
          index: slide.index,
          title: slide.title,
          text: slideText(slide),
          bullets: slide.bullets,
          metrics: slide.metrics.map((x) => ({ id: x.id, label: x.label, current: x.current, unit: x.unit, trend: x.trend })),
        },
      };
    },
  },
  {
    name: 'get_metric_detail',
    description: "Read one metric's full period history and caveat, so a challenge can tell the headline from the trend.",
    inputSchema: {
      type: 'object',
      properties: { metricId: { type: 'string', description: 'The metric id, e.g. "nrr" or "arr".' } },
      required: ['metricId'],
      additionalProperties: false,
    },
    annotations: { title: 'Get metric detail', readOnlyHint: true },
    isAvailable: (m) => m.deckLoaded,
    handler: (args: { metricId: string }, m) => {
      const found = findMetric(m, args.metricId);
      if (!found) return { summary: `No metric "${args.metricId}".`, data: { metric: null } };
      const { metric, slide } = found;
      return {
        summary: `${metric.label}: ${metric.current}${metric.unit} (${metric.trend}) on slide ${slide.index + 1}.`,
        data: { ...metric, sourceSlideId: slide.id, sourceSlideTitle: slide.title },
      };
    },
  },
  {
    name: 'get_previous_commitments',
    description: 'Read commitments carried over from the last board meeting, with owner, action, due date and status.',
    inputSchema: empty,
    annotations: { title: 'Get previous commitments', readOnlyHint: true },
    isAvailable: (m) => m.deckLoaded,
    handler: (_args, m) => {
      const previous = m.commitments.filter((c) => c.source === 'previous');
      return { summary: `${previous.length} prior commitment(s).`, data: { commitments: previous } };
    },
  },

  // ---- Interaction tools (visible effect) ----
  {
    name: 'focus_evidence',
    description: 'Navigate the shared boardroom to a slide and optionally highlight a metric on it, so the founder sees it.',
    inputSchema: {
      type: 'object',
      properties: {
        slideId: { type: 'string', description: 'Slide to navigate to.' },
        metricId: { type: 'string', description: 'Optional metric on that slide to highlight.' },
      },
      required: ['slideId'],
      additionalProperties: false,
    },
    annotations: { title: 'Focus evidence', effect: 'Navigates the deck and highlights the evidence.' },
    isAvailable: (m) => m.deckLoaded,
    handler: (args: { slideId: string; metricId?: string }) => {
      const store = useMeeting.getState();
      store.goToSlide(args.slideId);
      if (args.metricId) store.focusMetric(args.metricId);
      const slide = currentSlide(useMeeting.getState());
      return {
        summary: `Focused slide ${slide ? slide.index + 1 : '?'}${args.metricId ? `, metric ${args.metricId}` : ''}.`,
        data: { currentSlideId: args.slideId, focusedMetricId: args.metricId ?? null },
      };
    },
  },
  {
    name: 'raise_board_question',
    description: 'Add a material board question to the meeting, grounded in a slide or metric. Appears as a concern.',
    inputSchema: {
      type: 'object',
      properties: {
        statement: { type: 'string', description: 'The question, as a board would ask it.' },
        whyItMatters: { type: 'string', description: 'Why this could change a decision or confidence level.' },
        seat: seatEnum,
        severity: severityEnum,
        slideId: { type: 'string' },
        metricId: { type: 'string' },
      },
      required: ['statement', 'whyItMatters'],
      additionalProperties: false,
    },
    annotations: { title: 'Raise board question', effect: 'Adds a question to the board review.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase),
    handler: (args: { statement: string; whyItMatters: string; seat?: BoardSeat; severity?: Severity; slideId?: string; metricId?: string }) =>
      addInterventionResult('question', args),
  },
  {
    name: 'flag_assumption',
    description: 'Flag a claim as unsupported, contradicted or uncertain. It appears as a concern on the board review.',
    inputSchema: {
      type: 'object',
      properties: {
        statement: { type: 'string', description: 'The claim being flagged and what is wrong with it.' },
        whyItMatters: { type: 'string' },
        seat: seatEnum,
        severity: severityEnum,
        slideId: { type: 'string' },
        metricId: { type: 'string' },
      },
      required: ['statement', 'whyItMatters'],
      additionalProperties: false,
    },
    annotations: { title: 'Flag assumption', effect: 'Adds a flagged concern to the board review.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase),
    handler: (args: { statement: string; whyItMatters: string; seat?: BoardSeat; severity?: Severity; slideId?: string; metricId?: string }) =>
      addInterventionResult('flag', args),
  },
  {
    name: 'request_metric_drilldown',
    description: 'Ask for a more revealing breakdown of a metric on the current slide (only when the slide has a metric).',
    inputSchema: {
      type: 'object',
      properties: {
        metricId: { type: 'string', description: 'Metric to drill into.' },
        statement: { type: 'string', description: 'What breakdown is being requested.' },
        whyItMatters: { type: 'string' },
        seat: seatEnum,
      },
      required: ['metricId', 'statement'],
      additionalProperties: false,
    },
    annotations: { title: 'Request drill-down', effect: 'Adds a drill-down request to the review.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase) && (currentSlide(m)?.metrics.length ?? 0) > 0,
    handler: (args: { metricId: string; statement: string; whyItMatters?: string; seat?: BoardSeat }) =>
      addInterventionResult('drilldown', {
        statement: args.statement,
        whyItMatters: args.whyItMatters ?? 'The headline may hide the underlying trend.',
        seat: args.seat,
        metricId: args.metricId,
        severity: 'material',
      }),
  },
  {
    name: 'propose_commitment',
    description: 'Propose a follow-up action for the founder to accept, edit, reject or park. Never commit on their behalf.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'The proposed action.' },
        owner: { type: 'string', description: 'Suggested owner.' },
        dueDate: { type: 'string', description: 'Suggested due date.' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    annotations: { title: 'Propose commitment', effect: 'Opens a draft commitment for founder approval.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase),
    handler: (args: { action: string; owner?: string; dueDate?: string }) => {
      const commitment = useMeeting.getState().addCommitment({
        action: args.action,
        owner: args.owner ?? 'TBD',
        dueDate: args.dueDate ?? 'TBD',
        source: 'proposed',
      });
      return { summary: `Proposed commitment: ${args.action}`, data: { commitment } };
    },
  },
  {
    name: 'record_decision',
    description: 'Record a decision the board must resolve, with the options in play. The founder chooses.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The decision to be made.' },
        options: { type: 'array', items: { type: 'string' }, description: 'The options in play.' },
      },
      required: ['question', 'options'],
      additionalProperties: false,
    },
    annotations: { title: 'Record decision', effect: 'Adds a decision to the board review.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase),
    handler: (args: { question: string; options: string[] }) => {
      const decision = useMeeting.getState().addDecision({ question: args.question, options: args.options });
      return { summary: `Decision recorded: ${args.question}`, data: { decision } };
    },
  },
  {
    name: 'set_meeting_phase',
    description: 'Move the meeting between opening, operating-review, strategy and close. Updates the agenda and tools.',
    inputSchema: {
      type: 'object',
      properties: { phase: { type: 'string', enum: ['opening', 'operating-review', 'strategy', 'close'] } },
      required: ['phase'],
      additionalProperties: false,
    },
    annotations: { title: 'Set meeting phase', effect: 'Advances the meeting phase.' },
    isAvailable: (m) => m.meetingStarted,
    handler: (args: { phase: 'opening' | 'operating-review' | 'strategy' | 'close' }) => {
      useMeeting.getState().setPhase(args.phase);
      return { summary: `Phase set to ${args.phase}.`, data: { phase: args.phase } };
    },
  },
  {
    name: 'generate_board_readout',
    description: 'Generate the end-of-meeting readout from the recorded review (only after at least one concern).',
    inputSchema: empty,
    annotations: { title: 'Generate readout', effect: 'Opens the board readout.' },
    isAvailable: (m) => m.meetingStarted && m.interventions.length > 0,
    handler: (_args, m) => {
      const readout = buildReadout(m);
      useMeeting.getState().setReadout(readout);
      return { summary: 'Board readout generated.', data: { readout } };
    },
  },
];

function addInterventionResult(
  kind: InterventionKind,
  args: { statement: string; whyItMatters: string; seat?: BoardSeat; severity?: Severity; slideId?: string; metricId?: string },
) {
  const store = useMeeting.getState();
  const slideId = args.slideId ?? store.currentSlideId ?? undefined;
  const intervention = store.addIntervention({
    kind,
    seat: args.seat ?? 'lead-investor',
    statement: args.statement,
    whyItMatters: args.whyItMatters,
    severity: args.severity ?? 'material',
    slideId,
    metricId: args.metricId,
  });
  if (!intervention) return { summary: 'That concern is already open (not duplicated).', data: { duplicate: true } };
  if (args.slideId) store.goToSlide(args.slideId);
  if (args.metricId) store.focusMetric(args.metricId);
  return { summary: `${kind}: ${args.statement}`, data: { intervention } };
}

export const actionByName = new Map(boardActions.map((a) => [a.name, a]));
