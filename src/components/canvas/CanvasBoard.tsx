'use client';

import { useEffect } from 'react';
import { Tldraw, type Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { setEditor } from '@/canvas/editor';
import { useAiCursor } from '@/canvas/stores';

function AiCursor() {
  const { x, y, visible } = useAiCursor();
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[400] transition-transform duration-500 ease-out"
      style={{ transform: `translate(${x}px, ${y}px)`, opacity: visible ? 1 : 0 }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow">
        <path d="M2 2 L2 15 L6 11 L9 17 L11 16 L8 10 L14 10 Z" fill="#6ea8fe" stroke="#0b0c0e" strokeWidth="1" />
      </svg>
      <span className="ml-3 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-stage-ink shadow">AI</span>
    </div>
  );
}

export function CanvasBoard() {
  useEffect(() => () => setEditor(null), []);
  return (
    <div className="relative h-full w-full">
      <Tldraw
        onMount={(editor: Editor) => {
          setEditor(editor);
          editor.user.updateUserPreferences({ colorScheme: 'dark' });
        }}
      />
      <AiCursor />
    </div>
  );
}
