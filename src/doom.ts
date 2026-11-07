import type { DoomWorkerRequest, DoomWorkerResponse } from './doom.worker';

// Chocolate Doom built from cloudflare/doom-wasm (see /public/doom), with sound and music.
// It runs in a Web Worker (doom.worker.ts): the page gets frames and plays its audio
export const SCREEN_WIDTH = 320;
export const SCREEN_HEIGHT = 200;

export const KEY_RSHIFT = 182;
const KEY_F1 = 187;

const DOOM_KEY_CODES: Record<string, number> = {
  Backspace: 127,
  Shift: KEY_RSHIFT,
  Control: 157,
  Alt: 184,
  ArrowLeft: 172,
  ArrowUp: 173,
  ArrowRight: 174,
  ArrowDown: 175,
  Escape: 27,
  Enter: 13,
  Tab: 9,
  ' ': 32,
};

// The modern ports' WASD scheme on top of DOOM's own. Keyed by physical key, so it
// stays put on non-QWERTY layouts
export const EXTRA_KEY_CODES: Record<string, number> = {
  KeyW: 173, // Forward, like the up arrow
  KeyS: 175, // Back, like the down arrow
  KeyA: 44, // Strafe left, DOOM's ","
  KeyD: 46, // Strafe right, DOOM's "."
  KeyE: 32, // Use, like Space
  KeyF: 157, // Fire, like Ctrl: easier to reach than Ctrl on a Mac keyboard
};

// Remapped letters would break DOOM's cheat matcher, so the page spots cheats and replays them
export const CHEAT_PATTERN =
  /id(?:dqd|kfa|fa|spispopd|clip|choppers|dt|mypos|behold[vsiral]?|clev\d\d)$/u;
const CHEATS = [
  'iddqd',
  'idkfa',
  'idfa',
  'idspispopd',
  'idclip',
  'idchoppers',
  'iddt',
  'idmypos',
  'idbehold',
  'idclev',
];

// Whether the letters typed so far, ending in the latest one, start or spell a cheat
export function getIsTypingCheat(typed: string) {
  const start = typed.lastIndexOf('id');
  if (start === -1) return false;
  const tail = typed.slice(start);
  return CHEATS.some((cheat) => cheat.startsWith(tail) || tail.startsWith(cheat));
}

export interface DoomEngine {
  dispose: () => void;
  benchmarkWalk: (durationMs: number) => void;
  pixels: () => Uint8ClampedArray | null;
  frame: () => number;
  step: () => void;
  key: (pressed: boolean, keyCode: number) => void;
  /** Mouse button bits; 1 fires. */
  mouse: (buttons: number) => void;
  setMuted: (muted: boolean) => void;
  /** Pauses or resumes a level; does nothing outside one. */
  setPaused: (paused: boolean) => void;
  /** Whether DOOM's menu or automap is open, where DOOM reads letter keys itself. */
  isMenuOrMapOpen: () => boolean;
}

// Plays the samples the worker engine streams to it, on the audio thread. Reports
// what it has taken from the queue so the worker stays a few buffers ahead. Silence
// played while the queue is empty doesn't count, or the worker would queue extra
// samples to cover it and the audio would fall behind the game

const MIN_PRESS_MS = (2 * 1000) / 35;

let enginePromise: Promise<DoomEngine> | null = null;
// Removes the current instance's worker and audio so a fresh one can start
let engineCleanup: (() => void) | null = null;

// One engine at a time, started on first use
export function loadDoom(): Promise<DoomEngine> {
  enginePromise ??= startEngine();
  return enginePromise;
}

// A trapped engine can't run again: a fresh worker starts from scratch
export function resetDoom() {
  engineCleanup?.();
  engineCleanup = null;
  enginePromise = null;
}

// DOOM takes printable keys as lowercase ASCII and function keys from its own range
export function getDoomKeyCode(event: KeyboardEvent) {
  const named = DOOM_KEY_CODES[event.key];
  if (named !== undefined) return named;
  if (event.key.length === 1) {
    return event.key.toLowerCase().codePointAt(0) ?? null;
  }
  const functionKey = /^F(?<index>1[0-2]|[1-9])$/u.exec(event.key);
  if (functionKey) return KEY_F1 + Number(functionKey.groups?.index) - 1;
  return null;
}

// Keyboard Lock API, Chromium only
export function getKeyboard() {
  return (
    navigator as Navigator & {
      keyboard?: {
        lock: (keys: string[]) => Promise<void>;
        unlock: () => void;
      };
    }
  ).keyboard;
}

export function getPlasmaColor(x: number, y: number, t: number) {
  const wave =
    Math.sin(x * 0.17 + t) +
    Math.sin(y * 0.13 + t * 1.3) +
    Math.sin((x + y) * 0.11 + t * 0.7) +
    Math.sin(Math.hypot(x - 40, y - 25) * 0.2 - t * 1.7);
  const paletteIndex = Math.floor(((wave + 4) / 8) * 255) & 255;
  const angle = (paletteIndex / 256) * Math.PI * 2;
  const r = Math.round(128 + 127 * Math.sin(angle));
  const g = Math.round(128 + 127 * Math.sin(angle + 2));
  const b = Math.round(128 + 127 * Math.sin(angle + 4));
  return (r << 16) | (g << 8) | b;
}

export function createBenchmarkDoom(signal: AbortSignal): Promise<DoomEngine> {
  return startEngine(false, signal);
}

