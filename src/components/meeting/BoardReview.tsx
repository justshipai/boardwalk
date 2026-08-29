'use client';

import { useEffect, useRef, useState } from 'react';
import { useMeeting } from '@/state/meeting-store';
import { personaBySeat } from '@/realtime/personas';
import type { Commitment, Decision, Intervention } from '@/state/types';
import { kindLabel, seatLabel, severityStyle } from './display';

function ConcernCard({ concern }: { concern: Intervention }) {
  const setStatus = useMeeting((s) => s.setInterventionStatus);
  const goToSlide = useMeeting((s) => s.goToSlide);
  const focusMetric = useMeeting((s) => s.focusMetric);
  const focusClaim = useMeeting((s) => s.focusClaim);
  const style = severityStyle[concern.severity];
  const resolved = concern.status !== 'open';

  const reveal = () => {
    if (concern.slideId) goToSlide(concern.slideId);
    if (concern.metricId) focusMetric(concern.metricId);
    if (concern.claimId) focusClaim(concern.claimId);
  };

  return (
    <div
      className={`card-in rounded-lg border border-l-[3px] border-border bg-panel p-4 ${resolved ? 'opacity-55' : ''}`}
      style={{ borderLeftColor: `var(--${concern.severity})` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text">{kindLabel[concern.kind]}</span>
          <span className="text-text-faint">·</span>
          <span className="text-xs text-text-muted">{personaBySeat.get(concern.seat)?.name ?? seatLabel[concern.seat]}</span>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.text}`}>{concern.severity}</span>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-text">{concern.statement}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">{concern.whyItMatters}</p>
      <div className="mt-3.5 flex items-center gap-4">
        {concern.slideId && (
          <button type="button" onClick={reveal} className="text-xs font-medium text-brand hover:underline">
            Show evidence
          </button>
        )}
        {resolved ? (
          <span className="text-xs text-text-faint">Marked {concern.status}</span>
        ) : (
          <>
            {concern.kind === 'question' && (
              <button type="button" onClick={() => setStatus(concern.id, 'answered')} className="text-xs font-medium text-text-muted hover:text-text">
                Mark answered
              </button>
            )}
            <button type="button" onClick={() => setStatus(concern.id, 'parked')} className="text-xs font-medium text-text-muted hover:text-text">
              Park
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DecisionCard({ decision }: { decision: Decision }) {
  const update = useMeeting((s) => s.updateDecision);
  const resolved = decision.status === 'accepted';

  return (
    <div className="card-in rounded-lg border border-material/40 bg-material-soft/25 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-material">Decision to resolve</span>
        {resolved && <span className="text-[10px] font-medium text-accepted">Recorded</span>}
      </div>
      <p className="mt-2.5 text-sm font-medium leading-relaxed text-text">{decision.question}</p>
      {decision.recommended && !resolved && (
        <p className="mt-2 text-xs text-text-muted">
          Board leans toward <span className="font-medium text-material">{decision.recommended}</span>
        </p>
      )}
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-text-faint">
        {resolved ? 'Recorded' : 'Record the outcome'}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {decision.options.map((opt) => {
          const chosen = decision.chosen === opt;
          const leaning = !resolved && decision.recommended === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => update(decision.id, { chosen: opt, status: 'accepted' })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                chosen
                  ? 'border-accepted bg-accepted-soft text-accepted'
                  : leaning
                    ? 'border-material text-material hover:bg-material-soft'
                    : 'border-border-strong text-text-muted hover:text-text'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const commitmentChip: Record<string, string> = {
  open: 'bg-watch-soft text-watch',
  accepted: 'bg-accepted-soft text-accepted',
  rejected: 'bg-critical-soft text-critical',
  parked: 'bg-watch-soft text-watch',
  answered: 'bg-accepted-soft text-accepted',
};

function CommitmentCard({ commitment }: { commitment: Commitment }) {
  const update = useMeeting((s) => s.updateCommitment);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(commitment.action);
  const isProposal = commitment.source === 'proposed';
  const decided = commitment.status === 'accepted' || commitment.status === 'rejected';

  return (
    <div className="card-in rounded-lg border border-border bg-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-faint">{isProposal ? 'Proposed' : 'From last meeting'}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${commitmentChip[commitment.status]}`}>{commitment.status}</span>
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="mt-2.5 w-full resize-none rounded-md border border-border-strong bg-panel-2 p-2 text-sm text-text outline-none focus:border-material"
        />
      ) : (
        <p className="mt-2.5 text-sm leading-relaxed text-text">{commitment.action}</p>
      )}
      <p className="mt-2 text-xs text-text-muted">{commitment.owner} · {commitment.dueDate}</p>
      {isProposal && !decided && (
        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (editing) update(commitment.id, { action: draft });
              update(commitment.id, { status: 'accepted' });
              setEditing(false);
            }}
            className="rounded-md bg-accepted px-3 py-1.5 text-xs font-medium text-stage-ink transition hover:brightness-110"
          >
            Accept
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted transition hover:text-text">
            {editing ? 'Done' : 'Edit'}
          </button>
          <button type="button" onClick={() => update(commitment.id, { status: 'rejected' })} className="text-xs font-medium text-text-muted transition hover:text-critical">
            Reject
          </button>
          <button type="button" onClick={() => update(commitment.id, { status: 'parked' })} className="ml-auto text-xs font-medium text-text-faint transition hover:text-text">
            Park
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">{title}</h3>
        <span className="rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-text-faint">{count}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function BoardReview() {
  const interventions = useMeeting((s) => s.interventions);
  const decisions = useMeeting((s) => s.decisions);
  const commitments = useMeeting((s) => s.commitments);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevConcerns = useRef(interventions.length);

  // newest first, so the latest concern is always at the top of the list
  const concerns = [...interventions].sort((a, b) => b.createdAt - a.createdAt);
  const isEmpty = interventions.length === 0 && decisions.length === 0 && commitments.length === 0;

  // auto-scroll to the newest concern so it is never missed
  useEffect(() => {
    if (interventions.length > prevConcerns.current) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevConcerns.current = interventions.length;
  }, [interventions.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Board review</h2>
        <span className="text-xs text-text-faint">
          {concerns.length} concern{concerns.length === 1 ? '' : 's'} · {decisions.length} decision{decisions.length === 1 ? '' : 's'}
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
        {isEmpty ? (
          <p className="px-1 py-10 text-sm leading-relaxed text-text-muted">
            As the board reviews your update, its concerns, decisions and commitments assemble here — whether you drive it by voice or an agent drives it through the site tools.
          </p>
        ) : (
          <>
            {concerns.length > 0 && (
              <Section title="Concerns" count={concerns.length}>
                {concerns.map((c) => (
                  <ConcernCard key={c.id} concern={c} />
                ))}
              </Section>
            )}
            {decisions.length > 0 && (
              <Section title="Decisions" count={decisions.length}>
                {decisions.map((d) => (
                  <DecisionCard key={d.id} decision={d} />
                ))}
              </Section>
            )}
            {commitments.length > 0 && (
              <Section title="Commitments" count={commitments.length}>
                {commitments.map((c) => (
                  <CommitmentCard key={c.id} commitment={c} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
