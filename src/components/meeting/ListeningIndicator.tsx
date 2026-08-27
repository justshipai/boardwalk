'use client';

import { useRealtimeContext } from '@/realtime/RealtimeContext';
import { personaBySeat } from '@/realtime/personas';

export function ListeningIndicator() {
  const { status, activeSpeaker } = useRealtimeContext();

  if (status !== 'connected') {
    return <span className="text-xs text-text-faint">{status === 'connecting' ? 'Connecting…' : 'Not started'}</span>;
  }

  const speaker = activeSpeaker ? personaBySeat.get(activeSpeaker) : null;

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${speaker ? 'bg-material' : 'bg-accepted'}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${speaker ? 'bg-material' : 'bg-accepted'}`} />
      </span>
      <span className="text-xs text-text-muted">{speaker ? `${speaker.name} is speaking` : 'Listening'}</span>
    </div>
  );
}
