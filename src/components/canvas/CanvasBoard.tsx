'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import '@excalidraw/excalidraw/index.css';
import { setEditor } from '@/canvas/editor';

const Excalidraw = dynamic(() => import('@excalidraw/excalidraw').then((m) => m.Excalidraw), { ssr: false });

export function CanvasBoard() {
  useEffect(() => () => setEditor(null), []);
  return (
    <div className="h-full w-full">
      <Excalidraw
        theme="dark"
        excalidrawAPI={(api) => setEditor(api)}
        initialData={{ appState: { viewBackgroundColor: '#0b0c0e' } }}
      />
    </div>
  );
}
