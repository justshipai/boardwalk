'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useRealtime } from './useRealtime';

type RealtimeValue = ReturnType<typeof useRealtime>;

const RealtimeContext = createContext<RealtimeValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const realtime = useRealtime();
  return <RealtimeContext.Provider value={realtime}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext(): RealtimeValue {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error('useRealtimeContext must be used within RealtimeProvider');
  return value;
}
