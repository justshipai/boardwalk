'use client';

import { useState } from 'react';
import { useMeeting } from '@/state/meeting-store';
import type { Commitment, Decision } from '@/state/types';

const statusChip: Record<string, string> = {
  open: 'bg-watch-soft text-watch',
  accepted: 'bg-accepted-soft text-accepted',
  rejected: 'bg-critical-soft text-critical',
  parked: 'bg-watch-soft text-watch',
  answered: 'bg-accepted-soft text-accepted',
};

function CommitmentRow({ commitment }: { commitment: Commitment }) {
  const update = useMeeting((s) => s.updateCommitment);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(commitment.action);
  const isProposal = commitment.source === 'proposed';
  const decided = commitment.status === 'accepted' || commitment.status === 'rejected';

  return (
    <div className="card-in rounded-lg border border-border bg-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-faint">
          {isProposal ? 'Proposed' : 'From last meeting'}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusChip[commitment.status]}`}>
          {commitment.status}
        </span>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-md border border-border-strong bg-panel-2 p-2 text-sm text-text outline-none focus:border-material"
        />
      ) : (
        <p className="mt-2 text-sm leading-snug text-text">{commitment.action}</p>
      )}
      <p className="mt-1.5 text-xs text-text-muted">
        {commitment.owner} · {commitment.dueDate}
      </p>

      {isProposal && !decided && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (editing) update(commitment.id, { action: draft });
              update(commitment.id, { status: 'accepted' });
              setEditing(false);
            }}
            className="rounded-md bg-accepted px-2.5 py-1 text-xs font-medium text-stage-ink transition hover:brightness-110"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-medium text-text-muted transition hover:text-text"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={() => update(commitment.id, { status: 'rejected' })}
            className="text-xs font-medium text-text-muted transition hover:text-critical"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => update(commitment.id, { status: 'parked' })}
            className="ml-auto text-xs font-medium text-text-faint transition hover:text-text"
          >
            Park
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionRow({ decision }: { decision: Decision }) {
  const update = useMeeting((s) => s.updateDecision);
  const resolved = decision.status === 'accepted';

  return (
    <div className="card-in rounded-lg border border-material/40 bg-material-soft/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-material">Decision needed</span>
        {resolved && <span className="text-[10px] font-medium text-accepted">Recorded</span>}
      </div>
      <p className="mt-2 text-sm leading-snug text-text">{decision.question}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {decision.options.map((opt) => {
          const chosen = decision.chosen === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => update(decision.id, { chosen: opt, status: 'accepted' })}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                chosen ? 'border-accepted bg-accepted-soft text-accepted' : 'border-border-strong text-text-muted hover:text-text'
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

export function CommitmentsDrawer() {
  const commitments = useMeeting((s) => s.commitments);
  const decisions = useMeeting((s) => s.decisions);
  const isEmpty = commitments.length === 0 && decisions.length === 0;

  return (
    <div className="flex min-h-0 flex-col border-t border-border pt-3">
      <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Decisions & commitments
      </h3>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-auto pr-1">
        {isEmpty ? (
          <p className="px-1 py-4 text-sm text-text-faint">Prior commitments and anything the board proposes appear here.</p>
        ) : (
          <>
            {decisions.map((d) => (
              <DecisionRow key={d.id} decision={d} />
            ))}
            {commitments.map((c) => (
              <CommitmentRow key={c.id} commitment={c} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
