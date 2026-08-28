import { create } from 'zustand';
import dagre from '@dagrejs/dagre';
import type { AccentColor, CanvasEdge, CanvasNode, NodeKind, Presence } from './types';

const NODE_W = 176;
const NODE_H = 64;

let seq = 0;
const uid = (p: string) => `${p}-${(seq++).toString(36)}-${Date.now().toString(36).slice(-4)}`;

export interface CanvasState {
  title: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  // ids the AI just touched — drives a brief highlight so collaboration is visible
  actedIds: string[];
  presence: Presence;

  setTitle: (title: string) => void;
  addNode: (input: { label: string; kind?: NodeKind; color?: AccentColor; x?: number; y?: number }) => CanvasNode;
  updateNode: (id: string, patch: Partial<Pick<CanvasNode, 'label' | 'color' | 'kind'>>) => CanvasNode | null;
  moveNode: (id: string, x: number, y: number) => void;
  deleteNode: (id: string) => void;
  connect: (source: string, target: string, label?: string) => CanvasEdge | null;
  deleteEdge: (id: string) => void;
  replaceNodes: (nodes: CanvasNode[]) => void;
  layout: () => void;
  clear: () => void;
  markActed: (ids: string[]) => void;
  setPresence: (p: Presence) => void;
  find: (query: string) => CanvasNode | null;
}

export const useCanvas = create<CanvasState>((set, get) => ({
  title: 'Untitled canvas',
  nodes: [],
  edges: [],
  actedIds: [],
  presence: { actor: null, x: 0, y: 0 },

  setTitle: (title) => set({ title }),

  addNode: (input) => {
    const count = get().nodes.length;
    const node: CanvasNode = {
      id: uid('n'),
      kind: input.kind ?? 'card',
      label: input.label,
      color: input.color ?? 'neutral',
      x: input.x ?? 120 + (count % 5) * 210,
      y: input.y ?? 120 + Math.floor(count / 5) * 130,
    };
    set((s) => ({ nodes: [...s.nodes, node] }));
    get().markActed([node.id]);
    return node;
  },

  updateNode: (id, patch) => {
    let updated: CanvasNode | null = null;
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id !== id) return n;
        updated = { ...n, ...patch };
        return updated;
      }),
    }));
    if (updated) get().markActed([id]);
    return updated;
  },

  moveNode: (id, x, y) => set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  connect: (source, target, label) => {
    const { nodes, edges } = get();
    if (source === target) return null;
    if (!nodes.some((n) => n.id === source) || !nodes.some((n) => n.id === target)) return null;
    if (edges.some((e) => e.source === source && e.target === target)) return null;
    const edge: CanvasEdge = { id: uid('e'), source, target, label };
    set((s) => ({ edges: [...s.edges, edge] }));
    get().markActed([source, target]);
    return edge;
  },

  deleteEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

  replaceNodes: (nodes) => set({ nodes }),

  layout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 90, marginx: 40, marginy: 40 });
    g.setDefaultEdgeLabel(() => ({}));
    nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    edges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    set({
      nodes: nodes.map((n) => {
        const p = g.node(n.id);
        return p ? { ...n, x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - NODE_H / 2) } : n;
      }),
    });
    get().markActed(nodes.map((n) => n.id));
  },

  clear: () => set({ nodes: [], edges: [], actedIds: [], title: 'Untitled canvas' }),

  markActed: (ids) => {
    set({ actedIds: ids });
    const stamp = ids.join(',');
    setTimeout(() => {
      if (get().actedIds.join(',') === stamp) set({ actedIds: [] });
    }, 1500);
  },

  setPresence: (presence) => set({ presence }),

  find: (query) => {
    const q = query.trim().toLowerCase();
    const nodes = get().nodes;
    return nodes.find((n) => n.id === query) ?? nodes.find((n) => n.label.toLowerCase().includes(q)) ?? null;
  },
}));
