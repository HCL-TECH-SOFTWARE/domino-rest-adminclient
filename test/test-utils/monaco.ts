import { vi } from 'vitest';

/**
 * Makes jsdom survive a real `monaco.editor.create()`.
 *
 * Monaco is exercised for real rather than mocked, because almost everything
 * `keep-monaco-editor` does *is* the Monaco integration — option forwarding,
 * model swaps, the diff editor's inner-editor quirks. A hand-written mock would
 * assert that our calls match our own assumptions instead of Monaco's actual
 * behaviour, which is precisely the class of bug worth catching here.
 *
 * Three jsdom gaps stand in the way, none related to what is under test:
 *
 * 1. **No `ResizeObserver`** — `firstUpdated()` constructs one directly.
 * 2. **No `Worker`.** `MonacoEnvironment.getWorker` spawns one per language
 *    service as soon as a `json`/`javascript` model is created. The stub below
 *    never answers, so language *diagnostics* (squiggles, schema validation)
 *    simply never arrive — none of which is under test here. Without it the
 *    failure is an uncaught `ReferenceError` on a timer, well after the test
 *    body has returned.
 * 3. **No canvas 2D context.** Without the optional `canvas` npm package
 *    `getContext('2d')` returns `null`, and Monaco dereferences it in two
 *    places: `pixelRatio.js` reads `webkitBackingStorePixelRatio` off it during
 *    editor construction, and the minimap calls `createImageData` on it during
 *    the first async render — the latter surfacing as an unhandled error *after*
 *    the test body finishes, since the minimap renders on a timer.
 *
 * The stub returns plausible geometry (8px glyphs) rather than zeroes, so
 * Monaco's layout maths produces finite values.
 */
export function installMonacoDomStubs(): void {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  if (!globalThis.Worker) {
    globalThis.Worker = class {
      onmessage: unknown = null;
      onerror: unknown = null;
      postMessage() {}
      terminate() {}
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return false;
      }
    } as unknown as typeof Worker;
  }

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    canvas: null,
    measureText: (text: string) => ({ width: text.length * 8 }),
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    getImageData: (_x: number, _y: number, width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillText: () => {},
    strokeText: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    setTransform: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    rect: () => {},
    stroke: () => {},
    fill: () => {},
    clip: () => {},
    drawImage: () => {},
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

/**
 * Captures the errors Monaco raises internally, so a test can assert on them.
 *
 * Monaco does not throw at the call site. Its `ErrorHandler` default sink rethrows
 * inside a `setTimeout(…, 0)`, which lands as a **process-level uncaught exception**
 * — not a `window` error event, and not a rejected promise. So an
 * `expect(() => el.remove()).not.toThrow()` passes even while Monaco is reporting a
 * broken invariant, which is precisely how the dispose-ordering bug shipped.
 *
 * Vitest's own listeners are removed for the duration and restored afterwards. That
 * is not a loosening: everything is recorded, so a test that asserts the list is
 * empty fails on *any* uncaught error, expected or not.
 *
 * @returns `{ errors, restore }` — assert on `errors`, call `restore()` in `afterAll`.
 */
export function captureMonacoErrors(): { errors: unknown[]; restore: () => void } {
  const errors: unknown[] = [];
  const original = process.listeners('uncaughtException');
  process.removeAllListeners('uncaughtException');

  const capture = (err: unknown) => {
    if (isMonacoCancellation(err)) return;
    errors.push(err);
  };
  process.on('uncaughtException', capture);

  return {
    errors,
    restore: () => {
      process.off('uncaughtException', capture);
      for (const listener of original) {
        process.on('uncaughtException', listener);
      }
    },
  };
}

/** Monaco's `CancellationError` — thrown by `Delayer.cancel()` on dispose. */
function isMonacoCancellation(reason: unknown): boolean {
  return reason instanceof Error && reason.name === 'Canceled' && reason.message === 'Canceled';
}

/**
 * Stops Monaco's dispose-time cancellations from failing the run.
 *
 * Disposing an editor disposes its contributions, and `WordHighlighter`'s
 * `Delayer` rejects its in-flight promise with a `CancellationError` that nobody
 * awaits. The promise is in flight because the stubbed worker never answers, so
 * every teardown leaves one pending. Monaco does this by design and filters
 * cancellations at its own top level; Node sees a bare unhandled rejection and
 * Vitest exits 1 even though all tests passed.
 *
 * This replaces Vitest's `unhandledRejection` listeners with one that drops
 * *only* those, delegating everything else to the originals — so a genuine
 * unhandled rejection still fails the run.
 *
 * @returns a restore function; call it in `afterAll`.
 */
export function ignoreMonacoCancellations(): () => void {
  const original = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');

  const filtered = (reason: unknown, promise: Promise<unknown>) => {
    if (isMonacoCancellation(reason)) return;
    for (const listener of original) {
      listener.call(process, reason as Error, promise);
    }
  };
  process.on('unhandledRejection', filtered);

  return () => {
    process.off('unhandledRejection', filtered);
    for (const listener of original) {
      process.on('unhandledRejection', listener);
    }
  };
}
