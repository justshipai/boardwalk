'use client';

import type { Claim, Slide } from '@/state/types';
import type { PendingDeck } from './pending-deck';

const MAX_PAGES = 30;
const MAX_CLAIMS_PER_PAGE = 40;

interface TextRun {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

// group text runs into line-level claims with a normalized (0–1) bounding box, so the board can
// mark the exact line of an arbitrary uploaded page (Gap 2)
function extractClaims(items: unknown[], pageW: number, pageH: number, slideId: string): Claim[] {
  const runs = items.filter((it): it is TextRun => !!it && typeof it === 'object' && 'str' in it && 'transform' in it);
  const lines = new Map<number, { runs: { x: number; s: string }[]; minX: number; maxX: number; minY: number; maxY: number }>();

  for (const run of runs) {
    if (!run.str.trim()) continue;
    const x = run.transform[4];
    const baseline = run.transform[5];
    const h = run.height || 10;
    const top = pageH - (baseline + h);
    const key = Math.round(baseline / 4); // cluster runs sharing a baseline into one line
    const line = lines.get(key) ?? { runs: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    line.runs.push({ x, s: run.str });
    line.minX = Math.min(line.minX, x);
    line.maxX = Math.max(line.maxX, x + run.width);
    line.minY = Math.min(line.minY, top);
    line.maxY = Math.max(line.maxY, top + h);
    lines.set(key, line);
  }

  return [...lines.entries()]
    .sort((a, b) => b[0] - a[0]) // higher baseline = nearer the top of the page
    .map(([, line], i) => ({
      id: `${slideId}-l${i}`,
      text: line.runs
        .sort((a, b) => a.x - b.x)
        .map((r) => r.s)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
      region: {
        x: line.minX / pageW,
        y: line.minY / pageH,
        w: (line.maxX - line.minX) / pageW,
        h: (line.maxY - line.minY) / pageH,
      },
    }))
    .filter((c) => c.text.length > 1)
    .slice(0, MAX_CLAIMS_PER_PAGE);
}

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

    const unscaled = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const claims = extractClaims(textContent.items, unscaled.width, unscaled.height, `slide-${i}`);

    slides.push({
      id: `slide-${i}`,
      index: i - 1,
      title: deriveTitle(claims[0]?.text ?? pageText, i - 1),
      narrative: '',
      bullets: [],
      metrics: [],
      imageDataUrl,
      pageText,
      claims,
    });
    onProgress?.(i, pageCount);
  }

  const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded deck';

  return {
    company: { name, stage: 'Uploaded deck', currentPriority: '', decisionNeeded: '' },
    slides,
  };
}
