'use client';

import { useRealtimeContext } from '@/realtime/RealtimeContext';

export function ListeningIndicator() {
  const { status, boardSpeaking } = useRealtimeContext();

  if (status !== 'connected') {
    return <span className="text-xs text-text-faint">{status === 'connecting' ? 'Connecting…' : 'Not started'}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
            boardSpeaking ? 'bg-material' : 'bg-accepted'
          }`}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${boardSpeaking ? 'bg-material' : 'bg-accepted'}`} />
      </span>
      <span className="text-xs text-text-muted">{boardSpeaking ? 'Board speaking' : 'Listening'}</span>
    </div>
  );
}
