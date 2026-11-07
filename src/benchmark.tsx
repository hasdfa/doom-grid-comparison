import type { PixelElement } from './pixels';
import { useEffect, useRef, useState } from 'react';
import { PixelGrid, renderers, type Renderer } from './grids';
import { CELL, WIDTH, HEIGHT, paintFrame, sampleFrame } from './pixels';
import { createBenchmarkDoom, type DoomEngine } from './doom';
import { ResolutionControl } from './resolution-control';
import { benchmarkFrame, summarize } from './benchmark-metrics';

type BenchmarkMode = 'colors' | 'doom';
type Result = ReturnType<typeof summarize> & { renderer: Renderer };
const FRAME_COUNT = 60;
const WARMUP = 8;

function nextFrame(signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Benchmark cancelled.'));
      return;
    }
    let timer = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      signal.removeEventListener('abort', stop);
      reject(new Error('Benchmark cancelled.'));
    };
    const frame = requestAnimationFrame((time) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', stop);
      resolve(time);
    });
    timer = window.setTimeout(stop, 15000);
    signal.addEventListener('abort', stop, { once: true });
  });
}

export function Benchmark({
  onStart,
  onFinish,
  disabled,
}: {
  onStart: () => void;
  onFinish: () => void;
  disabled: boolean;
}) {
  const [{ width: columns, height: rows }, setResolution] = useState({ width: WIDTH, height: HEIGHT });
  const [mode, setMode] = useState<BenchmarkMode>('colors');
  const [active, setActive] = useState<Renderer | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('Run the comparison on your browser.');
  const [width, setWidth] = useState(0);
  const [capturedWidth, setCapturedWidth] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const cells = useRef<(PixelElement | null)[]>(Array(columns * rows).fill(null));
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (viewport.current) observer.observe(viewport.current);
    const interrupt = () => controller.current?.abort();
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', interrupt);
    return () => {
      observer.disconnect();
      interrupt();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', interrupt);
    };
  }, []);

  const run = async () => {
    if (controller.current) return;
    const control = new AbortController();
    controller.current = control;
    onStart();
    setResults([]);
    setCapturedWidth(width);
    section.current?.scrollIntoView({ block: 'start' });
    const colors = new Uint32Array(columns * rows);
    let game: DoomEngine | null = null;
    try {
      for (const item of renderers) {
        setActive(item.id);
        setMessage(
          `Testing ${item.label} (${renderers.indexOf(item) + 1} of ${renderers.length})…`,
        );
        let readyAt = performance.now();
        await nextFrame(control.signal);
        while (
          viewport.current?.querySelector('[data-renderer]')?.getAttribute('data-renderer') !==
            item.id ||
          cells.current.filter((cell) => cell?.isConnected).length !== columns * rows
        ) {
          if (performance.now() - readyAt > 15000)
            throw new Error(`${item.label} did not mount all cells.`);
          await nextFrame(control.signal);
        }
        const previous = new Int32Array(columns * rows).fill(-1);
        const intervals: number[] = [];
        const updates: number[] = [];
        if (mode === 'doom') {
          setMessage(`Loading DOOM for ${item.label}…`);
          game = await createBenchmarkDoom(control.signal);
          game.setMuted(true);
          const warmupStart = performance.now();
          let lastFrame = -1;
          while (performance.now() - warmupStart < 1000 || !game.pixels()) {
            if (performance.now() - warmupStart > 15000) throw new Error('DOOM did not produce a frame.');
            await nextFrame(control.signal);
            game.step();
            const pixels = game.pixels();
            if (pixels) {
              sampleFrame(pixels, colors, columns, rows);
              paintFrame(cells.current, colors, previous);
              lastFrame = game.frame();
            }
          }
          setMessage(`Walking and shooting: ${item.label} (${renderers.indexOf(item) + 1} of ${renderers.length}) · 3 seconds…`);
          const start = await nextFrame(control.signal);
          let lastPaint = start;
          let now = start;
          game.benchmarkWalk(3000);
          while (now - start < 3000) {
            now = await nextFrame(control.signal);
            game.step();
            const pixels = game.pixels();
            if (pixels && game.frame() !== lastFrame) {
              const begin = performance.now();
              sampleFrame(pixels, colors, columns, rows);
              paintFrame(cells.current, colors, previous);
              updates.push(performance.now() - begin);
              intervals.push(now - lastPaint);
              lastPaint = now;
              lastFrame = game.frame();
            }
          }
          game.key(false, 173);
          game.dispose();
          game = null;
          const result = summarize(intervals, updates);
          // Include any final interval without a new game frame in throughput.
          result.fps = updates.length * 1000 / (now - start);
          setResults(current => [...current, { renderer: item.id, ...result }]);
          continue;
        }
        for (let frame = 0; frame < WARMUP; frame++) {
          benchmarkFrame(frame, colors, columns);
          paintFrame(cells.current, colors, previous);
          await nextFrame(control.signal);
        }
        readyAt = await nextFrame(control.signal);
        for (let frame = 0; frame < FRAME_COUNT; frame++) {
          const begin = performance.now();
          benchmarkFrame(frame, colors, columns);
          paintFrame(cells.current, colors, previous);
          updates.push(performance.now() - begin);
          const end = await nextFrame(control.signal);
          intervals.push(end - readyAt);
          readyAt = end;
        }
        setResults((current) => [
          ...current,
          { renderer: item.id, ...summarize(intervals, updates) },
        ]);
      }
      setMessage('Complete. Results are specific to this browser and device.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      game?.key(false, 173);
      game?.dispose();
      controller.current = null;
      setActive(null);
      onFinish();
    }
  };

  const maximum = Math.max(1, ...results.map((result) => result.fps));
  return (
    <section className="benchmark" ref={section} aria-labelledby="benchmark-title">
      <div className="benchmark-heading">
        <div>
          <h2 id="benchmark-title">Compare every renderer.</h2>
          <p>One workload. Your browser. Real measurements.</p>
        </div>
        <button
          className="primary"
          disabled={disabled && !active}
          onClick={() => (active ? controller.current?.abort() : void run())}
        >
          {active ? 'Cancel benchmark' : 'Run benchmark'}
        </button>
      </div>
      <label className="resolution-control">
        Benchmark test
        <select
          aria-label="Benchmark test"
          value={mode}
          disabled={disabled || active !== null}
          onChange={event => {
            setMode(event.target.value as BenchmarkMode);
            setResults([]);
            setCapturedWidth(0);
            setMessage('Run the comparison on your browser.');
          }}
        >
          <option value="colors">Synthetic color updates</option>
          <option value="doom">DOOM · walk and shoot for 3 seconds</option>
        </select>
      </label>
      <ResolutionControl
        label="Benchmark resolution"
        width={columns}
        height={rows}
        disabled={disabled || active !== null}
        onChange={(next) => {
          cells.current = Array(next.width * next.height).fill(null);
          setResolution(next);
          setResults([]);
          setCapturedWidth(0);
          setMessage('Run the comparison on your browser.');
        }}
      />
      <p role="status">{message}</p>
      <div
        ref={viewport}
        className="benchmark-viewport"
        style={{ height: active ? rows * CELL * (width / (columns * CELL)) : 0 }}
      >
        {active && (
          <div
            data-renderer={active}
            className="grid-scale"
            aria-hidden="true"
            inert
            style={{
              width: columns * CELL,
              height: rows * CELL,
              transform: `scale(${width / (columns * CELL)})`,
            }}
          >
            <PixelGrid
              key={active}
              renderer={active}
              cells={cells.current}
              width={columns}
              height={rows}
            />
          </div>
        )}
      </div>
      <figure aria-label="Benchmark FPS comparison, higher is better">
        <figcaption>
          Frame throughput ({columns} × {rows}) <span>{mode === 'doom' ? 'Rendered game FPS · 3 seconds' : 'Higher is better · uncapped'}</span>
        </figcaption>
        <div className="benchmark-table-wrap">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Renderer</th>
                <th>FPS</th>
                <th>Update time</th>
                <th>P95 frame interval</th>
              </tr>
            </thead>
            <tbody>
              {renderers.map((item) => {
                const result = results.find((value) => value.renderer === item.id);
                return (
                  <tr key={item.id}>
                    <th scope="row">
                      {item.label}
                      <small>{item.version}</small>
                    </th>
                    <td className="bar-cell">
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${result ? (result.fps / maximum) * 100 : 0}%` }}
                        />
                      </div>
                      <strong>{result ? result.fps.toFixed(1) : '—'}</strong>
                    </td>
                    <td>{result ? `${result.updateMs.toFixed(2)} ms` : '—'}</td>
                    <td>{result ? `${result.p95.toFixed(1)} ms` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </figure>
      <p className="benchmark-note">
        {mode === 'doom'
          ? 'Each renderer starts a fresh DOOM level, warms up for one second, then holds Arrow Up for three seconds, pressing Ctrl every half-second. Loading is excluded; audio is muted. Uses '
          : 'Each renderer paints the same 60 synthetic color frames after 8 warmup frames, using '}
        {(columns * rows).toLocaleString()} mounted cells and the same direct style updates.
        Gameplay pauses during the test. Keep this tab visible and the window size unchanged.
      </p>
      <p className="benchmark-note">
        {mode === 'doom'
          ? 'FPS counts newly rendered game frames over actual elapsed time, including the final browser callback. Update time includes framebuffer sampling and cell painting in JavaScript. P95 measures intervals between rendered game frames. The engine runs independently; this is not simulation FPS. The player may reach a wall.'
          : 'FPS includes the time between animation callbacks. Update time measures JavaScript only; P95 shows slower frame intervals. This tests browser cell rendering, not each library’s row-update API or DOOM engine speed.'}
        {capturedWidth > 0 ? ` Rendered width: ${Math.round(capturedWidth)} CSS pixels.` : ''}
      </p>
    </section>
  );
}
