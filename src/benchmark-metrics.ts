import { WIDTH } from './pixels';

export function benchmarkFrame(frame: number, output: Uint32Array, width = WIDTH) {
  for (let i = 0; i < output.length; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    output[i] =
      (((x * 3 + frame * 7) & 255) << 16) |
      (((y * 5 + frame * 3) & 255) << 8) |
      ((x + y + frame * 11) & 255);
  }
}

export function summarize(intervals: number[], updates: number[]) {
  if (
    !intervals.length ||
    intervals.length !== updates.length ||
    intervals.some((value) => value <= 0 || !Number.isFinite(value)) ||
    updates.some((value) => value < 0 || !Number.isFinite(value))
  )
    throw new Error('Invalid benchmark samples');
  const sorted = [...intervals].sort((a, b) => a - b);
  return {
    fps: (intervals.length * 1000) / intervals.reduce((sum, value) => sum + value, 0),
    updateMs: updates.reduce((sum, value) => sum + value, 0) / updates.length,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
  };
}
