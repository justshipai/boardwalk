import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-material" />
          <span className="text-sm font-semibold tracking-tight">Boardwalk</span>
        </div>
        <span className="text-xs text-text-faint">Board rehearsal, powered by WebMCP</span>
      </header>

      <section className="flex flex-1 flex-col justify-center px-8 pb-24">
        <div className="mx-auto w-full max-w-3xl">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-text-faint">
            For founders before the real meeting
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            The board meeting before the board meeting.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
            Present your update to an AI board that challenges the numbers, questions the story and remembers what you
            promised last time.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/meeting"
              className="rounded-lg bg-material px-6 py-3.5 text-base font-semibold text-stage-ink transition hover:brightness-110"
            >
              Try the demo
            </Link>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled
                className="w-fit cursor-not-allowed rounded-lg border border-border px-5 py-3 text-base font-medium text-text-faint"
              >
                Upload a board deck
              </button>
              <span className="text-xs text-text-faint">Upload arrives with the voice build — the demo needs no setup.</span>
            </div>
          </div>

          <p className="mt-12 max-w-xl text-sm leading-relaxed text-text-faint">
            The demo runs a fictional company, Northstar. Nothing is uploaded or stored. You present; the board pushes
            back on screen.
          </p>
        </div>
      </section>
    </main>
  );
}
