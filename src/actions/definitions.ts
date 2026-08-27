import { currentSlide, findMetric, useMeeting } from '@/state/meeting-store';
import type { AnnotationKind, AnnotationTarget, BoardSeat, Claim, InterventionKind, Severity, Slide } from '@/state/types';
import { buildReadout } from './readout';
import type { BoardAction } from './types';

const SEATS: BoardSeat[] = ['lead-investor', 'operator', 'independent-chair'];
const SEVERITIES: Severity[] = ['watch', 'material', 'critical'];
const ANNOTATION_KINDS: AnnotationKind[] = ['circle', 'strike', 'underline', 'pin', 'arrow'];

const seatEnum = { type: 'string', enum: SEATS };
const severityEnum = { type: 'string', enum: SEVERITIES };

const notInReadout = (phase: string) => phase !== 'readout';

function slideClaims(slide: Slide): Claim[] {
  if (slide.claims?.length) return slide.claims;
  return slide.bullets.map((text, i) => ({ id: `${slide.id}-b${i}`, text }));
}

// attach a claim's stored region (uploaded decks) so the annotation renders without a DOM anchor
function resolveTarget(slide: Slide, target: AnnotationTarget): AnnotationTarget {
  if (target.claimId && !target.region) {
    const claim = slideClaims(slide).find((c) => c.id === target.claimId);
    if (claim?.region) return { ...target, region: claim.region };
  }
  return target;
}

const shortLabel = (text: string) => {
  const clean = text.replace(/^["“]|["”]$/g, '').trim();
  return clean.length > 32 ? `${clean.slice(0, 32)}…` : clean;
};

function annotate(slide: Slide, kind: AnnotationKind, target: AnnotationTarget, label: string | undefined, severity: Severity) {
  useMeeting.getState().addAnnotation({ slideId: slide.id, kind, target: resolveTarget(slide, target), label, severity });
}

