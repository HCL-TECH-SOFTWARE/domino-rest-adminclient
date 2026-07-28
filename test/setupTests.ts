/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

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
// jsdom 29 ships its own attachInternals whose ElementInternals implements none of the
// form-validity API — no `setValidity`, `validity`, `checkValidity`, `reportValidity`,
// `willValidate` or `states` — so WebAwesome's form-associated elements throw during
// Lit's update cycle the moment they call `internals.setValidity`.
//
// This replacement is deliberately *faithful*, not a no-op. The version it replaces
// answered `checkValidity: () => true`, `validity: {}`, and gave `states` a `has()` that
// always returned `false`. That made every WebAwesome validity state permanently
// unobservable: no test in this repo could see a field go invalid, which is exactly how
// the dead `data-user-invalid` selectors in #742 survived unnoticed. `states` is now a
// real `Set` (WA's `customStates` helper only needs add/delete/has) and `setValidity()`
// records what it is handed, so validity behaviour is assertable.
//
// Not emulated, by design: jsdom does not implement the `:state()` CSS selector, so
// tests assert that a custom state is *set*, never that a style rule matched it. The
// mock also does not fire the `invalid` event that a real `reportValidity()` would —
// WebAwesome sets `hasInteracted` itself inside `reportValidity()`, so nothing depends
// on it here.
HTMLElement.prototype.attachInternals = function () {
  const states = new Set<string>();
  let validity: Record<string, boolean> = { valid: true };
  let validationMessage = '';

  return {
    setValidity(flags?: ValidityStateFlags, message?: string) {
      const failed = Object.entries(flags ?? {})
        .filter(([, isSet]) => isSet)
        .map(([flag]) => flag);
      // Per spec an empty (or all-false) flags object means "valid".
      validity = { valid: failed.length === 0, ...Object.fromEntries(failed.map((f) => [f, true])) };
      validationMessage = failed.length === 0 ? '' : (message ?? '');
    },
    checkValidity: () => validity.valid,
    reportValidity: () => validity.valid,
    get validity() {
      return validity as unknown as ValidityState;
    },
    get validationMessage() {
      return validationMessage;
    },
    setFormValue: () => {},
    states,
    form: null,
    labels: [],
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

// jsdom implements neither of the deprecated execCommand APIs. monaco-editor's clipboard
// contribution (clipboard/browser/clipboard.js) calls queryCommandSupported at MODULE
// scope to decide whether to register its paste command, so merely importing anything
// that reaches `monaco-editor` throws before a single test runs — and KeepElements.tsx
// imports keep-monaco-editor, so that is every component test going through the React
// bridge. Reporting `false` is accurate for jsdom and simply leaves the command
// unregistered; stubbing both here keeps the failure from being load-bearing on import
// order.
// (The durable fix is to make keep-monaco-editor's Monaco import dynamic; see reports/01.)
if (!document.queryCommandSupported) {
  document.queryCommandSupported = () => false;
  document.execCommand = () => false;
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
