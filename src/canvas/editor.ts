import dagre from '@dagrejs/dagre';
import type { AccentColor, ShapeKind } from './types';
import { useCanvasMeta } from './stores';

// Excalidraw's imperative API. The AI owns a semantic model (nodes + edges); on each change we
// rebuild those elements and merge them with anything the human has drawn, so both share the canvas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any;

interface NodeModel {
  label: string;
  kind: ShapeKind;
  color: AccentColor;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface EdgeModel {
  id: string;
  from: string;
  to: string;
  label?: string;
}

let api: ExcalidrawAPI | null = null;
const nodes = new Map<string, NodeModel>();
const edges: EdgeModel[] = [];
let managedIds = new Set<string>();
let convert: ((skeleton: unknown[]) => unknown[]) | null = null;

const NODE_W = 190;
const NODE_H = 84;
const MIN_W = 24;
const MIN_H = 24;
let seq = 0;
const uid = (p: string) => `${p}${(seq++).toString(36)}${Date.now().toString(36).slice(-3)}`;

const stroke: Record<AccentColor, string> = {
  neutral: '#adb5bd',
  blue: '#4dabf7',
  green: '#69db7c',
  amber: '#ffa94d',
  red: '#ff6b6b',
  purple: '#da77f2',
};

export function setEditor(a: ExcalidrawAPI | null) {
  api = a;
  if (a)
    import('@excalidraw/excalidraw').then((m) => {
      convert = m.convertToExcalidrawElements as unknown as (s: unknown[]) => unknown[];
      rebuild();
    });
  useCanvasMeta.getState().setShapeCount(nodes.size);
}
export function hasEditor() {
  return !!api;
}
export function nodeCount() {
  return nodes.size;
}

const excType = (kind: ShapeKind) => (kind === 'note' ? 'rectangle' : kind === 'text' ? 'text' : kind);

function nodeSkeleton(id: string, n: NodeModel) {
  if (n.kind === 'text') {
    return { type: 'text', id, x: n.x, y: n.y, text: n.label, strokeColor: stroke[n.color], fontSize: 20 };
  }
  return {
    type: excType(n.kind),
    id,
    x: n.x,
    y: n.y,
    width: n.w,
    height: n.h,
    strokeColor: stroke[n.color],
    backgroundColor: 'transparent',
    roundness: n.kind === 'note' ? { type: 3 } : undefined,
    label: { text: n.label, strokeColor: '#e9ecef', fontSize: 16 },
  };
}

// point on a rectangle's border, from its centre toward a target — so arrows stop at the edge
function borderPoint(cx: number, cy: number, w: number, h: number, tx: number, ty: number, gap: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = 1 / Math.max(Math.abs(dx) / (w / 2), Math.abs(dy) / (h / 2));
  const len = Math.hypot(dx, dy) * scale;
  const f = (len + gap) / Math.hypot(dx, dy);
  return { x: cx + dx * f, y: cy + dy * f };
}

function edgeSkeleton(e: EdgeModel) {
  const from = nodes.get(e.from);
  const to = nodes.get(e.to);
  const fw = from?.w ?? NODE_W;
  const fh = from?.h ?? NODE_H;
  const tw = to?.w ?? NODE_W;
  const th = to?.h ?? NODE_H;
  const scx = (from?.x ?? 0) + fw / 2;
  const scy = (from?.y ?? 0) + fh / 2;
  const tcx = (to?.x ?? 0) + tw / 2;
  const tcy = (to?.y ?? 0) + th / 2;
  const sp = borderPoint(scx, scy, fw, fh, tcx, tcy, 6);
  const ep = borderPoint(tcx, tcy, tw, th, scx, scy, 8);
  return {
    type: 'arrow',
    id: e.id,
    x: sp.x,
    y: sp.y,
    width: ep.x - sp.x,
    height: ep.y - sp.y,
    strokeColor: '#868e96',
    label: e.label ? { text: e.label, strokeColor: '#adb5bd', fontSize: 14 } : undefined,
  };
}

let cursor: { x: number; y: number } | null = null;
let cursorTimer: ReturnType<typeof setTimeout> | null = null;
function pointAt(id: string) {
  const n = nodes.get(id);
  if (!n) return;
  cursor = { x: n.x + n.w / 2, y: n.y + n.h / 2 };
  if (cursorTimer) clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => {
    cursor = null;
    api?.updateScene?.({ collaborators: new Map() });
  }, 2500);
}

function collaborators() {
  const map = new Map();
  if (cursor) map.set('ai', { username: 'AI', pointer: { x: cursor.x, y: cursor.y }, color: { background: '#6ea8fe', stroke: '#6ea8fe' } });
  return map;
}

