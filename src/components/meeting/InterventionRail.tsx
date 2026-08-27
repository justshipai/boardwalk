'use client';

import { useMeeting } from '@/state/meeting-store';
import type { Intervention } from '@/state/types';
import { kindLabel, seatLabel, severityStyle } from './display';

const railKinds = new Set(['question', 'flag', 'drilldown']);

function statusLabel(status: Intervention['status']) {
  if (status === 'open') return null;
  return status;
}

function InterventionCard({ intervention }: { intervention: Intervention }) {
  const setStatus = useMeeting((s) => s.setInterventionStatus);
  const goToSlide = useMeeting((s) => s.goToSlide);
  const focusMetric = useMeeting((s) => s.focusMetric);
  const style = severityStyle[intervention.severity];
  const label = statusLabel(intervention.status);

  const reveal = () => {
    if (intervention.slideId) goToSlide(intervention.slideId);
    if (intervention.metricId) focusMetric(intervention.metricId);
  };

  return (
    <div className={`card-in rounded-lg border border-border bg-panel p-3.5 ${intervention.status === 'parked' ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          <span className="text-xs font-medium text-text-muted">{kindLabel[intervention.kind]}</span>
          <span className="text-text-faint">·</span>
          <span className="text-xs text-text-faint">{seatLabel[intervention.seat]}</span>
        </div>
        <span className={`text-[10px] font-medium uppercase tracking-wide ${style.text}`}>{intervention.severity}</span>
      </div>

      <p className="mt-2 text-sm leading-snug text-text">{intervention.statement}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{intervention.whyItMatters}</p>

      <div className="mt-3 flex items-center gap-3">
        {intervention.slideId && (
          <button type="button" onClick={reveal} className="text-xs font-medium text-brand hover:underline">
            Show evidence
          </button>
        )}
        {label ? (
          <span className="text-xs text-text-faint">Marked {label}</span>
        ) : (
          <div className="flex items-center gap-3">
            {intervention.kind === 'question' && (
              <button
                type="button"
                onClick={() => setStatus(intervention.id, 'answered')}
                className="text-xs font-medium text-text-muted hover:text-text"
              >
                Mark answered
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatus(intervention.id, 'parked')}
              className="text-xs font-medium text-text-muted hover:text-text"
            >
              Park
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function InterventionRail() {
  const all = useMeeting((s) => s.interventions);
  const interventions = all.filter((i) => railKinds.has(i.kind));

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Interventions</h3>
        <span className="text-xs text-text-faint">{interventions.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-auto pr-1">
        {interventions.length === 0 ? (
          <p className="px-1 py-6 text-sm text-text-faint">
            Nothing raised yet. Present a slide and the board will push back on anything material.
          </p>
        ) : (
          [...interventions].reverse().map((i) => <InterventionCard key={i.id} intervention={i} />)
        )}
      </div>
    </div>
  );
}
