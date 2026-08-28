import { useCanvas } from '@/canvas/canvas-store';
import { ACCENTS, NODE_KINDS, type AccentColor, type NodeKind } from '@/canvas/types';
import type { BoardAction } from './types';

const empty = { type: 'object' as const, properties: {}, additionalProperties: false };
const colorEnum = { type: 'string', enum: ACCENTS, description: 'neutral, blue, green, amber, red or purple.' };
const kindEnum = { type: 'string', enum: NODE_KINDS, description: 'card, start, end, decision or sticky.' };

const store = () => useCanvas.getState();

export const boardActions: BoardAction[] = [
  {
    name: 'get_canvas',
    description: 'Read the whole canvas: title, and every node (id, label, kind, colour) and connection between them.',
    inputSchema: empty,
    annotations: { title: 'Read canvas', readOnlyHint: true },
    isAvailable: () => true,
    handler: (_args, s) => ({
      summary: `${s.nodes.length} node(s), ${s.edges.length} connection(s).`,
      data: {
        title: s.title,
        nodes: s.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind, color: n.color })),
        edges: s.edges.map((e) => ({ id: e.id, from: e.source, to: e.target, label: e.label })),
      },
    }),
  },
  {
    name: 'add_node',
    description: 'Add a box to the canvas with a label. Optionally set its kind and colour. Returns the new node id.',
    inputSchema: {
      type: 'object',
      properties: { label: { type: 'string', description: 'Text on the box.' }, kind: kindEnum, color: colorEnum },
      required: ['label'],
      additionalProperties: false,
    },
    annotations: { title: 'Add node', effect: 'A new box appears on the canvas.' },
    isAvailable: () => true,
    handler: (args: { label: string; kind?: NodeKind; color?: AccentColor }) => {
      const node = store().addNode({ label: args.label, kind: args.kind, color: args.color });
      return { summary: `Added "${node.label}".`, data: { id: node.id, label: node.label } };
    },
  },
  {
    name: 'connect_nodes',
    description: 'Draw an arrow between two nodes (by id or by label), with an optional label on the arrow.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Start node id or label.' },
        target: { type: 'string', description: 'End node id or label.' },
        label: { type: 'string', description: 'Optional text on the arrow.' },
      },
      required: ['source', 'target'],
      additionalProperties: false,
    },
    annotations: { title: 'Connect nodes', effect: 'An arrow is drawn between two boxes.' },
    isAvailable: (s) => s.nodes.length >= 2,
    handler: (args: { source: string; target: string; label?: string }) => {
      const s = store();
      const from = s.find(args.source);
      const to = s.find(args.target);
      if (!from || !to) return { summary: `Could not find ${!from ? args.source : args.target}.`, data: { connected: false } };
      const edge = s.connect(from.id, to.id, args.label);
      if (!edge) return { summary: 'Those are already connected.', data: { connected: false } };
      return { summary: `Connected "${from.label}" → "${to.label}".`, data: { connected: true, id: edge.id } };
    },
  },
  {
    name: 'update_node',
    description: 'Rename a node or change its colour or kind. Target it by id or by label.',
    inputSchema: {
      type: 'object',
      properties: {
        node: { type: 'string', description: 'Node id or current label.' },
        label: { type: 'string', description: 'New label.' },
        color: colorEnum,
        kind: kindEnum,
      },
      required: ['node'],
      additionalProperties: false,
    },
    annotations: { title: 'Update node', effect: 'A box is renamed or recoloured.' },
    isAvailable: (s) => s.nodes.length > 0,
    handler: (args: { node: string; label?: string; color?: AccentColor; kind?: NodeKind }) => {
      const s = store();
      const node = s.find(args.node);
      if (!node) return { summary: `No node "${args.node}".`, data: { updated: false } };
      const updated = s.updateNode(node.id, { label: args.label, color: args.color, kind: args.kind });
      return { summary: `Updated "${updated?.label ?? node.label}".`, data: { updated: true, id: node.id } };
    },
  },
  {
    name: 'delete_node',
    description: 'Remove a node (by id or label) and any arrows attached to it.',
    inputSchema: {
      type: 'object',
      properties: { node: { type: 'string', description: 'Node id or label.' } },
      required: ['node'],
      additionalProperties: false,
    },
    annotations: { title: 'Delete node', effect: 'A box and its arrows are removed.' },
    isAvailable: (s) => s.nodes.length > 0,
    handler: (args: { node: string }) => {
      const s = store();
      const node = s.find(args.node);
      if (!node) return { summary: `No node "${args.node}".`, data: { deleted: false } };
      s.deleteNode(node.id);
      return { summary: `Deleted "${node.label}".`, data: { deleted: true } };
    },
  },
  {
    name: 'auto_layout',
    description: 'Automatically arrange all nodes into a clean top-to-bottom flow based on their connections.',
    inputSchema: empty,
    annotations: { title: 'Auto layout', effect: 'The whole diagram rearranges into a tidy layout.' },
    isAvailable: (s) => s.nodes.length > 0,
    handler: () => {
      store().layout();
      return { summary: 'Arranged the diagram.', data: { laidOut: true } };
    },
  },
  {
    name: 'set_title',
    description: 'Set the title of the canvas.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title'],
      additionalProperties: false,
    },
    annotations: { title: 'Set title', effect: 'The canvas title changes.' },
    isAvailable: () => true,
    handler: (args: { title: string }) => {
      store().setTitle(args.title);
      return { summary: `Titled "${args.title}".`, data: { title: args.title } };
    },
  },
  {
    name: 'clear_canvas',
    description: 'Remove every node and connection to start from a blank canvas.',
    inputSchema: empty,
    annotations: { title: 'Clear canvas', effect: 'The canvas is emptied.' },
    isAvailable: (s) => s.nodes.length > 0,
    handler: () => {
      store().clear();
      return { summary: 'Cleared the canvas.', data: { cleared: true } };
    },
  },
];

export const actionByName = new Map(boardActions.map((a) => [a.name, a]));
