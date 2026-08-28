import { create } from 'zustand';

// screen-space position of the AI's cursor, so collaboration is visible (glides between actions)
interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  show: (x: number, y: number) => void;
  hide: () => void;
}

export const useAiCursor = create<CursorState>((set) => ({
  x: 0,
  y: 0,
  visible: false,
  show: (x, y) => set({ x, y, visible: true }),
  hide: () => set({ visible: false }),
}));

interface MetaState {
  title: string;
  shapeCount: number;
  setTitle: (title: string) => void;
  setShapeCount: (n: number) => void;
}

export const useCanvasMeta = create<MetaState>((set) => ({
  title: 'Untitled canvas',
  shapeCount: 0,
  setTitle: (title) => set({ title }),
  setShapeCount: (shapeCount) => set({ shapeCount }),
}));