export const boardActions: BoardAction[] = [
  // ---- Read tools (readOnlyHint) ----
  {
    name: 'get_meeting_context',
    description:
      'Read the company context, board perspectives, chosen intensity and current meeting phase. Call this first to ground any challenge in the actual meeting state.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'Get meeting context', readOnlyHint: true },
    isAvailable: () => true,
    handler: (_args, m) => ({
      summary: `${m.company.name || 'No deck'} — phase ${m.phase}, intensity ${m.intensity}.`,
      data: {
        company: m.company,
        phase: m.phase,
        intensity: m.intensity,
        deckLoaded: m.deckLoaded,
        meetingStarted: m.meetingStarted,
        slideCount: m.slides.length,
        boardSeats: SEATS,
      },
    }),
  },
  {
    name: 'get_current_slide',
    description: 'Read the active slide: its title, narrative, bullet points, and any metrics it exposes.',
    inputSchema: { type: 'object', properties: {} },
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
          narrative: slide.narrative,
          bullets: slide.bullets,
          text: slide.pageText ?? undefined,
          claims: slideClaims(slide).map((c) => ({ id: c.id, text: c.text })),
          metrics: slide.metrics.map((x) => ({ id: x.id, label: x.label, current: x.current, unit: x.unit, trend: x.trend })),
        },
      };
    },
  },
  {
    name: 'get_metric_detail',
    description:
      'Read a named metric with its full period-by-period history and any caveat, so a challenge can distinguish the headline from the trend.',
    inputSchema: {
      type: 'object',
      properties: { metricId: { type: 'string', description: 'The metric id, e.g. "nrr" or "arr".' } },
      required: ['metricId'],
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
    description: 'Read commitments carried over from the previous board meeting, including owner, action, due date and status.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'Get previous commitments', readOnlyHint: true },
    isAvailable: (m) => m.deckLoaded,
    handler: (_args, m) => {
      const previous = m.commitments.filter((c) => c.source === 'previous');
      return {
        summary: `${previous.length} prior commitment(s).`,
        data: { commitments: previous },
      };
    },
  },

  // ---- Interaction tools (visible side effect) ----
  {
    name: 'focus_evidence',
    description:
      'Navigate the shared boardroom to a slide and optionally pulse-highlight a specific metric so the founder sees exactly what is being questioned.',
    inputSchema: {
      type: 'object',
      properties: {
        slideId: { type: 'string', description: 'Slide to navigate to.' },
        metricId: { type: 'string', description: 'Optional metric on that slide to highlight.' },
      },
      required: ['slideId'],
    },
    annotations: { title: 'Focus evidence', effect: 'Navigates the deck and pulses the evidence on screen.' },
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
    description:
      'Attach a material board-level question to the meeting. Use when the founder must give an answer the board will weigh. Ground it in a slide or metric.',
    inputSchema: {
      type: 'object',
      properties: {
        statement: { type: 'string', description: 'The question, phrased as a board would ask it.' },
        whyItMatters: { type: 'string', description: 'Why this could change a decision or confidence level.' },
        seat: seatEnum,
        severity: severityEnum,
        slideId: { type: 'string' },
        metricId: { type: 'string' },
        claimId: { type: 'string', description: 'A claim id from get_current_slide, to pin the question to a specific line.' },
      },
      required: ['statement', 'whyItMatters'],
    },
    annotations: { title: 'Raise board question', effect: 'Pins a question to the slide and adds a card to the rail.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase),
    handler: (args: { statement: string; whyItMatters: string; seat?: BoardSeat; severity?: Severity; slideId?: string; metricId?: string; claimId?: string }) =>
      addInterventionResult('question', args),
  },
  {
    name: 'flag_assumption',
    description:
      'Flag a claim as unsupported, contradicted or uncertain. Use for seasonal-dip hand-waving, causal claims without evidence, or contradictions across slides.',
    inputSchema: {
      type: 'object',
      properties: {
        statement: { type: 'string', description: 'The claim being flagged and what is wrong with it.' },
        whyItMatters: { type: 'string' },
        seat: seatEnum,
        severity: severityEnum,
        slideId: { type: 'string' },
        metricId: { type: 'string' },
        claimId: { type: 'string', description: 'A claim id from get_current_slide, to strike the exact disputed line.' },
      },
      required: ['statement', 'whyItMatters'],
    },
    annotations: { title: 'Flag assumption', effect: 'Marks the disputed claim on the slide and adds a flag to the rail.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase),
    handler: (args: { statement: string; whyItMatters: string; seat?: BoardSeat; severity?: Severity; slideId?: string; metricId?: string; claimId?: string }) =>
      addInterventionResult('flag', args),
  },
  {
    name: 'annotate_evidence',
    description:
      'Draw a mark directly on the current slide so the founder sees exactly what you mean: circle a metric, strike a disputed line, underline a claim, or pin a note. Target a metric by metricId or a line by claimId (from get_current_slide).',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ANNOTATION_KINDS, description: 'circle, strike, underline, pin or arrow.' },
        metricId: { type: 'string', description: 'Metric to mark.' },
        claimId: { type: 'string', description: 'Claim/line to mark, from get_current_slide.' },
        label: { type: 'string', description: 'Short note shown on the mark (a few words).' },
        severity: severityEnum,
      },
      required: ['kind'],
    },
    annotations: { title: 'Annotate evidence', effect: 'Draws the mark on the current slide within a second.' },
    isAvailable: (m) => m.deckLoaded && notInReadout(m.phase),
    handler: (args: { kind: AnnotationKind; metricId?: string; claimId?: string; label?: string; severity?: Severity }, m) => {
      const slide = currentSlide(m);
      if (!slide) return { summary: 'No active slide to annotate.', data: { drawn: false } };
      annotate(slide, args.kind, { metricId: args.metricId, claimId: args.claimId }, args.label, args.severity ?? 'material');
      return { summary: `Drew ${args.kind} on slide ${slide.index + 1}${args.label ? `: ${args.label}` : ''}.`, data: { drawn: true, kind: args.kind } };
    },
  },
  {
    name: 'request_metric_drilldown',
    description:
      'Ask for a more revealing breakdown of a metric on the current slide — a trend, cohort or channel cut that the headline hides. Only available when the active slide exposes a metric.',
    inputSchema: {
      type: 'object',
      properties: {
        metricId: { type: 'string', description: 'Metric to drill into.' },
        statement: { type: 'string', description: 'What breakdown is being requested.' },
        whyItMatters: { type: 'string' },
        seat: seatEnum,
      },
      required: ['metricId', 'statement'],
    },
    annotations: { title: 'Request drill-down', effect: 'Adds a drill-down request beside the metric.' },
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
    description:
      'Propose a follow-up action for the founder to accept, edit, reject or park. Never commit on the founder’s behalf — this opens a draft awaiting approval.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'The proposed action.' },
        owner: { type: 'string', description: 'Suggested owner.' },
        dueDate: { type: 'string', description: 'Suggested due date.' },
      },
      required: ['action'],
    },
    annotations: { title: 'Propose commitment', effect: 'Opens a draft commitment in the drawer for founder approval.' },
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
    description:
      'Record a decision the board needs to resolve, with the options in play. The founder chooses; this makes the decision visible and reviewable.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The decision to be made.' },
        options: { type: 'array', items: { type: 'string' }, description: 'The options in play.' },
      },
      required: ['question', 'options'],
    },
    annotations: { title: 'Record decision', effect: 'Adds a decision to the drawer with its status.' },
    isAvailable: (m) => m.meetingStarted && notInReadout(m.phase),
    handler: (args: { question: string; options: string[] }) => {
      const decision = useMeeting.getState().addDecision({ question: args.question, options: args.options });
      return { summary: `Decision recorded: ${args.question}`, data: { decision } };
    },
  },
  {
    name: 'set_meeting_phase',
    description:
      'Move the meeting between opening, operating-review, strategy and close. Updates the agenda and the tools available for that phase.',
    inputSchema: {
      type: 'object',
      properties: {
        phase: { type: 'string', enum: ['opening', 'operating-review', 'strategy', 'close'] },
      },
      required: ['phase'],
    },
    annotations: { title: 'Set meeting phase', effect: 'Advances the meeting phase and agenda.' },
    isAvailable: (m) => m.meetingStarted,
    handler: (args: { phase: 'opening' | 'operating-review' | 'strategy' | 'close' }) => {
      useMeeting.getState().setPhase(args.phase);
      return { summary: `Phase set to ${args.phase}.`, data: { phase: args.phase } };
    },
  },
  {
    name: 'generate_board_readout',
    description:
      'Synthesise the end-of-meeting readout from recorded state: likely questions, weakest assumptions, contradictions, decisions still required and accepted commitments. Only available once the meeting contains at least one intervention.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'Generate readout', effect: 'Opens the board readout view.' },
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
  args: { statement: string; whyItMatters: string; seat?: BoardSeat; severity?: Severity; slideId?: string; metricId?: string; claimId?: string },
) {
  const store = useMeeting.getState();
  const slideId = args.slideId ?? store.currentSlideId ?? undefined;
  const severity = args.severity ?? 'material';
  const intervention = store.addIntervention({
    kind,
    seat: args.seat ?? 'lead-investor',
    statement: args.statement,
    whyItMatters: args.whyItMatters,
    severity,
    slideId,
    metricId: args.metricId,
  });
  if (!intervention) return { summary: 'That intervention is already open (not duplicated).', data: { duplicate: true } };
  if (args.slideId) store.goToSlide(args.slideId);
  if (args.metricId) store.focusMetric(args.metricId);

  // guaranteed on-deck mark: the board visibly marks what it just challenged
  const slide = currentSlide(useMeeting.getState());
  if (slide && slide.id === (slideId ?? slide.id)) {
    const target: AnnotationTarget = args.metricId
      ? { metricId: args.metricId }
      : args.claimId
        ? { claimId: args.claimId }
        : { region: { x: 0.62, y: 0.06, w: 0.32, h: 0.14 } };
    if (kind === 'flag') {
      annotate(slide, args.metricId ? 'circle' : args.claimId ? 'strike' : 'pin', target, shortLabel(args.statement), severity);
    } else if (kind === 'question') {
      annotate(slide, 'arrow', target, 'Q', severity);
    }
  }

  return { summary: `${kind}: ${args.statement}`, data: { intervention } };
}

export const actionByName = new Map(boardActions.map((a) => [a.name, a]));
