'use client';

import { useState } from 'react';
import { useMeeting } from '@/state/meeting-store';

export function BottomBar({
  onPresent,
  onEnd,
  speaking,
  voiceLive,
}: {
  onPresent: (text: string) => void;
  onEnd: () => void;
  speaking: boolean;
  voiceLive: boolean;
}) {
  const slides = useMeeting((s) => s.slides);
  const currentSlideId = useMeeting((s) => s.currentSlideId);
  const interventions = useMeeting((s) => s.interventions);
  const goToSlide = useMeeting((s) => s.goToSlide);
  const transcript = useMeeting((s) => s.transcript);
  const lastBoardLine = [...transcript].reverse().find((t) => t.speaker === 'board');
  const [text, setText] = useState('');

  const index = slides.findIndex((s) => s.id === currentSlideId);
  const flaggedSlides = new Set(interventions.map((i) => i.slideId));

  const go = (delta: number) => {
    const next = slides[index + delta];
    if (next) goToSlide(next.id);
  };

  const submit = () => {
    const value = text.trim();
    onPresent(value || 'Presenting this slide.');
    setText('');
  };

  return (
    <div className="border-t border-border bg-panel/60 px-4 py-3">
      {lastBoardLine && (
        <p className="mb-2 truncate text-xs text-text-faint">
          <span className="text-text-muted">Board:</span> {lastBoardLine.text}
        </p>
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index <= 0}
            className="rounded-md border border-border px-2 py-1 text-xs text-text-muted transition hover:text-text disabled:opacity-40"
          >
            ←
          </button>
          <div className="flex items-center">
            {slides.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToSlide(s.id)}
                title={s.title}
                aria-label={s.title}
                className="group flex h-6 w-5 items-center justify-center"
              >
                <span
                  className={`h-2 w-2 rounded-full transition ${
                    s.id === currentSlideId
                      ? 'bg-text'
                      : flaggedSlides.has(s.id)
                        ? 'bg-critical'
                        : 'bg-border-strong group-hover:bg-text-faint'
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= slides.length - 1}
            className="rounded-md border border-border px-2 py-1 text-xs text-text-muted transition hover:text-text disabled:opacity-40"
          >
            →
          </button>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !speaking && submit()}
            placeholder={voiceLive ? 'Type to the board if you’d rather not speak…' : 'Present your point, or press enter to present the slide…'}
            className="flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-border-strong"
          />
          <button
            type="button"
            onClick={submit}
            disabled={speaking}
            className="rounded-lg bg-material px-3.5 py-2 text-sm font-semibold text-stage-ink transition hover:brightness-110 disabled:opacity-50"
          >
            Present
          </button>
        </div>

        <button
          type="button"
          onClick={onEnd}
          className="rounded-lg border border-border-strong px-3.5 py-2 text-sm font-medium text-text-muted transition hover:text-text"
        >
          End meeting
        </button>
      </div>
    </div>
  );
}
