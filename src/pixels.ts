export type PixelElement = HTMLElement | SVGElement;

export const WIDTH = 192;
export const HEIGHT = 120;
export const CELL = 6;
export const COUNT = WIDTH * HEIGHT;

export function sampleFrame(
  rgba: Uint8ClampedArray,
  output: Uint32Array,
  width = WIDTH,
  height = HEIGHT,
) {
  if (rgba.length !== 320 * 200 * 4 || output.length !== width * height) {
    throw new Error('Unexpected framebuffer dimensions');
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (Math.floor((y * 200) / height) * 320 + Math.floor((x * 320) / width)) * 4;
      output[y * width + x] = (rgba[offset] << 16) | (rgba[offset + 1] << 8) | rgba[offset + 2];
    }
  }
}

export function paintFrame(
  cells: (PixelElement | null)[],
  colors: Uint32Array,
  previous: Int32Array,
) {
  let changed = 0;
  for (let i = 0; i < colors.length; i++) {
    const cell = cells[i];
    if (cell && previous[i] !== colors[i]) {
      const color = '#' + colors[i].toString(16).padStart(6, '0');
      if (cell.namespaceURI === 'http://www.w3.org/2000/svg') cell.style.fill = color;
      else cell.style.backgroundColor = color;
      previous[i] = colors[i];
      changed++;
    }
  }
  return changed;
}
