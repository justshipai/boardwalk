export type NodeKind = 'card' | 'start' | 'end' | 'sticky' | 'decision';

export type AccentColor = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple';

export const ACCENTS: AccentColor[] = ['neutral', 'blue', 'green', 'amber', 'red', 'purple'];
export const NODE_KINDS: NodeKind[] = ['card', 'start', 'end', 'sticky', 'decision'];

export interface CanvasNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  color: AccentColor;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Presence {
  // who is acting on the canvas right now — used to show the AI collaborator's cursor
  actor: 'ai' | 'chatgpt' | null;
  x: number;
  y: number;
  label?: string;
}