function startEngine(shared = true, signal?: AbortSignal): Promise<DoomEngine> {
  return new Promise<DoomEngine>((resolve, reject) => {
    const worker = new Worker(new URL('./doom.worker.ts', import.meta.url), {
      type: 'module',
    });
    const audioContext = new AudioContext();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    if (!shared) gainNode.gain.value = 0;
    // Browsers start audio suspended until a user gesture
    const resumeAudio = () => {
      void audioContext.resume();
    };
    window.addEventListener('pointerdown', resumeAudio, true);
    window.addEventListener('keydown', resumeAudio, true);

    let settled = false;
    let engineDead = false;
    let frame = 0;
    let menuOrMapOpen = false;
    let pixels: Uint8ClampedArray | null = null;
    const fail = (message: string) => {
      engineDead = true;
      engine.dispose();
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };

    worker.addEventListener('message', (event: MessageEvent<DoomWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'frame') {
        // The previous frame's buffer goes back for reuse
        if (pixels) {
          const request: DoomWorkerRequest = {
            type: 'recycle',
            buffer: pixels.buffer as ArrayBuffer,
          };
          worker.postMessage(request, [pixels.buffer]);
        }
        pixels = new Uint8ClampedArray(message.buffer);
        frame = message.frame;
        menuOrMapOpen = message.menuOrMapOpen;
      } else if (message.type === 'ready') {
        if (settled) return;
        settled = true;
        resolve(engine);
      } else {
        fail(message.message);
      }
    });
    worker.addEventListener('error', (event) => {
      fail(event.message || 'The DOOM worker failed');
    });

    const held = new Map<number, number>();
    const releases = new Map<number, number>();
    let pressedAt = 0;
    let releaseTimer = 0;
    const postEvent = (event: [number, number, number, number]) => {
      const request: DoomWorkerRequest = { type: 'event', event };
      worker.postMessage(request, []);
    };

    const engine: DoomEngine = {
      dispose: () => {},
      benchmarkWalk: (durationMs) => {
        const request: DoomWorkerRequest = { type: 'benchmark-walk', durationMs };
        worker.postMessage(request);
      },
      pixels: () => pixels,
      frame: () => frame,
      step: () => {
        if (engineDead) throw new Error('The DOOM engine crashed');
      },
      // DOOM event types: 0 key down, 1 key up, 2 mouse. Printable keys also carry
      // the typed character, which menus like the save-name prompt read
      key: (pressed, keyCode) => {
        const typed = keyCode >= 32 && keyCode < 127 ? keyCode : 0;
        window.clearTimeout(releases.get(keyCode));
        if (pressed) {
          held.set(keyCode, performance.now());
          postEvent([0, keyCode, keyCode, typed]);
        } else {
          const delay = Math.max(0, (held.get(keyCode) ?? 0) + MIN_PRESS_MS - performance.now());
          releases.set(
            keyCode,
            window.setTimeout(() => {
              postEvent([1, keyCode, keyCode, typed]);
              held.delete(keyCode);
              releases.delete(keyCode);
            }, delay),
          );
        }
      },
      // DOOM reads the buttons once per tic, so a quick click whose press and release
      // land in the same tic never fires: hold the press for at least two tics
      mouse: (buttons) => {
        const pressed = buttons & 1;
        if (pressed) {
          window.clearTimeout(releaseTimer);
          pressedAt = performance.now();
          postEvent([2, 1, 0, 0]);
          return;
        }
        const wait = pressedAt + MIN_PRESS_MS - performance.now();
        releaseTimer = window.setTimeout(
          () => {
            postEvent([2, 0, 0, 0]);
          },
          Math.max(0, wait),
        );
      },
      setMuted: (muted) => {
        gainNode.gain.value = muted ? 0 : 1;
      },
      isMenuOrMapOpen: () => menuOrMapOpen,
      setPaused: (paused) => {
        const request: DoomWorkerRequest = { type: 'pause', paused };
        worker.postMessage(request, []);
      },
    };

    const abort = () => {
      engine.dispose();
      fail('Benchmark cancelled.');
    };
    let disposed = false;
    engine.dispose = () => {
      if (disposed) return;
      disposed = true;
      signal?.removeEventListener('abort', abort);
      releases.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(releaseTimer);
      worker.terminate();
      void audioContext.close();
      window.removeEventListener('pointerdown', resumeAudio, true);
      window.removeEventListener('keydown', resumeAudio, true);
    };

    if (shared) engineCleanup = engine.dispose;
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }

    const setUp = async () => {
      await audioContext.audioWorklet.addModule(
        new URL('./doom/audio-worklet.js', document.baseURI).href,
      );
      const node = new AudioWorkletNode(audioContext, 'doom-audio', {
        numberOfInputs: 0,
        outputChannelCount: [2],
      });
      node.connect(gainNode);
      // The worklet and the worker talk directly, without the main thread
      const channel = new MessageChannel();
      node.port.postMessage(channel.port1, [channel.port1]);
      const request: DoomWorkerRequest = {
        type: 'start',
        sampleRate: audioContext.sampleRate,
        audioPort: channel.port2,
      };
      worker.postMessage(request, [channel.port2]);
    };
    void setUp().catch((error: unknown) => {
      engine.dispose();
      fail(String(error));
    });
  });
}

const hexColorCache = new Map<number, string>();

export function getHexColor(rgb: number) {
  let color = hexColorCache.get(rgb);
  if (color === undefined) {
    color = `#${rgb.toString(16).padStart(6, '0')}`;
    hexColorCache.set(rgb, color);
  }
  return color;
}
