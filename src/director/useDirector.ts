'use client';

import { useCallback, useRef, useState } from 'react';
import { executeAction } from '@/actions/registry';
import { useMeeting } from '@/state/meeting-store';
import { northstarScript, scriptedSlideIds } from './northstar-script';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useDirector() {
  const [speakingSeat, setSpeakingSeat] = useState<string | null>(null);
  const busy = useRef(false);

  const play = useCallback(async (slideId: string) => {
    if (busy.current) return;
    const steps = northstarScript[slideId];
    if (!steps) return;
    busy.current = true;
    const addTranscript = useMeeting.getState().addTranscript;

    for (const step of steps) {
      if (step.say) {
        setSpeakingSeat(step.seat ?? 'lead-investor');
        addTranscript({ speaker: 'board', seat: step.seat, text: step.say, slideId });
        await wait(step.say.length * 14);
      }
      if (step.tool) executeAction(step.tool, step.args ?? {});
      await wait(step.pauseMs ?? 350);
    }
    setSpeakingSeat(null);
    busy.current = false;
  }, []);

  const playCurrent = useCallback(() => {
    const slideId = useMeeting.getState().currentSlideId;
    if (slideId) return play(slideId);
  }, [play]);

  const present = useCallback(
    async (text: string) => {
      const slideId = useMeeting.getState().currentSlideId;
      if (!slideId) return;
      useMeeting.getState().addTranscript({ speaker: 'founder', text, slideId });
      await play(slideId);
    },
    [play],
  );

  return { play, playCurrent, present, speakingSeat, hasScript: (slideId: string) => scriptedSlideIds.has(slideId) };
}
