import { clearCanvas, connectNodes, createNode, deleteNode, layout, nodeCount, readCanvas, updateNode } from '@/canvas/editor';
import { ACCENTS, SHAPE_KINDS, type AccentColor, type ShapeKind } from '@/canvas/types';
import { useCanvasMeta } from '@/canvas/stores';
import type { BoardAction } from './types';

const empty = { type: 'object' as const, properties: {}, additionalProperties: false };
const colorEnum = { type: 'string', enum: ACCENTS, description: 'neutral, blue, green, amber, red or purple.' };
const kindEnum = { type: 'string', enum: SHAPE_KINDS, description: 'rectangle, ellipse, diamond, note or text.' };

export const boardActions: BoardAction[] = [
  {
    name: 'get_canvas',
    description: 'Read the canvas: the title, every shape (id, label, kind, colour) and the arrows connecting them.',
    inputSchema: empty,
    annotations: { title: 'Read canvas', readOnlyHint: true },
    isAvailable: () => true,
    handler: () => {
      const { nodes, edges } = readCanvas();
      return { summary: `${nodes.length} shape(s), ${edges.length} connection(s).`, data: { title: useCanvasMeta.getState().title, nodes, edges } };
    },
  },
  {
    name: 'add_shape',
    description: 'Add a shape with a label. Give x/y to place it yourself (mind maps, wireframes); omit them to auto-place.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Text on the shape.' },
        kind: kindEnum,
        color: colorEnum,
        x: { type: 'number', description: 'Left position on the canvas (0 = far left, ~1400 = right). Optional.' },
        y: { type: 'number', description: 'Top position (0 = top, ~900 = bottom). Optional.' },
      },
      required: ['label'],
      additionalProperties: false,
    },
    annotations: { title: 'Add shape', effect: 'A new shape appears on the canvas.' },
    isAvailable: () => true,
    handler: (args: { label: string; kind?: ShapeKind; color?: AccentColor; x?: number; y?: number }) => {
      const node = createNode({ label: args.label, kind: args.kind, color: args.color, x: args.x, y: args.y });
      if (!node) return { summary: 'Canvas not ready.', data: { added: false } };
      return { summary: `Added "${node.label}".`, data: { id: node.id, label: node.label } };
    },
  },
  {
    name: 'connect_shapes',
    description: 'Draw an arrow between two shapes (by id or label), with an optional label on the arrow.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Start shape id or label.' },
        target: { type: 'string', description: 'End shape id or label.' },
        label: { type: 'string', description: 'Optional text on the arrow.' },
      },
      required: ['source', 'target'],
      additionalProperties: false,
    },
    annotations: { title: 'Connect shapes', effect: 'An arrow is drawn between two shapes.' },
    isAvailable: () => nodeCount() >= 2,
    handler: (args: { source: string; target: string; label?: string }) => {
      const edge = connectNodes(args.source, args.target, args.label);
      if (!edge) return { summary: `Could not connect ${args.source} → ${args.target}.`, data: { connected: false } };
      return { summary: `Connected ${args.source} → ${args.target}.`, data: { connected: true } };
    },
  },
  {
    name: 'update_shape',
    description: 'Rename a shape or change its colour. Target it by id or by its current label.',
    inputSchema: {
      type: 'object',
      properties: { shape: { type: 'string', description: 'Shape id or label.' }, label: { type: 'string' }, color: colorEnum },
      required: ['shape'],
      additionalProperties: false,
    },
    annotations: { title: 'Update shape', effect: 'A shape is renamed or recoloured.' },
    isAvailable: () => nodeCount() > 0,
    handler: (args: { shape: string; label?: string; color?: AccentColor }) => {
      const updated = updateNode(args.shape, { label: args.label, color: args.color });
      if (!updated) return { summary: `No shape "${args.shape}".`, data: { updated: false } };
      return { summary: `Updated "${updated.label}".`, data: { updated: true } };
    },
  },
  {
    name: 'delete_shape',
    description: 'Remove a shape (by id or label) and any arrows attached to it.',
    inputSchema: {
      type: 'object',
      properties: { shape: { type: 'string', description: 'Shape id or label.' } },
      required: ['shape'],
      additionalProperties: false,
    },
    annotations: { title: 'Delete shape', effect: 'A shape and its arrows are removed.' },
    isAvailable: () => nodeCount() > 0,
    handler: (args: { shape: string }) => {
      const ok = deleteNode(args.shape);
      return { summary: ok ? `Deleted "${args.shape}".` : `No shape "${args.shape}".`, data: { deleted: ok } };
    },
  },
  {
    name: 'auto_layout',
    description: 'Automatically arrange all shapes into a clean top-to-bottom flow based on their arrows.',
    inputSchema: empty,
    annotations: { title: 'Auto layout', effect: 'The whole diagram rearranges into a tidy layout.' },
    isAvailable: () => nodeCount() > 0,
    handler: () => {
      layout();
      return { summary: 'Arranged the canvas.', data: { laidOut: true } };
    },
  },
  {
    name: 'set_title',
    description: 'Set the title of the canvas.',
    inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false },
    annotations: { title: 'Set title', effect: 'The canvas title changes.' },
    isAvailable: () => true,
    handler: (args: { title: string }) => {
      useCanvasMeta.getState().setTitle(args.title);
      return { summary: `Titled "${args.title}".`, data: { title: args.title } };
    },
  },
  {
    name: 'clear_canvas',
    description: 'Remove every shape and arrow to start from a blank canvas.',
    inputSchema: empty,
    annotations: { title: 'Clear canvas', effect: 'The canvas is emptied.' },
    isAvailable: () => nodeCount() > 0,
    handler: () => {
      clearCanvas();
      return { summary: 'Cleared the canvas.', data: { cleared: true } };
    },
  },
];

export const actionByName = new Map(boardActions.map((a) => [a.name, a]));
