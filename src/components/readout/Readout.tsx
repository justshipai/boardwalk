'use client';

import { useMeeting } from '@/state/meeting-store';

function Section({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-text-faint">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-text">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-text-faint" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Readout({ onBack }: { onBack: () => void }) {
  const readout = useMeeting((s) => s.readout);
  const company = useMeeting((s) => s.company);
  if (!readout) return null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-faint">Board readout</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{company.name}</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border-strong px-3.5 py-2 text-sm font-medium text-text-muted transition hover:text-text"
        >
          Back to meeting
        </button>
      </div>

      <div className="rounded-xl border border-material/40 bg-material-soft/30 p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-material">60-second opening</h3>
        <p className="text-[15px] leading-relaxed text-text">{readout.openingRecommendation}</p>
      </div>

      <div className="mt-8 grid gap-8">
        <Section
          title="Most likely board questions"
          items={readout.likelyQuestions}
          empty="No questions were raised this session."
        />
        <Section
          title="Weakest assumptions"
          items={readout.weakestAssumptions}
          empty="No assumptions were flagged."
        />
        <Section
          title="Contradictions & unresolved commitments"
          items={readout.contradictions}
          empty="Nothing contradictory surfaced."
        />
        <Section
          title="Decisions still required"
          items={readout.decisionsRequired}
          empty="All decisions were resolved."
        />
        <Section
          title="Accepted commitments"
          items={readout.acceptedCommitments}
          empty="No commitments were accepted."
        />
      </div>

      <p className="mt-10 text-xs leading-relaxed text-text-faint">
        This readout reflects what the board raised and what you resolved. It is a preparation aid, not a score.
      </p>
    </div>
  );
}
