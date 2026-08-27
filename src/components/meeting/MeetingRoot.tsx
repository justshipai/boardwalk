'use client';

import { useEffect, useRef } from 'react';
import { buildReadout } from '@/actions/readout';
import { executeAction } from '@/actions/registry';
import { startWebMcpSync } from '@/actions/webmcp';
import { useDirector } from '@/director/useDirector';
import { RealtimeProvider } from '@/realtime/RealtimeContext';
import { useMeeting } from '@/state/meeting-store';
import { consumePendingDeck } from '@/features/upload/pending-deck';
import { Readout } from '@/components/readout/Readout';
import { BoardSeats } from './BoardSeats';
import { CommitmentsDrawer } from './CommitmentsDrawer';
import { InterventionRail } from './InterventionRail';
import { ListeningIndicator } from './ListeningIndicator';
import { MeetingControlBar } from './MeetingControlBar';
import { MeetingPhaseBar } from './MeetingPhaseBar';
import { SlideStage } from './SlideStage';
import { ToolActivityFeed } from './ToolActivityFeed';

function MeetingBody() {
  const started = useRef(false);
  const director = useDirector();
  const phase = useMeeting((s) => s.phase);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const store = useMeeting.getState();
    store.reset();
    const pending = consumePendingDeck();
    if (pending) store.loadDeck(pending.company, pending.slides);
    else store.loadDemoDeck();
    store.startMeeting();
    const stop = startWebMcpSync();
    return () => {
      stop();
      started.current = false;
    };
  }, []);

  const endMeeting = () => {
    const outcome = executeAction('generate_board_readout', {});
    if (!outcome.ok) useMeeting.getState().setReadout(buildReadout(useMeeting.getState()));
  };

  const backToMeeting = () => useMeeting.getState().setPhase('close');

  if (phase === 'readout') return <Readout onBack={backToMeeting} />;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <BoardSeats speakingSeat={director.speakingSeat} />
        <MeetingPhaseBar phase={phase} />
        <ListeningIndicator />
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <SlideStage />
        </div>

        <aside className="flex w-[360px] shrink-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-panel/40 p-3">
            <div className="flex min-h-0 flex-1 flex-col">
              <InterventionRail />
            </div>
            <div className="flex min-h-0 flex-[0.9] flex-col">
              <CommitmentsDrawer />
            </div>
          </div>
          <ToolActivityFeed />
        </aside>
      </div>

      <MeetingControlBar onEnd={endMeeting} onPresentFallback={director.present} />
    </div>
  );
}

export function MeetingRoot() {
  return (
    <RealtimeProvider>
      <MeetingBody />
    </RealtimeProvider>
  );
}
