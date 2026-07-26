// Global Vitest setup — wired in via vitest.config.ts `test.setupFiles`.
// (Under the old Jest config this file existed but was never loaded, so the
// stubs below were copy-pasted into individual test files. They now live here.)

// jest-dom matchers, registered against Vitest's `expect`.
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'node:util';

// Was jest.config `globals` — some jsdom builds need these for uuid/nanoid/react-router.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Custom-element form internals (WebAwesome / Lit). Installed UNCONDITIONALLY:
// jsdom 29 ships its own attachInternals whose ElementInternals is incompatible
// with WebAwesome's form-associated elements (e.g. <wa-button> calls
// `internals.setValidity`, which jsdom's version lacks), throwing during Lit's
// update cycle. Always provide a complete no-op mock instead.
HTMLElement.prototype.attachInternals = function () {
  return {
    setValidity: () => {},
    checkValidity: () => true,
    reportValidity: () => true,
    setFormValue: () => {},
    states: { add: () => {}, delete: () => {}, has: () => false, clear: () => {} },
    form: null,
    labels: [],
    validity: {},
    validationMessage: '',
    willValidate: true,
    shadowRoot: null,
  } as unknown as ElementInternals;
};

// jsdom does not implement <dialog> modal methods (previously stubbed per test file).
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = vi.fn();
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = vi.fn();
}

// jsdom does not implement the Popover / top-layer API used by keep-alert.
if (!HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
  HTMLElement.prototype.togglePopover = function () {
    return false;
  };
}

// Some modules read localStorage at import time (e.g. store/styles/reducer.ts).
// jsdom does not always expose it before module evaluation, so provide a stub.
if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage == null) {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}

// MUI reads matchMedia on mount.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Monaco probes this at import time (clipboard/browser/clipboard.js) to decide
// whether to register its paste command. jsdom implements neither this
// long-deprecated API nor `navigator.clipboard`, so the bare property access
// throws and takes down every suite that transitively imports KeepElements.
// Reporting `false` is accurate for jsdom and simply leaves the command
// unregistered.
if (!document.queryCommandSupported) {
  document.queryCommandSupported = vi.fn().mockReturnValue(false);
}
