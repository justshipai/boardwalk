import { clearCanvas, connectNodes, createNode, deleteNode, layout, nodeCount, readCanvas, updateNode } from '@/canvas/editor';
import { ACCENTS, SHAPE_KINDS, type AccentColor, type ShapeKind } from '@/canvas/types';
import { useCanvasMeta } from '@/canvas/stores';
import type { BoardAction } from './types';

const empty = { type: 'object' as const, properties: {}, additionalProperties: false };
const colorEnum = { type: 'string', enum: ACCENTS, description: 'neutral, blue, green, amber, red or purple.' };
const kindEnum = { type: 'string', enum: SHAPE_KINDS, description: 'rectangle, ellipse, diamond, note or text.' };
const shapeProperties = {
  label: { type: 'string', description: 'Optional text on the shape. Omit it for a pure visual container or icon.' },
  kind: kindEnum,
  color: colorEnum,
  filled: { type: 'boolean', description: 'Fill the shape with a light tint of its colour. Useful for media, selected controls, or emphasis.' },
  x: { type: 'number', description: 'Left position on the canvas (0 = far left, ~1400 = right).' },
  y: { type: 'number', description: 'Top position on the canvas (0 = top, ~900 = bottom).' },
  width: { type: 'number', description: 'Width in px.' },
  height: { type: 'number', description: 'Height in px.' },
};

export const boardActions: BoardAction[] = [
  {
    name: 'get_canvas',
    description: 'Read the canvas: the title, every shape (id, label, kind, colour) and the arrows connecting them.',
    inputSchema: empty,
    annotations: { title: 'Read canvas', readOnlyHint: true },
    isAvailable: () => true,
    handler: () => {
      const { nodes, edges, humanElements } = readCanvas();
      return {
        summary: `${nodes.length} structured shape(s), ${edges.length} connection(s), and ${humanElements.length} human-made element(s).`,
        data: { title: useCanvasMeta.getState().title, nodes, edges, humanElements },
      };
    },
  },
  {
    name: 'add_shape',
    description:
      'Add a shape with a label. Give x/y to place it and width/height to size it (mind maps, wireframes, screen layouts). Omit x/y to auto-place; omit width/height for the default box.',
    inputSchema: {
      type: 'object',
      properties: {
        ...shapeProperties,
      },
      required: ['label'],
      additionalProperties: false,
    },
    annotations: { title: 'Add shape', effect: 'A new shape appears on the canvas.' },
    isAvailable: () => true,
    handler: (args: { label: string; kind?: ShapeKind; color?: AccentColor; filled?: boolean; x?: number; y?: number; width?: number; height?: number }) => {
      const node = createNode({ label: args.label, kind: args.kind, color: args.color, filled: args.filled, x: args.x, y: args.y, w: args.width, h: args.height });
      if (!node) return { summary: 'Canvas not ready.', data: { added: false } };
      return { summary: `Added "${node.label}".`, data: { id: node.id, label: node.label } };
    },
  },
  {
    name: 'add_shapes',
    description:
      'Draw a coherent composition by adding several ordinary, editable shapes in one call. Use this for wireframes, screen layouts, and visual systems that need 8–30 deliberately positioned primitives. Every visible component must be its own shape: for a social home screen draw a device frame, separate story avatars, author row, media, controls, caption, and navigation icons—not four labelled regions. Use exact x/y/width/height values to keep related shapes nested and compact.',
    inputSchema: {
      type: 'object',
      properties: {
        shapes: {
          type: 'array',
          description: 'The independently editable primitives that make up the composition.',
          items: { type: 'object', properties: shapeProperties, additionalProperties: false },
        },
      },
      required: ['shapes'],
      additionalProperties: false,
    },
    annotations: { title: 'Draw composition', effect: 'Several independently editable shapes are drawn as one coherent composition.' },
    isAvailable: () => true,
    handler: (args: { shapes: Array<{ label?: string; kind?: ShapeKind; color?: AccentColor; filled?: boolean; x?: number; y?: number; width?: number; height?: number }> }) => {
      if (!Array.isArray(args.shapes) || args.shapes.length === 0) return { summary: 'Provide at least one shape to draw.', data: { added: 0 } };
      if (args.shapes.length > 36) return { summary: 'Draw at most 36 shapes in one composition.', data: { added: 0 } };
      const added = args.shapes
        .filter((shape) => shape && typeof shape === 'object')
        .map((shape) =>
          createNode({
            label: typeof shape.label === 'string' ? shape.label : '',
            kind: shape.kind,
            color: shape.color,
            filled: shape.filled,
            x: shape.x,
            y: shape.y,
            w: shape.width,
            h: shape.height,
          }),
        );
      return { summary: `Drew ${added.length} editable shape(s).`, data: { added: added.length, shapes: added } };
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
    description: 'Rename, recolour, fill or resize a shape. Target it by id or by its current label.',
    inputSchema: {
      type: 'object',
      properties: {
        shape: { type: 'string', description: 'Shape id or label.' },
        label: { type: 'string' },
        color: colorEnum,
        filled: { type: 'boolean', description: 'Whether the shape has a light tinted fill.' },
        width: { type: 'number', description: 'New width in px. Optional.' },
        height: { type: 'number', description: 'New height in px. Optional.' },
      },
      required: ['shape'],
      additionalProperties: false,
    },
    annotations: { title: 'Update shape', effect: 'A shape is renamed, recoloured or resized.' },
    isAvailable: () => nodeCount() > 0,
    handler: (args: { shape: string; label?: string; color?: AccentColor; filled?: boolean; width?: number; height?: number }) => {
      const updated = updateNode(args.shape, { label: args.label, color: args.color, filled: args.filled, w: args.width, h: args.height });
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
