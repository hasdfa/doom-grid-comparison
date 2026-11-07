import { useLayoutEffect, useMemo, useRef } from 'react';
import { StandaloneDayView } from '@mui/x-scheduler/day-view';
import { CELL, type PixelElement } from './pixels';

const day = new Date('2026-01-05T00:00:00Z');
export function SchedulerGrid({ cells, width, height }: {
  cells: (PixelElement | null)[]; width: number; height: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const events = useMemo(() => Array.from({ length: width * height }, (_, index) => ({
    id: index,
    title: String(index),
    className: `scheduler-pixel pixel-index-${index}`,
    start: new Date(day.getTime() + Math.floor(index / width) * 86400000 / height).toISOString(),
    end: new Date(day.getTime() + (Math.floor(index / width) + 1) * 86400000 / height).toISOString(),
  })), [width, height]);
  useLayoutEffect(() => {
    const bind = () => host.current?.querySelectorAll<HTMLElement>('.scheduler-pixel').forEach(node => {
      const id = [...node.classList].find(name => name.startsWith('pixel-index-'));
      if (id) cells[Number(id.slice(12))] = node;
    });
    bind();
    const observer = new MutationObserver(bind);
    if (host.current) observer.observe(host.current, { childList: true, subtree: true });
    return () => { observer.disconnect(); cells.fill(null); };
  }, [cells, events]);
  return <div ref={host} className="scheduler-grid" style={{ width: width * CELL, height: height * CELL }}>
    <StandaloneDayView
      events={events}
      visibleDate={day}
      displayTimezone="UTC"
      readOnly
      viewConfig={{ day: { initialScrollTime: 0 } }}
      style={{ height: height * CELL, '--hour-height': `${height * CELL / 24}px` } as React.CSSProperties}
    />
  </div>;
}
