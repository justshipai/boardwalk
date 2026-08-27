'use client';

import { useState } from 'react';
import { useRealtimeContext } from '@/realtime/RealtimeContext';
import { useMeeting } from '@/state/meeting-store';

function SlideNav() {
  const slides = useMeeting((s) => s.slides);
  const currentSlideId = useMeeting((s) => s.currentSlideId);
  const goToSlide = useMeeting((s) => s.goToSlide);
  const index = slides.findIndex((s) => s.id === currentSlideId);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => slides[index - 1] && goToSlide(slides[index - 1].id)}
        disabled={index <= 0}
        className="rounded-md border border-border px-2 py-1 text-xs text-text-muted transition hover:text-text disabled:opacity-40"
      >
        ←
      </button>
      <span className="text-xs tabular-nums text-text-faint">
        {index + 1} / {slides.length}
      </span>
      <button
        type="button"
        onClick={() => slides[index + 1] && goToSlide(slides[index + 1].id)}
        disabled={index >= slides.length - 1}
        className="rounded-md border border-border px-2 py-1 text-xs text-text-muted transition hover:text-text disabled:opacity-40"
      >
        →
      </button>
    </div>
  );
}

export function MeetingControlBar({
  onEnd,
  onPresentFallback,
}: {
  onEnd: () => void;
  onPresentFallback: (text: string) => void;
}) {
  const { status, error, muted, boardSpeaking, connect, toggleMute } = useRealtimeContext();
  const [text, setText] = useState('');

  const submitFallback = () => {
    const value = text.trim();
    if (!value) return;
    onPresentFallback(value);
    setText('');
  };

  return (
    <div className="border-t border-border bg-panel/60 px-4 py-3">
      {status === 'idle' && (
        <div className="flex flex-col items-center gap-2 py-1">
          <button
            type="button"
            onClick={connect}
            className="rounded-lg bg-material px-6 py-3 text-base font-semibold text-stage-ink transition hover:brightness-110"
          >
            Start the meeting
          </button>
          <p className="text-sm text-text-muted">Allow your microphone, then present your update. The board interrupts when it matters.</p>
        </div>
      )}

      {status === 'connecting' && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-text-muted">
          <span className="h-2 w-2 animate-ping rounded-full bg-material" />
          Connecting to the board…
        </div>
      )}

      {status === 'connected' && (
        <div className="flex items-center gap-4">
          <SlideNav />
          <div className="flex flex-1 items-center justify-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${
                  boardSpeaking ? 'animate-ping bg-material' : 'animate-ping bg-accepted'
                }`}
              />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${boardSpeaking ? 'bg-material' : 'bg-accepted'}`} />
            </span>
            <span className="text-sm text-text-muted">
              {boardSpeaking ? 'The board is speaking' : 'Listening — present your update'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-md border border-border-strong px-2.5 py-1.5 text-xs font-medium text-text-muted transition hover:text-text"
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              type="button"
              onClick={onEnd}
              className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-text-muted transition hover:text-text"
            >
              End meeting
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">
            {error ?? 'Voice is unavailable.'} You can still present the board by typing.
          </p>
          <div className="flex items-center gap-3">
            <SlideNav />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitFallback()}
              placeholder="Type your update to the board…"
              className="flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-border-strong"
            />
            <button
              type="button"
              onClick={submitFallback}
              className="rounded-lg bg-material px-3.5 py-2 text-sm font-semibold text-stage-ink transition hover:brightness-110"
            >
              Present
            </button>
            <button
              type="button"
              onClick={onEnd}
              className="rounded-md border border-border-strong px-3 py-2 text-sm font-medium text-text-muted transition hover:text-text"
            >
              End
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
