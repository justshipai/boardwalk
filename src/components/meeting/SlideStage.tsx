'use client';

import { useState } from 'react';
import { currentSlide, useMeeting } from '@/state/meeting-store';
import type { Metric } from '@/state/types';

function Sparkline({ metric, flagged }: { metric: Metric; flagged: boolean }) {
  const values = metric.history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 96;
  const h = 28;
  const points = metric.history
    .map((p, i) => {
      const x = (i / (metric.history.length - 1)) * w;
      const y = h - ((p.value - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = flagged ? 'var(--critical)' : metric.trend === 'down' ? 'var(--critical)' : 'var(--stage-ink)';
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MetricCard({ metric, focused, flagged }: { metric: Metric; focused: boolean; flagged: boolean }) {
  return (
    <div
      data-metric={metric.id}
      className={`rounded-lg border bg-white/60 p-3 transition ${
        focused ? 'evidence-pulse border-material' : flagged ? 'border-critical/60' : 'border-black/10'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-black/55">{metric.label}</span>
        {flagged && <span className="text-[10px] font-semibold uppercase tracking-wide text-critical">flagged</span>}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums text-stage-ink">
          {metric.current}
          {metric.unit && <span className="ml-0.5 text-base font-medium text-black/45">{metric.unit}</span>}
        </span>
        <Sparkline metric={metric} flagged={flagged} />
      </div>
    </div>
  );
}

export function SlideStage({
  onPresent,
  speaking,
  hasScript,
}: {
  onPresent: () => void;
  speaking: boolean;
  hasScript: boolean;
}) {
  const slide = useMeeting(currentSlide);
  const focusedMetricId = useMeeting((s) => s.focusedMetricId);
  const interventions = useMeeting((s) => s.interventions);
  const [presented, setPresented] = useState<Set<string>>(new Set());

  if (!slide) return <div className="flex flex-1 items-center justify-center text-text-faint">Loading deck…</div>;

  const flaggedMetricIds = new Set(interventions.filter((i) => i.metricId).map((i) => i.metricId));
  const slideFlagged = interventions.some((i) => i.slideId === slide.id && (i.kind === 'flag' || i.kind === 'question'));
  const alreadyPresented = presented.has(slide.id);

  const present = () => {
    setPresented((prev) => new Set(prev).add(slide.id));
    onPresent();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex-1 overflow-auto rounded-xl bg-stage p-8 text-stage-ink shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">
            Slide {slide.index + 1}
          </span>
          {slideFlagged && (
            <span className="rounded-full bg-critical-soft px-2.5 py-0.5 text-xs font-medium text-critical">
              Under question
            </span>
          )}
        </div>

        <h2 className="text-3xl font-semibold tracking-tight">{slide.title}</h2>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-black/70">{slide.narrative}</p>

        <ul className="mt-6 space-y-2">
          {slide.bullets.map((b) => (
            <li key={b} className="flex gap-2.5 text-[15px] text-black/75">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-black/40" />
              {b}
            </li>
          ))}
        </ul>

        {slide.metrics.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slide.metrics.map((m) => (
              <MetricCard
                key={m.id}
                metric={m}
                focused={focusedMetricId === m.id}
                flagged={flaggedMetricIds.has(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-text-faint">
          {hasScript
            ? 'Present this slide to hear the board respond.'
            : 'The board is listening — no material issue on this slide.'}
        </p>
        <button
          type="button"
          onClick={present}
          disabled={speaking}
          className="rounded-lg bg-panel-2 px-4 py-2 text-sm font-medium text-text ring-1 ring-border-strong transition hover:bg-border disabled:opacity-50"
        >
          {speaking ? 'Board is responding…' : alreadyPresented ? 'Present again' : 'Present this slide'}
        </button>
      </div>
    </div>
  );
}
