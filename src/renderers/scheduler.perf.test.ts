import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PixelElement } from '../pixels';

const hooks = vi.hoisted(() => ({
  ref: { current: null as unknown },
  effect: undefined as undefined | (() => void | (() => void)),
}));
vi.mock('react', () => ({
  useRef: () => hooks.ref,
  useMemo: (factory: () => unknown) => factory(),
  useLayoutEffect: (effect: () => void | (() => void)) => {
    hooks.effect = effect;
  },
}));
vi.mock('@mui/x-scheduler/day-view', () => ({ StandaloneDayView: 'scheduler-view' }));
import { SchedulerGrid } from './scheduler';

// A DOM contract double keeps these lifecycle checks independent of browser measurements.
class ElementDouble {
  children: ElementDouble[] = [];
  classList: string[];
  constructor(index?: number) {
    this.classList = index === undefined ? [] : ['scheduler-pixel', `pixel-index-${index}`];
  }
  matches() {
    return this.classList.includes('scheduler-pixel');
  }
  contains(node: ElementDouble): boolean {
    return this === node || this.children.some((child) => child.contains(node));
  }
  querySelectorAll = vi.fn((): ElementDouble[] =>
    this.children.flatMap((child) => [
      ...(child.matches() ? [child] : []),
      ...child.querySelectorAll(),
    ]),
  );
}

function setup(initial: ElementDouble[] = []) {
  const root = new ElementDouble();
  root.children = initial;
  hooks.ref.current = root;
  let callback: MutationCallback = () => {};
  const disconnect = vi.fn();
  const observe = vi.fn();
  vi.stubGlobal('HTMLElement', ElementDouble);
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(cb: MutationCallback) {
        callback = cb;
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
  const cells: (PixelElement | null)[] = Array(6).fill(null);
  const tree = SchedulerGrid({ cells, width: 2, height: 3 });
  const cleanup = hooks.effect?.();
  const mutate = (addedNodes: ElementDouble[], removedNodes: ElementDouble[] = []) => {
    callback([{ addedNodes, removedNodes } as unknown as MutationRecord], {} as MutationObserver);
  };
  return { root, cells, tree, mutate, cleanup, disconnect, observe };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scheduler preparation and registration', () => {
  it('creates only height+1 dates and preserves all event intervals', () => {
    const iso = vi.spyOn(Date.prototype, 'toISOString');
    const { tree } = setup();
    expect(iso).toHaveBeenCalledTimes(4);
    const events = tree.props.children.props.events;
    expect(events).toHaveLength(6);
    for (let index = 0; index < events.length; index++) {
      const row = Math.floor(index / 2);
      expect(events[index]).toMatchObject({
        id: index,
        start: new Date(Date.parse('2026-01-05T00:00:00Z') + (row * 86400000) / 3).toISOString(),
        end: new Date(
          Date.parse('2026-01-05T00:00:00Z') + ((row + 1) * 86400000) / 3,
        ).toISOString(),
      });
    }
    expect(tree.props.children.props.readOnly).toBe(true);
  });

  it('binds initial and nested added events without rescanning the host', () => {
    const first = new ElementDouble(0);
    const { root, cells, mutate, observe } = setup([first]);
    expect(cells[0]).toBe(first);
    expect(observe).toHaveBeenCalledOnce();
    expect(observe.mock.calls[0][0]).toBe(root);
    expect(observe.mock.calls[0][1]).toEqual({ childList: true, subtree: true });
    const wrapper = new ElementDouble();
    const second = new ElementDouble(1);
    wrapper.children = [second];
    root.children.push(wrapper);
    mutate([wrapper]);
    expect(cells[1]).toBe(second);
    expect(root.querySelectorAll).toHaveBeenCalledTimes(1);
    root.children = [first];
    mutate([], [wrapper]);
    expect(cells[1]).toBeNull();
    expect(cells[0]).toBe(first);
  });

  it('keeps replacements during removal and identity-safe cleanup', () => {
    const old = new ElementDouble(0);
    const { root, cells, mutate, cleanup, disconnect } = setup([old]);
    const replacement = new ElementDouble(0);
    root.children = [replacement];
    mutate([replacement]);
    mutate([], [old]);
    expect(cells[0]).toBe(replacement);
    const otherOwner = new ElementDouble(0);
    cells[0] = otherOwner as unknown as HTMLElement;
    if (cleanup) cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cells[0]).toBe(otherOwner);
  });

  it('preserves moves and ignores additions detached before delivery', () => {
    const moved = new ElementDouble(0);
    const { root, cells, mutate, cleanup } = setup([moved]);
    const wrapper = new ElementDouble();
    wrapper.children = [moved];
    root.children = [wrapper];
    mutate([wrapper], [moved]);
    expect(cells[0]).toBe(moved);
    const transient = new ElementDouble(1);
    mutate([transient]);
    expect(cells[1]).toBeNull();
    if (cleanup) cleanup();
    expect(cells[0]).toBeNull();
    const nextCleanup = hooks.effect?.();
    expect(cells[0]).toBe(moved);
    if (nextCleanup) nextCleanup();
    expect(cells[0]).toBeNull();
  });
});
