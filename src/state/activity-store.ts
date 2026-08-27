import { create } from 'zustand';

export type ActivityKind = 'register' | 'unregister' | 'invoke';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  tool: string;
  detail?: string;
  at: number;
}

interface ActivityState {
  entries: ActivityEntry[];
  registered: string[];
  log: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
  setRegistered: (tools: string[]) => void;
}

let seq = 0;

export const useActivity = create<ActivityState>((set) => ({
  entries: [],
  registered: [],
  log: (entry) =>
    set((s) => ({
      entries: [
        { ...entry, id: `act-${Date.now().toString(36)}-${(seq++).toString(36)}`, at: Date.now() },
        ...s.entries,
      ].slice(0, 100),
    })),
  setRegistered: (tools) => set({ registered: tools }),
}));
