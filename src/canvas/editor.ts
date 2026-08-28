import { createShapeId, toRichText, type Editor, type TLDefaultColorStyle, type TLShapeId } from 'tldraw';
import dagre from '@dagrejs/dagre';
import type { AccentColor, ShapeKind } from './types';
import { useAiCursor, useCanvasMeta } from './stores';

// tldraw is the source of truth for geometry/rendering; this thin index carries the semantic labels
// the AI needs (so it can target shapes by label and read the canvas without parsing rich text).
interface NodeMeta {
  label: string;
  color: AccentColor;
  kind: ShapeKind;
}

let editor: Editor | null = null;
const index = new Map<string, NodeMeta>();

const tlColor: Record<AccentColor, TLDefaultColorStyle> = {
  neutral: 'black',
  blue: 'blue',
  green: 'green',
  amber: 'orange',
  red: 'red',
  purple: 'violet',
};
const tlGeo: Record<string, 'rectangle' | 'ellipse' | 'diamond'> = { rectangle: 'rectangle', ellipse: 'ellipse', diamond: 'diamond' };

export function setEditor(e: Editor | null) {
  editor = e;
  if (typeof window !== 'undefined') (window as unknown as { __ed?: Editor | null }).__ed = e;
  // nudge subscribers (WebMCP sync) so tool availability reflects the editor being ready
  useCanvasMeta.getState().setShapeCount(e ? e.getCurrentPageShapes().filter((s) => s.type !== 'arrow').length : 0);
}
export function hasEditor() {
  return !!editor;
}

function syncMeta() {
  if (!editor) return;
  const present = new Set(editor.getCurrentPageShapes().map((s) => s.id as string));
  for (const id of [...index.keys()]) if (!present.has(id)) index.delete(id);
  useCanvasMeta.getState().setShapeCount(editor.getCurrentPageShapes().filter((s) => s.type !== 'arrow').length);
}

let fitTimer: ReturnType<typeof setTimeout> | null = null;
function fitSoon() {
  if (fitTimer) clearTimeout(fitTimer);
  fitTimer = setTimeout(() => editor?.zoomToFit({ animation: { duration: 400 } }), 350);
}

let cursorTimer: ReturnType<typeof setTimeout> | null = null;
function cursorTo(id: TLShapeId) {
  if (!editor) return;
  const b = editor.getShapePageBounds(id);
  if (!b) return;
  const screen = editor.pageToScreen({ x: b.center.x, y: b.center.y });
  useAiCursor.getState().show(screen.x, screen.y);
  if (cursorTimer) clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => useAiCursor.getState().hide(), 2200);
}

const gridPos = () => {
  const n = index.size;
  return { x: 160 + (n % 5) * 240, y: 140 + Math.floor(n / 5) * 150 };
};

export function findId(query: string): TLShapeId | null {
  const q = query.trim().toLowerCase();
  if (index.has(query)) return query as TLShapeId;
  for (const [id, meta] of index) if (meta.label.toLowerCase() === q) return id as TLShapeId;
  for (const [id, meta] of index) if (meta.label.toLowerCase().includes(q)) return id as TLShapeId;
  return null;
}

export function createNode(input: { label: string; kind?: ShapeKind; color?: AccentColor; x?: number; y?: number }) {
  if (!editor) return null;
  const kind = input.kind ?? 'rectangle';
  const color = input.color ?? 'neutral';
  const id = createShapeId();
  const pos = { x: input.x ?? gridPos().x, y: input.y ?? gridPos().y };

  if (kind === 'note') {
    editor.createShape({ id, type: 'note', x: pos.x, y: pos.y, props: { richText: toRichText(input.label), color: tlColor[color] } });
  } else if (kind === 'text') {
    editor.createShape({ id, type: 'text', x: pos.x, y: pos.y, props: { richText: toRichText(input.label), color: tlColor[color], size: 'l' } });
  } else {
    editor.createShape({
      id,
      type: 'geo',
      x: pos.x,
      y: pos.y,
      props: {
        geo: tlGeo[kind] ?? 'rectangle',
        w: 190,
        h: 84,
        richText: toRichText(input.label),
        color: tlColor[color],
        fill: 'solid',
        align: 'middle',
        verticalAlign: 'middle',
        font: 'draw',
        size: 'm',
      },
    });
  }
  index.set(id, { label: input.label, color, kind });
  syncMeta();
  cursorTo(id);
  fitSoon();
  return { id: id as string, label: input.label };
}

