import { useLayoutEffect, useMemo, useRef } from 'react';
import { StandaloneDayView } from '@mui/x-scheduler/day-view';
import { CELL, type PixelElement } from '../pixels';

const day = new Date('2026-01-05T00:00:00Z');

export function SchedulerGrid({
  cells,
  width,
  height,
}: {
  cells: (PixelElement | null)[];
  width: number;
  height: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const events = useMemo(() => {
    const boundaries = Array.from({ length: height + 1 }, (_, row) =>
      new Date(day.getTime() + (row * 86400000) / height).toISOString(),
    );
    return Array.from({ length: width * height }, (_, index) => {
      const row = Math.floor(index / width);
      return {
        id: index,
        title: String(index),
        className: `scheduler-pixel pixel-index-${index}`,
        start: boundaries[row],
        end: boundaries[row + 1],
      };
    });
  }, [width, height]);

  useLayoutEffect(() => {
    const root = host.current;
    if (!root) return;
    const registered = new Map<HTMLElement, number>();
    const bind = (node: HTMLElement) => {
      if (!root.contains(node)) return;
      const id = [...node.classList].find((name) => name.startsWith('pixel-index-'));
      if (!id) return;
      const index = Number(id.slice(12));
      if (!Number.isInteger(index) || index < 0 || index >= events.length) return;
      registered.set(node, index);
      cells[index] = node;
    };
    const unbind = (node: HTMLElement) => {
      // A move within the host keeps the same paint target.
      if (root.contains(node)) return;
      const index = registered.get(node);
      if (index === undefined) return;
      if (cells[index] === node) cells[index] = null;
      registered.delete(node);
    };
    const visit = (node: Node, callback: (element: HTMLElement) => void) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches('.scheduler-pixel')) callback(node);
      node.querySelectorAll<HTMLElement>('.scheduler-pixel').forEach(callback);
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.removedNodes.forEach((node) => visit(node, unbind));
        record.addedNodes.forEach((node) => visit(node, bind));
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    visit(root, bind);
    return () => {
      observer.disconnect();
      for (const [node, index] of registered) {
        if (cells[index] === node) cells[index] = null;
      }
      registered.clear();
    };
  }, [cells, events]);

  return (
    <div
      ref={host}
      className="scheduler-grid"
      style={{ width: width * CELL, height: height * CELL }}
    >
      <StandaloneDayView
        events={events}
        visibleDate={day}
        displayTimezone="UTC"
        readOnly
        viewConfig={{ day: { initialScrollTime: 0 } }}
        style={
          {
            height: height * CELL,
            '--hour-height': `${(height * CELL) / 24}px`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
