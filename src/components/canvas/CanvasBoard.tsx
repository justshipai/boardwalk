'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvas } from '@/canvas/canvas-store';
import type { AccentColor, NodeKind } from '@/canvas/types';

const accent: Record<AccentColor, { border: string; bg: string; text: string }> = {
  neutral: { border: '#333842', bg: '#191c21', text: '#edeef1' },
  blue: { border: '#6ea8fe', bg: 'rgba(110,168,254,0.14)', text: '#cfe0ff' },
  green: { border: '#4bb389', bg: 'rgba(75,179,137,0.14)', text: '#bdead9' },
  amber: { border: '#d9a441', bg: 'rgba(217,164,65,0.16)', text: '#f0d9a6' },
  red: { border: '#e05a4d', bg: 'rgba(224,90,77,0.15)', text: '#f3c4bd' },
  purple: { border: '#b58cff', bg: 'rgba(181,140,255,0.14)', text: '#e0d0ff' },
};

interface NodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  color: AccentColor;
  acted: boolean;
}

function CanvasNodeView({ data }: NodeProps<Node<NodeData>>) {
  const c = accent[data.color];
  const pill = data.kind === 'start' || data.kind === 'end';
  const sticky = data.kind === 'sticky';
  return (
    <div
      className={`flex min-h-[56px] w-44 items-center justify-center px-3 py-2 text-center text-[13px] font-medium leading-snug shadow-lg transition ${
        data.acted ? 'ring-2 ring-offset-2 ring-offset-[#0b0c0e]' : ''
      }`}
      style={{
        borderRadius: pill ? 999 : sticky ? 4 : 10,
        border: `1.5px solid ${c.border}`,
        background: sticky ? '#d9a441' : c.bg,
        color: sticky ? '#16171a' : c.text,
        boxShadow: data.acted ? `0 0 0 3px ${c.border}55, 0 6px 20px rgba(0,0,0,0.4)` : undefined,
        // @ts-expect-error css var for ring color
        '--tw-ring-color': c.border,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: c.border, width: 8, height: 8 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: c.border, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { canvasNode: CanvasNodeView };

export function CanvasBoard() {
  const nodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);
  const actedIds = useCanvas((s) => s.actedIds);
  const moveNode = useCanvas((s) => s.moveNode);
  const deleteNode = useCanvas((s) => s.deleteNode);
  const deleteEdge = useCanvas((s) => s.deleteEdge);
  const connect = useCanvas((s) => s.connect);

  const rfNodes: Node<NodeData>[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: 'canvasNode',
        position: { x: n.x, y: n.y },
        data: { label: n.label, kind: n.kind, color: n.color, acted: actedIds.includes(n.id) },
      })),
    [nodes, actedIds],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: actedIds.includes(e.source) || actedIds.includes(e.target),
        style: { stroke: '#4a515c', strokeWidth: 1.5 },
        labelStyle: { fill: '#9aa1ac', fontSize: 11 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4a515c' },
      })),
    [edges, actedIds],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) moveNode(ch.id, Math.round(ch.position.x), Math.round(ch.position.y));
        else if (ch.type === 'remove') deleteNode(ch.id);
      }
    },
    [moveNode, deleteNode],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const ch of changes) if (ch.type === 'remove') deleteEdge(ch.id);
    },
    [deleteEdge],
  );

  const onConnect = useCallback((c: Connection) => c.source && c.target && connect(c.source, c.target), [connect]);

  // keep the AI's work in view: gently re-fit whenever nodes are added
  const rf = useRef<ReactFlowInstance<Node<NodeData>, Edge> | null>(null);
  const prevCount = useRef(0);
  useEffect(() => {
    if (nodes.length > prevCount.current) {
      const t = setTimeout(() => rf.current?.fitView({ padding: 0.25, duration: 500, maxZoom: 1 }), 250);
      prevCount.current = nodes.length;
      return () => clearTimeout(t);
    }
    prevCount.current = nodes.length;
  }, [nodes.length]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onInit={(instance) => (rf.current = instance)}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      proOptions={{ hideAttribution: true }}
      className="bg-bg"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#24272e" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