let fitTimer: ReturnType<typeof setTimeout> | null = null;
function rebuild() {
  if (!api || !convert) return;
  const skeleton = [...[...nodes].map(([id, n]) => nodeSkeleton(id, n)), ...edges.map(edgeSkeleton)];
  const mine = convert(skeleton) as { id: string }[];
  const human = (api.getSceneElements() as { id: string }[]).filter((el) => !managedIds.has(el.id));
  api.updateScene({ elements: [...human, ...mine], collaborators: collaborators() });
  managedIds = new Set(mine.map((e) => e.id));
  useCanvasMeta.getState().setShapeCount(nodes.size);
  if (fitTimer) clearTimeout(fitTimer);
  fitTimer = setTimeout(() => api?.scrollToContent?.(api.getSceneElements(), { fitToContent: true, animate: true, duration: 400 }), 350);
}

const gridPos = () => ({ x: 200 + (nodes.size % 5) * 260, y: 160 + Math.floor(nodes.size / 5) * 170 });

export function findId(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (nodes.has(query)) return query;
  for (const [id, n] of nodes) if (n.label.toLowerCase() === q) return id;
  for (const [id, n] of nodes) if (n.label.toLowerCase().includes(q)) return id;
  return null;
}

export function createNode(input: { label: string; kind?: ShapeKind; color?: AccentColor; x?: number; y?: number; w?: number; h?: number }) {
  const w = input.w !== undefined ? Math.max(MIN_W, Math.round(input.w)) : NODE_W;
  const h = input.h !== undefined ? Math.max(MIN_H, Math.round(input.h)) : NODE_H;
  // reuse an existing shape with the same label instead of creating a duplicate
  const q = input.label.trim().toLowerCase();
  for (const [existingId, n] of nodes) {
    if (n.label.toLowerCase() === q) {
      const patch = { ...n };
      if (input.x !== undefined && input.y !== undefined) Object.assign(patch, { x: input.x, y: input.y });
      if (input.w !== undefined) patch.w = w;
      if (input.h !== undefined) patch.h = h;
      nodes.set(existingId, patch);
      pointAt(existingId);
      rebuild();
      return { id: existingId, label: n.label };
    }
  }
  const id = uid('n');
  const pos = { x: input.x ?? gridPos().x, y: input.y ?? gridPos().y };
  nodes.set(id, { label: input.label, kind: input.kind ?? 'rectangle', color: input.color ?? 'neutral', x: pos.x, y: pos.y, w, h });
  pointAt(id);
  rebuild();
  return { id, label: input.label };
}

export function connectNodes(sourceQ: string, targetQ: string, label?: string) {
  const from = findId(sourceQ);
  const to = findId(targetQ);
  if (!from || !to || from === to) return null;
  if (edges.some((e) => e.from === from && e.to === to)) return null;
  const id = uid('e');
  edges.push({ id, from, to, label });
  pointAt(to);
  rebuild();
  return id;
}

export function updateNode(query: string, patch: { label?: string; color?: AccentColor; w?: number; h?: number }) {
  const id = findId(query);
  if (!id) return null;
  const n = nodes.get(id)!;
  nodes.set(id, {
    ...n,
    label: patch.label ?? n.label,
    color: patch.color ?? n.color,
    w: patch.w !== undefined ? Math.max(MIN_W, Math.round(patch.w)) : n.w,
    h: patch.h !== undefined ? Math.max(MIN_H, Math.round(patch.h)) : n.h,
  });
  pointAt(id);
  rebuild();
  return { id, label: patch.label ?? n.label };
}

export function deleteNode(query: string) {
  const id = findId(query);
  if (!id) return false;
  nodes.delete(id);
  for (let i = edges.length - 1; i >= 0; i--) if (edges[i].from === id || edges[i].to === id) edges.splice(i, 1);
  rebuild();
  return true;
}

export function readCanvas() {
  return {
    nodes: [...nodes].map(([id, n]) => ({ id, label: n.label, kind: n.kind, color: n.color })),
    edges: edges.map((e) => ({ from: e.from, to: e.to, label: e.label })),
  };
}

export function layout() {
  if (nodes.size === 0) return;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120, marginx: 60, marginy: 60 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n, id) => g.setNode(id, { width: n.w, height: n.h }));
  edges.forEach((e) => g.setEdge(e.from, e.to));
  dagre.layout(g);
  nodes.forEach((n, id) => {
    const p = g.node(id);
    if (p) nodes.set(id, { ...n, x: Math.round(p.x - n.w / 2), y: Math.round(p.y - n.h / 2) });
  });
  rebuild();
}

export function clearCanvas() {
  nodes.clear();
  edges.length = 0;
  managedIds = new Set();
  api?.updateScene?.({ elements: [], collaborators: new Map() });
  useCanvasMeta.getState().setShapeCount(0);
}
