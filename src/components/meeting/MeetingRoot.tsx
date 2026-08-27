'use client';

import { useEffect, useRef } from 'react';
import { buildReadout } from '@/actions/readout';
import { executeAction } from '@/actions/registry';
import { startWebMcpSync } from '@/actions/webmcp';
import { useDirector } from '@/director/useDirector';
import { RealtimeProvider, useRealtimeContext } from '@/realtime/RealtimeContext';
import { useMeeting } from '@/state/meeting-store';
import { Readout } from '@/components/readout/Readout';
import { BoardSeats } from './BoardSeats';
import { BottomBar } from './BottomBar';
import { CommitmentsDrawer } from './CommitmentsDrawer';
import { InterventionRail } from './InterventionRail';
import { MeetingPhaseBar } from './MeetingPhaseBar';
import { SlideStage } from './SlideStage';
import { ToolActivityFeed } from './ToolActivityFeed';
import { VoiceControl } from './VoiceControl';

function MeetingBody() {
  const started = useRef(false);
  const director = useDirector();
  const realtime = useRealtimeContext();
  const phase = useMeeting((s) => s.phase);
  const currentSlideId = useMeeting((s) => s.currentSlideId);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const store = useMeeting.getState();
    store.reset();
    store.loadDemoDeck();
    store.startMeeting();
    const stop = startWebMcpSync();
    return () => {
      stop();
      started.current = false;
    };
  }, []);

  const voiceLive = realtime.status === 'connected';

  // when voice is live the typed input drives the real board model; otherwise the rehearsal director
  const handlePresent = (text: string) => {
    if (voiceLive && realtime.sendText(text)) return;
    director.present(text);
  };

  const endMeeting = () => {
    const outcome = executeAction('generate_board_readout', {});
    if (!outcome.ok) useMeeting.getState().setReadout(buildReadout(useMeeting.getState()));
  };

  const backToMeeting = () => useMeeting.getState().setPhase('close');

  if (phase === 'readout') return <Readout onBack={backToMeeting} />;

  const speaking = director.speakingSeat !== null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <BoardSeats speakingSeat={director.speakingSeat} />
        <MeetingPhaseBar phase={phase} />
        <VoiceControl speaking={speaking} />
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <SlideStage
            onPresent={director.playCurrent}
            speaking={speaking}
            voiceLive={voiceLive}
            hasScript={currentSlideId ? director.hasScript(currentSlideId) : false}
          />
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

      <BottomBar onPresent={handlePresent} onEnd={endMeeting} speaking={speaking} voiceLive={voiceLive} />
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
