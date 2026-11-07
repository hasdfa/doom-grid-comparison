import type { PixelElement } from './pixels';
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { PixelGrid, renderers, type Renderer } from './grids';
import { WIDTH, HEIGHT, CELL, sampleFrame, paintFrame } from './pixels';
import { loadDoom, resetDoom, getDoomKeyCode, EXTRA_KEY_CODES, type DoomEngine } from './doom';
import './style.css';
import { Benchmark } from './benchmark';
import { ResolutionControl } from './resolution-control';

function App() {
  const [renderer, setRenderer] = useState<Renderer>(
    renderers.find((item) => item.id === new URLSearchParams(location.search).get('renderer'))
      ?.id ?? 'premium',
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
  const [resolution, setResolution] = useState(renderer === 'scheduler' ? { width: 96, height: 60 } : { width: WIDTH, height: HEIGHT });
  const { width, height } = resolution;
  const [benchmarking, setBenchmarking] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState({ fps: 0, ms: 0 });
  const [scale, setScale] = useState(1);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const engine = useRef<DoomEngine | null>(null);
  const generation = useRef(0);
  const cells = useRef<(PixelElement | null)[]>(Array(width * height).fill(null));
  const pressed = useRef(new Map<string, number>());

  const releaseKeys = () => {
    pressed.current.forEach((key) => engine.current?.key(false, key));
    pressed.current.clear();
  };
  const pause = () => {
    releaseKeys();
    engine.current?.setPaused(true);
    setStatus('paused');
  };
  const start = async () => {
    if (status === 'paused') {
      engine.current?.setPaused(false);
      setStatus('playing');
      stage.current?.focus({ preventScroll: true });
      return;
    }
    const current = ++generation.current;
    setStatus('loading');
    setError('');
    try {
      const loaded = await loadDoom();
      if (current !== generation.current) return;
      engine.current = loaded;
      loaded.setMuted(muted);
      setStatus('playing');
      stage.current?.focus({ preventScroll: true });
    } catch (reason) {
      if (current !== generation.current) return;
      resetDoom();
      setError(String(reason));
      setStatus('error');
    }
  };
  const restart = () => {
    releaseKeys();
    generation.current++;
    resetDoom();
    engine.current = null;
    setStats({ fps: 0, ms: 0 });
    setStatus('idle');
  };

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / (width * CELL)),
    );
    if (host.current) observer.observe(host.current);
    return () => {
      observer.disconnect();
    };
  }, [width]);

  useEffect(
    () => () => {
      generation.current++;
      resetDoom();
    },
    [],
  );

  useEffect(() => {
    if (status !== 'playing') return;
    const colors = new Uint32Array(width * height);
    const previous = new Int32Array(width * height).fill(-1);
    let raf = 0,
      last = 0,
      lastFrame = -1,
      count = 0,
      totalMs = 0,
      since = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / 30) return;
      last = now - ((now - last) % (1000 / 30));
      try {
        engine.current?.step();
        const pixels = engine.current?.pixels();
        const frame = engine.current?.frame();
        if (pixels && frame !== lastFrame) {
          const before = performance.now();
          sampleFrame(pixels, colors, width, height);
          paintFrame(cells.current, colors, previous);
          totalMs += performance.now() - before;
          count++;
          lastFrame = frame ?? -1;
        }
        if (now - since >= 1000) {
          setStats({
            fps: Math.round((count * 1000) / (now - since)),
            ms: count ? totalMs / count : 0,
          });
          count = 0;
          totalMs = 0;
          since = now;
        }
      } catch (reason) {
        setError(String(reason));
        setStatus('error');
        resetDoom();
      }
    };
    raf = requestAnimationFrame(tick);
    const blur = () => pause();
    const visibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [status, renderer, width, height]);

  const switchRenderer = (next: Renderer) => {
    releaseKeys();
    setRenderer(next);
    history.replaceState(null, '', `?renderer=${next}`);
    if (status === 'playing')
      requestAnimationFrame(() => stage.current?.focus({ preventScroll: true }));
  };
  return (
    <main>
      <header>
        <a className="wordmark" href="./">
          DOOM<span> / GRID EXPERIMENT</span>
        </a>
        <a
          href="https://x.com/sadmann17/status/2117297575070240831"
          target="_blank"
          rel="noreferrer"
        >
          The original experiment ↗
        </a>
      </header>
      <section className="intro">
        <h1>It runs DOOM.</h1>
        <p>
          {(width * height).toLocaleString()} cells. {renderers.length} renderers. One very
          different use case.
        </p>
      </section>
      <div className="toolbar">
        <div className="renderer-switch" role="group" aria-label="Grid renderer">
          {renderers.map((item) => (
            <button
              key={item.id}
              disabled={benchmarking}
              aria-pressed={renderer === item.id}
              onClick={() => switchRenderer(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="readout">
          <span>
            <strong>{status === 'playing' ? stats.fps : '—'}</strong> FPS
          </span>
          <span>{stats.ms.toFixed(1)} ms / update</span>
          <span>
            {width} × {height}
          </span>
        </div>
      </div>
      <ResolutionControl
        width={width}
        height={height}
        disabled={benchmarking}
        onChange={(next) => {
          cells.current = Array(next.width * next.height).fill(null);
          setResolution(next);
          setStats({ fps: 0, ms: 0 });
        }}
      />
      <div ref={host} className="stage-host">
        <div
          ref={stage}
          className="stage"
          tabIndex={0}
          role="application"
          aria-label="DOOM game. Arrow keys to move, Control to fire, Space to use, Escape for game menu."
          style={{ height: height * CELL * scale }}
          onKeyDown={(event) => {
            if (status !== 'playing' || event.key === 'Tab') return;
            const key =
              (!engine.current?.isMenuOrMapOpen() ? EXTRA_KEY_CODES[event.code] : undefined) ??
              getDoomKeyCode(event.nativeEvent);
            if (key === null || event.metaKey) return;
            event.preventDefault();
            event.stopPropagation();
            if (!pressed.current.has(event.code)) {
              pressed.current.set(event.code, key);
              engine.current?.key(true, key);
            }
          }}
          onKeyUp={(event) => {
            const key = pressed.current.get(event.code);
            if (key !== undefined) {
              event.preventDefault();
              engine.current?.key(false, key);
              pressed.current.delete(event.code);
            }
          }}
          onBlur={releaseKeys}
          onPointerDown={() => {
            if (status === 'playing') stage.current?.focus({ preventScroll: true });
          }}
        >
          <div
            className="grid-scale"
            aria-hidden="true"
            inert
            style={{ width: width * CELL, height: height * CELL, transform: `scale(${scale})` }}
          >
            <PixelGrid
              key={`${renderer}-${width}`}
              renderer={renderer}
              cells={cells.current}
              width={width}
              height={height}
            />
          </div>
          {status !== 'playing' && (
            <div className="overlay">
              <div>
                <span className="game-title">DOOM</span>
                <p>
                  {status === 'loading'
                    ? 'Loading the shareware episode…'
                    : status === 'paused'
                      ? 'Take a breath. Hell can wait.'
                      : status === 'error'
                        ? 'The engine could not start.'
                        : 'A classic, one cell at a time.'}
                </p>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="primary"
                  disabled={status === 'loading' || benchmarking}
                  onClick={() => void start()}
                >
                  {status === 'loading'
                    ? 'Loading…'
                    : status === 'paused'
                      ? 'Resume game'
                      : status === 'error'
                        ? 'Try again'
                        : 'Start DOOM'}
                </button>
                <small>DOOM shareware · Episode 1 · Keyboard or touch</small>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="gamebar">
        <p>
          <span className={`status-dot ${status === 'playing' ? 'active' : ''}`} />
          {status === 'playing'
            ? 'Live cell rendering'
            : status === 'paused'
              ? 'Paused'
              : 'Ready when you are'}
          <span className="version">{renderers.find((item) => item.id === renderer)?.version}</span>
        </p>
        <div>
          <button onClick={pause} disabled={status !== 'playing'}>
            Pause
          </button>
          <button
            onClick={() => {
              setMuted(!muted);
              engine.current?.setMuted(!muted);
            }}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={restart} disabled={status === 'idle' || benchmarking}>
            Restart
          </button>
        </div>
      </div>
      <div className="instructions">
        <p>
          <kbd>↑ ↓ ← →</kbd> Move & turn <kbd>Ctrl</kbd> Fire <kbd>Space</kbd> Open doors{' '}
          <kbd>Shift</kbd> Run <kbd>Esc</kbd> Menu
        </p>
        <p>WASD + F also work. Enter selects menu items. Click the game to focus.</p>
      </div>
      <div className="touch-controls" aria-label="Touch game controls">
        {[
          ['Left', 172],
          ['Forward', 173],
          ['Back', 175],
          ['Right', 174],
          ['Fire', 157],
          ['Use', 32],
          ['Enter', 13],
          ['Menu', 27],
          ['Map', 9],
        ].map(([label, code]) => (
          <button
            key={label}
            disabled={status !== 'playing'}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              pressed.current.set(`touch-${e.pointerId}`, Number(code));
              engine.current?.key(true, Number(code));
            }}
            onPointerUp={(e) => {
              engine.current?.key(false, Number(code));
              pressed.current.delete(`touch-${e.pointerId}`);
            }}
            onPointerCancel={(e) => {
              engine.current?.key(false, Number(code));
              pressed.current.delete(`touch-${e.pointerId}`);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Benchmark
        disabled={status === 'loading'}
        onStart={() => {
          setBenchmarking(true);
          if (status === 'playing') pause();
        }}
        onFinish={() => setBenchmarking(false)}
      />
      <footer>
        <p>Real grid cells and SVG heatmaps. No video or canvas overlay.</p>
        <p>
          <a href="https://github.com/hasdfa/doom-grid-comparison" target="_blank" rel="noreferrer">Source on GitHub</a> ·{' '}
          Inspired by <a href="https://github.com/sadmann7/tablecn">sadmann’s tablecn</a> ·{' '}
          <a href="./doom/README.md">Engine & credits</a> ·{' '}
          <a href="./doom/doom-wasm-source.tar.gz">Engine source</a>
        </p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
