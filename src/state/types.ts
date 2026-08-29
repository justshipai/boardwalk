export type MeetingPhase = 'prepare' | 'opening' | 'operating-review' | 'strategy' | 'close' | 'readout';

export type Intensity = 'constructive' | 'direct' | 'no-hiding';

export type BoardSeat = 'lead-investor' | 'operator' | 'independent-chair';

export type Severity = 'watch' | 'material' | 'critical';

export type InterventionKind = 'question' | 'flag' | 'drilldown' | 'commitment' | 'decision';

export type InterventionStatus = 'open' | 'answered' | 'accepted' | 'rejected' | 'parked';

export type MetricTrend = 'up' | 'down' | 'flat';

export interface MetricPoint {
  period: string;
  value: number;
}

export interface Metric {
  id: string;
  label: string;
  unit: string;
  current: number;
  history: MetricPoint[];
  trend: MetricTrend;
  // the honest read the board should surface, hidden behind the headline narrative
  caveat?: string;
}

// normalized (0–1) rectangle over the slide, used to anchor annotations on image/uploaded decks
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

// a targetable line of the deck — a bullet on a structured slide, or a text run on an uploaded page
export interface Claim {
  id: string;
  text: string;
  region?: Region;
}

export interface Slide {
  id: string;
  index: number;
  title: string;
  // headline narrative as the founder would present it
  narrative: string;
  bullets: string[];
  metrics: Metric[];
  // internal note used to encode the deck's hidden weaknesses; never shown as a metric value
  subtext?: string;
  // uploaded decks: the rendered page image and the extracted page text the board reads
  imageDataUrl?: string;
  pageText?: string;
  // targetable text runs with positions (populated for uploaded decks; derived from bullets otherwise)
  claims?: Claim[];
}


export interface Commitment {
  id: string;
  owner: string;
  action: string;
  dueDate: string;
  // 'previous' commitments arrive from the last meeting; 'proposed' are raised live and await approval
  source: 'previous' | 'proposed';
  status: InterventionStatus;
}

export interface Decision {
  id: string;
  question: string;
  options: string[];
  // the option the board leans toward, if it took a position
  recommended?: string;
  chosen?: string;
  status: InterventionStatus;
}

export interface Intervention {
  id: string;
  kind: InterventionKind;
  seat: BoardSeat;
  slideId?: string;
  metricId?: string;
  // A line-level source target. On uploaded decks this maps to a normalized PDF text region;
  // on the structured demo it maps to a bullet rendered in the stage.
  claimId?: string;
  statement: string;
  whyItMatters: string;
  severity: Severity;
  status: InterventionStatus;
  createdAt: number;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'founder' | 'board';
  seat?: BoardSeat;
  text: string;
  slideId?: string;
  at: number;
}

export interface CompanyContext {
  name: string;
  stage: string;
  currentPriority: string;
  decisionNeeded: string;
}

export interface BoardReadout {
  likelyQuestions: string[];
  weakestAssumptions: string[];
  contradictions: string[];
  decisionsRequired: string[];
  acceptedCommitments: string[];
  openingRecommendation: string;
}

export interface Meeting {
  id: string;
  phase: MeetingPhase;
  intensity: Intensity;
  company: CompanyContext;
  deckLoaded: boolean;
  meetingStarted: boolean;
  currentSlideId: string | null;
  focusedMetricId: string | null;
  focusedClaimId: string | null;
  slides: Slide[];
  commitments: Commitment[];
  interventions: Intervention[];
  decisions: Decision[];
  transcript: TranscriptTurn[];
  readout: BoardReadout | null;
}
