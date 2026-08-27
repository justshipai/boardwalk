import { create } from 'zustand';
import type {
  BoardReadout,
  Commitment,
  Decision,
  Intervention,
  InterventionStatus,
  Meeting,
  MeetingPhase,
  TranscriptTurn,
} from './types';
import { northstarCompany, northstarPreviousCommitments, northstarSlides } from '@/fixtures/northstar';

let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function emptyMeeting(): Meeting {
  return {
    id: uid('meeting'),
    phase: 'prepare',
    intensity: 'direct',
    company: { name: '', stage: '', currentPriority: '', decisionNeeded: '' },
    deckLoaded: false,
    meetingStarted: false,
    currentSlideId: null,
    focusedMetricId: null,
    slides: [],
    commitments: [],
    interventions: [],
    decisions: [],
    transcript: [],
    readout: null,
  };
}

interface MeetingActions {
  loadDemoDeck: () => void;
  startMeeting: () => void;
  setPhase: (phase: MeetingPhase) => void;
  goToSlide: (slideId: string) => void;
  focusMetric: (metricId: string | null) => void;
  addIntervention: (input: Omit<Intervention, 'id' | 'createdAt' | 'status'> & { status?: InterventionStatus }) => Intervention | null;
  setInterventionStatus: (id: string, status: InterventionStatus) => void;
  addCommitment: (input: Omit<Commitment, 'id' | 'status'> & { status?: InterventionStatus }) => Commitment;
  updateCommitment: (id: string, patch: Partial<Commitment>) => void;
  addDecision: (input: Omit<Decision, 'id' | 'status'> & { status?: InterventionStatus }) => Decision;
  updateDecision: (id: string, patch: Partial<Decision>) => void;
  addTranscript: (turn: Omit<TranscriptTurn, 'id' | 'at'>) => void;
  setReadout: (readout: BoardReadout) => void;
  reset: () => void;
}

export type MeetingState = Meeting & MeetingActions;

export const useMeeting = create<MeetingState>((set, get) => ({
  ...emptyMeeting(),

  loadDemoDeck: () =>
    set({
      company: northstarCompany,
      slides: northstarSlides,
      commitments: northstarPreviousCommitments.map((c) => ({ ...c })),
      deckLoaded: true,
      currentSlideId: northstarSlides[0]?.id ?? null,
      phase: 'prepare',
    }),

  startMeeting: () =>
    set((s) => ({
      meetingStarted: true,
      phase: 'opening',
      currentSlideId: s.currentSlideId ?? s.slides[0]?.id ?? null,
    })),

  setPhase: (phase) => set({ phase }),

  goToSlide: (slideId) =>
    set((s) => (s.slides.some((sl) => sl.id === slideId) ? { currentSlideId: slideId, focusedMetricId: null } : {})),

  focusMetric: (metricId) => set({ focusedMetricId: metricId }),

  addIntervention: (input) => {
    const existing = get().interventions.find(
      (i) => i.kind === input.kind && i.statement === input.statement && i.status === 'open',
    );
    if (existing) return null; // no duplicate cards from one call

    const intervention: Intervention = {
      ...input,
      id: uid(input.kind),
      status: input.status ?? 'open',
      createdAt: Date.now(),
    };
    set((s) => ({ interventions: [...s.interventions, intervention] }));
    return intervention;
  },

  setInterventionStatus: (id, status) =>
    set((s) => ({ interventions: s.interventions.map((i) => (i.id === id ? { ...i, status } : i)) })),

  addCommitment: (input) => {
    const commitment: Commitment = { ...input, id: uid('commitment'), status: input.status ?? 'open' };
    set((s) => ({ commitments: [...s.commitments, commitment] }));
    return commitment;
  },

  updateCommitment: (id, patch) =>
    set((s) => ({ commitments: s.commitments.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  addDecision: (input) => {
    const decision: Decision = { ...input, id: uid('decision'), status: input.status ?? 'open' };
    set((s) => ({ decisions: [...s.decisions, decision] }));
    return decision;
  },

  updateDecision: (id, patch) =>
    set((s) => ({ decisions: s.decisions.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

  addTranscript: (turn) =>
    set((s) => ({ transcript: [...s.transcript, { ...turn, id: uid('turn'), at: Date.now() }] })),

  setReadout: (readout) => set({ readout, phase: 'readout' }),

  reset: () => set({ ...emptyMeeting() }),
}));

export const currentSlide = (s: Meeting) => s.slides.find((sl) => sl.id === s.currentSlideId) ?? null;
export const findMetric = (s: Meeting, metricId: string) =>
  s.slides.flatMap((sl) => sl.metrics.map((m) => ({ slide: sl, metric: m }))).find((x) => x.metric.id === metricId) ?? null;
