import { expect, it } from 'vitest';
import { benchmarkFrame, summarize } from './benchmark-metrics';
import { COUNT } from './pixels';
it('calculates throughput using elapsed time, not an average of instantaneous FPS', () => {
  expect(summarize([10, 30], [1, 3])).toEqual({ fps: 50, updateMs: 2, p95: 30 });
});
it('uses the nearest rank for the 95th percentile', () => {
  expect(
    summarize(
      Array.from({ length: 100 }, (_, i) => i + 1),
      Array(100).fill(1),
    ).p95,
  ).toBe(95);
});
it('rejects missing, mismatched, or invalid timing samples', () => {
  expect(() => summarize([], [])).toThrow();
  expect(() => summarize([0], [1])).toThrow();
  expect(() => summarize([10], [])).toThrow();
});
it('replays the same full-cell workload for every renderer', () => {
  const a = new Uint32Array(COUNT),
    b = new Uint32Array(COUNT);
  benchmarkFrame(12, a);
  benchmarkFrame(12, b);
  expect(a).toEqual(b);
  benchmarkFrame(13, b);
  expect(a.every((value, i) => value !== b[i])).toBe(true);
});
