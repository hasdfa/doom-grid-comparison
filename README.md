# DOOM Grid

A static Vite demo of DOOM rendered in 23,040 cells. Switch between MUI X Data Grid Premium 9.17.0, Base UI Mosaic (data-source revision da4474be8f3d), AG Grid Community 36.3.0, TanStack Table 9.3.1, MUI X Charts Heatmap 9.17.0, Base UI Charts Heatmap (source revision db47a70f7ab9), and MUI X Scheduler 9.0.0-beta.15.

This repository contains the standalone demo source, tests, and game runtime.
Private Base UI Charts and Mosaic vendor archives are excluded.
Before `pnpm install`, obtain authorized access and build the three archives described in `vendor/README.md`.
Installation requires those archives; the hosted demo does not.

```sh
cd doom-grid-comparison
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Serve `dist/` as a static directory. The host must permit same-origin workers, AudioWorklet modules, and WebAssembly compilation.
A Content Security Policy needs `script-src 'self' 'wasm-unsafe-eval'` and `worker-src 'self'`.
Seemyslop now permits this runtime. The static deployment is https://doom-grid-comparison-nov5-a419.seemyslop.online.

There is no backend. The game, worker, WASM, engine source, and notices ship together.

## Rendering

The four table libraries mount every cell with virtualization disabled. The two chart libraries mount SVG heatmap rectangles. The default resolution is 192 × 120. A shared worker runs Chocolate Doom. The page samples its 320 × 200 RGBA framebuffer and writes changed colors to mounted cell elements at a maximum of 30 updates per second. React owns the grid structure; the paint loop owns HTML background colors or SVG fill styles. This measures cell painting, not row-update API throughput.

The FPS display counts processed game frames. Update time includes sampling and style assignments, but excludes browser layout and paint.

## Controls

Arrow keys move and turn. Control fires. Space opens doors. Shift runs. Escape opens the game menu. Enter selects menu items. WASD, F, and E are also supported during gameplay. Mobile layouts include touch controls. Losing window focus pauses the game.

## Credits

Inspired by sadmann's tablecn demo: https://x.com/sadmann17/status/2117297575070240831.

The runtime adapter is adapted from tablecn under MIT. See `public/doom/TABLECN-LICENSE.md`. The engine is Chocolate Doom compiled by cloudflare/doom-wasm, with tablecn's patches. Its GPLv2 notice, corresponding source archive, patch, and unmodified shareware WAD are in `public/doom/`. See that directory's README for details.

The grid and chart libraries retain their own commercial license terms. No license checks or watermarks are removed.

## Browser checks

After building, start `pnpm exec vite preview --host 127.0.0.1 --port 5186`, then run `node tests/browser.mjs` in another terminal.

## Deployment

Publish the built `dist/` directory with `seemyslop deploy dist --id doom-grid-comparison-nov5-a419 --no-git-metadata --json` from the repository root.
This static deployment does not depend on a running server or Cloudflare Tunnel.
The data-source branch experiment is https://doom-mosaic-data-source-nov9-a419.seemyslop.online/?renderer=mosaic.
It uses Mosaic commit `da4474be8f3dc8b89c16612a2311b67477602b9c` through `useClientDataSource`.
The painter still writes cell backgrounds directly; it does not call row transactions.
The previous dedicated tunnel at `doom-dg.raksha.bio` is separate from this deployment.

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass.
`node tests/renderer.mjs <renderer>` checks real colored cells, changing frames, pause/resume, restart, and narrow-screen overflow.
Set `DEMO_URL=https://doom-mosaic-data-source-nov9-a419.seemyslop.online` to check the published site.
Renderer values are `premium`, `mosaic`, `aggrid`, `tanstack`, `mui-heatmap`, and `base-heatmap`. The heatmap browser check is `node tests/heatmaps.mjs`.

## Resolution and benchmark

Choose 96 × 60, 128 × 80, 192 × 120, 256 × 160, or 320 × 200. The game keeps running while the renderer remounts.
The benchmark pauses gameplay and runs all seven renderers through the same 60 synthetic full-cell color updates after 8 warmup frames.
The chart reports elapsed-time throughput, mean JavaScript update time, and nearest-rank P95 frame intervals.
Results describe this browser and device. They do not measure grid row-update APIs.
Resizing or hiding the tab cancels the run. The benchmark has its own resolution selector, independent of gameplay. Changing benchmark resolution clears previous results.

Base UI Charts is built from a pinned source revision because no published package was available. See `vendor/README.md` for reproducibility.
Heatmaps use each library’s geometry and cell components. The shared painter updates SVG fill directly, matching the table benchmark’s direct style updates.

## Scheduler experiment

The Scheduler day view renders one timed event per pixel. Overlapping events form columns, and time intervals form rows.
The adapter keeps Scheduler geometry and event elements. The shared painter changes their background colors.
Opening `?renderer=scheduler` starts at 96 × 60 because mounting thousands of events is expensive.
Run `node tests/scheduler.mjs` to check geometry, gameplay, and resolution changes.
Pixel borders are removed from all renderers for a continuous image.

The benchmark test selector also offers a three-second DOOM walk. Each renderer gets an independent fresh engine, one second of warmup, and Arrow Up held during measurement, with a 100 ms Ctrl press every 500 ms. Input timing runs in the worker, independently of rendering.
FPS counts new framebuffer paints over actual elapsed time. Update time includes sampling and style writes; P95 measures intervals between framebuffer paints.
Loading and warmup are excluded. The regular game stays paused, and cancellation disposes the benchmark worker and releases its input.
Run `BENCHMARK_MODE=doom node tests/benchmark.mjs` for the gameplay benchmark check.

## Performance experiments

Client adapters paint real library elements and preserve every pixel. Premium retains its faster child-span painter.
Mosaic uses the `data-source` branch; other library source remains unchanged.

- [Before and after client optimizations](https://doom-grid-before-after-nov7-a419.seemyslop.online/)
- [Mosaic branch comparison: 20 passes](https://doom-mosaic-ten-passes-nov9-a419.seemyslop.online/)
- [Recorded observations and methodology](benchmarks/mosaic-20-passes/README.md)
