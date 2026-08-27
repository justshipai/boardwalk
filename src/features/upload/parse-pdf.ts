'use client';

import type { Slide } from '@/state/types';
import type { PendingDeck } from './pending-deck';

const MAX_PAGES = 30;

function deriveTitle(text: string, index: number): string {
  const firstLine = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 2);
  if (!firstLine) return `Slide ${index + 1}`;
  return firstLine.length > 70 ? `${firstLine.slice(0, 70)}…` : firstLine;
}

export async function parsePdf(file: File, onProgress?: (done: number, total: number) => void): Promise<PendingDeck> {
  // dynamic import keeps pdfjs (which touches browser-only DOMMatrix) out of the SSR bundle
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pageCount = Math.min(doc.numPages, MAX_PAGES);
  const slides: Slide[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (context) {
      await page.render({ canvas, canvasContext: context, viewport }).promise;
    }
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);

    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    slides.push({
      id: `slide-${i}`,
      index: i - 1,
      title: deriveTitle(pageText, i - 1),
      narrative: '',
      bullets: [],
      metrics: [],
      imageDataUrl,
      pageText,
    });
    onProgress?.(i, pageCount);
  }

  const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded deck';

  return {
    company: { name, stage: 'Uploaded deck', currentPriority: '', decisionNeeded: '' },
    slides,
  };
}
