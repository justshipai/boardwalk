'use client';

import { useRealtimeContext } from '@/realtime/RealtimeContext';

export function VoiceControl({ speaking }: { speaking: boolean }) {
  const { status, error, muted, connect, disconnect, toggleMute } = useRealtimeContext();

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-accepted">
          <span className="h-2 w-2 rounded-full bg-accepted" />
          Voice live
        </span>
        <button
          type="button"
          onClick={toggleMute}
          className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-medium text-text-muted transition hover:text-text"
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          onClick={disconnect}
          className="text-xs font-medium text-text-faint transition hover:text-critical"
        >
          End voice
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2" title={error ?? ''}>
        <span className="max-w-[220px] truncate text-xs text-text-muted">{error ?? 'Voice unavailable'}</span>
        <span className="text-xs text-text-faint">— continue in text</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2" title="The board speaks when you present a slide.">
        <span className="relative flex h-2 w-2">
          {speaking && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-material opacity-60" />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${speaking ? 'bg-material' : 'bg-text-faint'}`} />
        </span>
        <span className="text-xs text-text-muted">{speaking ? 'Board is responding' : 'Rehearsal mode'}</span>
      </div>
      <button
        type="button"
        onClick={connect}
        disabled={status === 'connecting'}
        className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-medium text-text-muted transition hover:text-text disabled:opacity-50"
      >
        {status === 'connecting' ? 'Connecting…' : 'Start voice'}
      </button>
    </div>
  );
}
