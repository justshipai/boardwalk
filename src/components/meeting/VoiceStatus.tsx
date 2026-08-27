'use client';

export function VoiceStatus({ speaking }: { speaking: boolean }) {
  return (
    <div className="flex items-center gap-2" title="Voice connects in the next build; the demo runs in text rehearsal mode.">
      <span className="relative flex h-2 w-2">
        {speaking && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-material opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${speaking ? 'bg-material' : 'bg-text-faint'}`} />
      </span>
      <span className="text-xs text-text-muted">{speaking ? 'Board is responding' : 'Rehearsal mode'}</span>
    </div>
  );
}