export function connectNodes(sourceQ: string, targetQ: string, label?: string) {
  if (!editor) return null;
  const from = findId(sourceQ);
  const to = findId(targetQ);
  if (!from || !to || from === to) return null;
  const arrowId = createShapeId();
  editor.run(() => {
    editor!.createShape({ id: arrowId, type: 'arrow', props: { richText: toRichText(label ?? ''), color: 'grey', size: 'm' } });
    editor!.createBinding({ type: 'arrow', fromId: arrowId, toId: from, props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 }, isPrecise: false, isExact: false, snap: 'none' } });
    editor!.createBinding({ type: 'arrow', fromId: arrowId, toId: to, props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 }, isPrecise: false, isExact: false, snap: 'none' } });
  });
  cursorTo(to);
  return arrowId as string;
}

export function updateNode(query: string, patch: { label?: string; color?: AccentColor }) {
  if (!editor) return null;
  const id = findId(query);
  if (!id) return null;
  const shape = editor.getShape(id);
  if (!shape) return null;
  const props: Record<string, unknown> = {};
  if (patch.label !== undefined) props.richText = toRichText(patch.label);
  if (patch.color !== undefined) props.color = tlColor[patch.color];
  editor.updateShape({ id, type: shape.type, props });
  const meta = index.get(id);
  if (meta) index.set(id, { ...meta, label: patch.label ?? meta.label, color: patch.color ?? meta.color });
  cursorTo(id);
  return { id: id as string, label: patch.label ?? meta?.label ?? '' };
}

export function deleteNode(query: string) {
  if (!editor) return false;
  const id = findId(query);
  if (!id) return false;
  editor.deleteShapes([id]);
  index.delete(id);
  syncMeta();
  return true;
}

export function readCanvas() {
  if (!editor) return { nodes: [], edges: [] };
  syncMeta();
  const nodes = [...index].map(([id, meta]) => ({ id, label: meta.label, kind: meta.kind, color: meta.color }));
  const edges: { from: string; to: string }[] = [];
  for (const shape of editor.getCurrentPageShapes()) {
    if (shape.type !== 'arrow') continue;
    const bindings = editor.getBindingsFromShape(shape.id, 'arrow');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const start = bindings.find((b: any) => b.props.terminal === 'start');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const end = bindings.find((b: any) => b.props.terminal === 'end');
    if (start && end) edges.push({ from: start.toId as string, to: end.toId as string });
  }
  return { nodes, edges };
}

export function layout() {
  if (!editor) return;
  const { nodes, edges } = readCanvas();
  if (nodes.length === 0) return;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 110, marginx: 60, marginy: 60 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: 200, height: 90 }));
  edges.forEach((e) => g.setEdge(e.from, e.to));
  dagre.layout(g);
  editor.run(() => {
    nodes.forEach((n) => {
      const p = g.node(n.id);
      const shape = editor!.getShape(n.id as TLShapeId);
      if (p && shape) editor!.updateShape({ id: shape.id, type: shape.type, x: Math.round(p.x - 100), y: Math.round(p.y - 45) });
    });
  });
  fitSoon();
}

export function clearCanvas() {
  if (!editor) return;
  editor.deleteShapes(editor.getCurrentPageShapes().map((s) => s.id));
  index.clear();
  syncMeta();
}

export function nodeCount() {
  return index.size;
}
