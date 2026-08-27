'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import { useMeeting } from '@/state/meeting-store';
import type { Severity } from '@/state/types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const strokeFor: Record<Severity, string> = {
  watch: 'var(--watch)',
  material: 'var(--material)',
  critical: 'var(--critical)',
};

function ellipsePath(r: Rect, pad: number): string {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rx = r.w / 2 + pad;
  const ry = r.h / 2 + pad;
  // a full ellipse as two arcs, so stroke-dashoffset can "draw it on"
  return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
}

export function AnnotationLayer({ containerRef, slideId }: { containerRef: RefObject<HTMLElement | null>; slideId: string }) {
  const annotations = useMeeting((s) => s.annotations);
  const slideAnnotations = annotations.filter((a) => a.slideId === slideId);
  const [rects, setRects] = useState<Record<string, Rect>>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const marks = annotations.filter((a) => a.slideId === slideId);

    const measure = () => {
      const cRect = container.getBoundingClientRect();
      const image = container.querySelector('[data-slide-image]') as HTMLElement | null;
      const next: Record<string, Rect> = {};

      for (const a of marks) {
        let el: HTMLElement | null = null;
        if (a.target.metricId) el = container.querySelector(`[data-metric="${a.target.metricId}"]`);
        else if (a.target.claimId) el = container.querySelector(`[data-claim="${a.target.claimId}"]`);

        if (el) {
          const r = el.getBoundingClientRect();
          next[a.id] = { x: r.left - cRect.left, y: r.top - cRect.top, w: r.width, h: r.height };
        } else if (a.target.region) {
          const base = image ? image.getBoundingClientRect() : cRect;
          const bx = base.left - cRect.left;
          const by = base.top - cRect.top;
          next[a.id] = {
            x: bx + a.target.region.x * base.width,
            y: by + a.target.region.y * base.height,
            w: a.target.region.w * base.width,
            h: a.target.region.h * base.height,
          };
        }
      }
      setRects(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    container.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      container.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [containerRef, slideId, annotations]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {slideAnnotations.map((a) => {
          const r = rects[a.id];
          if (!r) return null;
          const color = strokeFor[a.severity];
          if (a.kind === 'circle') {
            return (
              <path
                key={a.id}
                d={ellipsePath(r, 10)}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                pathLength={1}
                className="anno-draw"
              />
            );
          }
          if (a.kind === 'strike' || a.kind === 'underline') {
            const y = a.kind === 'strike' ? r.y + r.h / 2 : r.y + r.h + 3;
            return (
              <line
                key={a.id}
                x1={r.x - 2}
                y1={y}
                x2={r.x + r.w + 2}
                y2={y}
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                pathLength={1}
                className="anno-draw"
              />
            );
          }
          if (a.kind === 'arrow') {
            // connector from the label (above-right) down to the target's top-right
            const tx = r.x + r.w;
            const ty = r.y;
            const lx = Math.min(tx + 46, tx + 46);
            const ly = Math.max(ty - 34, 6);
            return (
              <line
                key={a.id}
                x1={lx}
                y1={ly}
                x2={tx}
                y2={ty}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                pathLength={1}
                className="anno-draw"
              />
            );
          }
          return null;
        })}
      </svg>

      {slideAnnotations.map((a) => {
        const r = rects[a.id];
        if (!r || (a.kind !== 'pin' && a.kind !== 'arrow')) return null;
        const color = strokeFor[a.severity];
        const left = a.kind === 'arrow' ? r.x + r.w + 30 : r.x + r.w - 6;
        const top = a.kind === 'arrow' ? Math.max(r.y - 52, 0) : r.y - 10;
        return (
          <div
            key={`${a.id}-pin`}
            className="pin-drop absolute flex max-w-[180px] items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold shadow-lg"
            style={{ left, top, background: color, color: 'var(--stage-ink)' }}
          >
            {a.label ?? (a.kind === 'arrow' ? 'Q' : '!')}
          </div>
        );
      })}
    </div>
  );
}
