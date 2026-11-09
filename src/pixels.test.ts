import { describe, expect, it } from 'vitest';
import { COUNT, sampleFrame, paintFrame } from './pixels';

describe('framebuffer mapping', () => {
  it('samples top-left and last destination pixels from the correct source coordinates', () => {
    const rgba = new Uint8ClampedArray(320 * 200 * 4);
    rgba.set([255, 16, 32, 255], 0);
    rgba.set([1, 2, 3, 255], (198 * 320 + 318) * 4);
    const output = new Uint32Array(COUNT);
    sampleFrame(rgba, output);
    expect(output[0]).toBe(0xff1020);
    expect(output[COUNT - 1]).toBe(0x010203);
  });
  it('rejects malformed frames', () => {
    expect(() => sampleFrame(new Uint8ClampedArray(4), new Uint32Array(COUNT))).toThrow();
  });
  it('paints only changed mounted cells and retries absent cells', () => {
    const style = { backgroundColor: '' };
    const cell = { style } as HTMLElement;
    const previous = new Int32Array(2).fill(-1);
    const colors = new Uint32Array([0x10203, 0]);
    expect(paintFrame([cell, null], colors, previous)).toBe(1);
    expect(style.backgroundColor).toBe('#010203');
    expect(paintFrame([cell, null], colors, previous)).toBe(0);
    expect(previous[1]).toBe(-1);
    expect(paintFrame([cell, cell], colors, previous)).toBe(1);
  });
});

it('maps native and lower resolutions without changing the framebuffer', () => {
  const rgba = new Uint8ClampedArray(320 * 200 * 4);
  rgba.set([11, 22, 33, 255], (320 * 200 - 1) * 4);
  const native = new Uint32Array(320 * 200);
  sampleFrame(rgba, native, 320, 200);
  expect(native[native.length - 1]).toBe(0x0b1621);
  const small = new Uint32Array(96 * 60);
  expect(() => sampleFrame(rgba, small, 96, 60)).not.toThrow();
});

it('paints SVG heatmap cells with fill rather than HTML background colors', () => {
  const style = { fill: '', backgroundColor: '' };
  const cell = { namespaceURI: 'http://www.w3.org/2000/svg', style } as SVGElement;
  const colors = new Uint32Array([0x123456]);
  expect(paintFrame([cell], colors, new Int32Array([-1]))).toBe(1);
  expect(style.fill).toBe('#123456');
  expect(style.backgroundColor).toBe('');
});

it('repaints replacement nodes even when their pixel color is unchanged', () => {
  const first = { style: { backgroundColor: '' } } as HTMLElement;
  const replacement = { style: { backgroundColor: '' } } as HTMLElement;
  const previous = new Int32Array([-1]);
  const colors = new Uint32Array([0x123456]);
  expect(paintFrame([first], colors, previous)).toBe(1);
  expect(paintFrame([first], colors, previous)).toBe(0);
  expect(paintFrame([replacement], colors, previous)).toBe(1);
  expect(replacement.style.backgroundColor).toBe('#123456');
  expect(paintFrame([null], colors, previous)).toBe(0);
  expect(paintFrame([replacement], colors, previous)).toBe(1);
});
