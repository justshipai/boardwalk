'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setPendingDeck } from './pending-deck';
import { parsePdf } from './parse-pdf';

const MAX_BYTES = 20 * 1024 * 1024;

export function UploadDeckButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'parsing'>('idle');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (file.type !== 'application/pdf') return setError('That is not a PDF. Choose a .pdf deck.');
    if (file.size > MAX_BYTES) return setError('That deck is over 20 MB. Try a smaller file.');

    setState('parsing');
    try {
      const deck = await parsePdf(file, (done, total) => setProgress({ done, total }));
      if (deck.slides.length === 0) throw new Error('empty');
      setPendingDeck(deck);
      router.push('/meeting');
    } catch {
      setState('idle');
      setProgress(null);
      setError('Could not read that PDF. Try another export.');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input ref={inputRef} type="file" accept="application/pdf" onChange={onFile} className="hidden" />
      <button
        type="button"
        onClick={pick}
        disabled={state === 'parsing'}
        className="w-fit rounded-lg border border-border-strong px-5 py-3 text-base font-medium text-text transition hover:bg-panel disabled:opacity-60"
      >
        {state === 'parsing'
          ? progress
            ? `Reading deck… ${progress.done}/${progress.total}`
            : 'Reading deck…'
          : 'Upload a board deck'}
      </button>
      <span className="text-xs text-text-faint">
        {error ?? 'PDF up to 30 pages. It stays in your browser — nothing is uploaded or stored.'}
      </span>
    </div>
  );
}
