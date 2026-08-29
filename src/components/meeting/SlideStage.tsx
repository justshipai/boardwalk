'use client';

import { currentSlide, useMeeting } from '@/state/meeting-store';
import type { Claim, Intervention, Metric, Region, Severity, Slide } from '@/state/types';

const severityStyle: Record<Severity, { border: string; fill: string }> = {
  watch: { border: 'var(--watch)', fill: 'rgba(111, 117, 128, 0.16)' },
  material: { border: 'var(--material)', fill: 'rgba(217, 164, 65, 0.18)' },
  critical: { border: 'var(--critical)', fill: 'rgba(224, 90, 77, 0.2)' },
};

function claimsFor(slide: Slide): Claim[] {
  return slide.claims?.length ? slide.claims : slide.bullets.map((text, index) => ({ id: `${slide.id}-b${index}`, text }));
}

function strongest(interventions: Intervention[]) {
  return [...interventions].sort((a, b) => ({ watch: 0, material: 1, critical: 2 })[b.severity] - ({ watch: 0, material: 1, critical: 2 })[a.severity])[0];
}

function BoardNote({ intervention }: { intervention: Intervention }) {
  return (
    <div className="mt-1.5 max-w-[19rem] rounded-md border border-black/10 bg-white/95 px-2.5 py-2 text-left shadow-md">
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/45">Board note</span>
      <p className="mt-0.5 text-[11px] font-medium leading-snug text-stage-ink">{intervention.statement}</p>
    </div>
  );
}

function PdfEvidenceLayer({ slide, interventions, focusedClaimId }: { slide: Slide; interventions: Intervention[]; focusedClaimId: string | null }) {
  const marks = claimsFor(slide).reduce<{ claim: { id: string; text: string; region: Region }; intervention: Intervention }[]>((result, claim) => {
    const intervention = strongest(interventions.filter((item) => item.claimId === claim.id));
    if (claim.region && intervention) result.push({ claim: { ...claim, region: claim.region }, intervention });
    return result;
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {marks.map(({ claim, intervention }) => {
        const region = claim.region;
        const focused = focusedClaimId === claim.id;
        const style = severityStyle[intervention.severity];
        return (
          <div key={claim.id} className="absolute" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.w * 100}%` }}>
            <div
              className={focused ? 'evidence-claim-focus rounded-sm' : 'rounded-sm'}
              style={{ height: 'clamp(8px, 1.75vw, 16px)', background: style.fill, boxShadow: `inset 0 -2px 0 ${style.border}` }}
            />
            {focused && <BoardNote intervention={intervention} />}
          </div>
        );
      })}
    </div>
  );
}

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

export function SlideStage() {
  const slide = useMeeting(currentSlide);
  const focusedMetricId = useMeeting((s) => s.focusedMetricId);
  const focusedClaimId = useMeeting((s) => s.focusedClaimId);
  const interventions = useMeeting((s) => s.interventions);

  if (!slide) return <div className="flex flex-1 items-center justify-center text-text-faint">Loading deck…</div>;

  const flaggedMetricIds = new Set(interventions.filter((i) => i.metricId).map((i) => i.metricId));
  const slideFlagged = interventions.some((i) => i.slideId === slide.id && (i.kind === 'flag' || i.kind === 'question'));
  const slideInterventions = interventions.filter((i) => i.slideId === slide.id);

  return (
    <div className="flex flex-1 flex-col">
      <div className={`relative flex-1 overflow-auto rounded-xl bg-stage text-stage-ink shadow-2xl ${slide.imageDataUrl ? 'p-3' : 'p-8'}`}>
        <div className={`flex items-center justify-between ${slide.imageDataUrl ? 'mb-3 px-1' : 'mb-6'}`}>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-black/40">Slide {slide.index + 1}</span>
          {slideFlagged && (
            <span className="rounded-full bg-critical-soft px-2.5 py-0.5 text-xs font-medium text-critical">Under question</span>
          )}
        </div>

        {slide.imageDataUrl ? (
          <div className="relative mx-auto w-full max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.imageDataUrl} alt={slide.title} className="block w-full rounded-md" />
            <PdfEvidenceLayer slide={slide} interventions={slideInterventions} focusedClaimId={focusedClaimId} />
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-semibold tracking-tight">{slide.title}</h2>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-black/70">{slide.narrative}</p>

            <ul className="mt-6 space-y-2">
              {slide.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[15px] text-black/75">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-black/40" />
                  {(() => {
                    const claim = claimsFor(slide).find((item) => item.text === b);
                    const intervention = claim ? strongest(slideInterventions.filter((item) => item.claimId === claim.id)) : undefined;
                    const focused = claim?.id === focusedClaimId;
                    const style = intervention ? severityStyle[intervention.severity] : undefined;
                    return (
                      <div
                        data-claim={claim?.id}
                        className={focused ? 'evidence-claim-focus rounded-sm' : 'rounded-sm'}
                        style={style ? { background: style.fill, boxShadow: `inset 0 -2px 0 ${style.border}` } : undefined}
                      >
                        {b}
                        {focused && intervention && <BoardNote intervention={intervention} />}
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>

            {slide.metrics.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slide.metrics.map((m) => (
                  <MetricCard key={m.id} metric={m} focused={focusedMetricId === m.id} flagged={flaggedMetricIds.has(m.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
