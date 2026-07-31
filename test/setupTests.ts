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
import { afterEach, beforeEach, vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'node:util';
import { Router, memoryHistory } from '../src/router/router';
import { resetRouterForTest, setRouterForTest } from '../src/router/instance';

/**
 * A fresh in-memory router per test (#926).
 *
 * The router became a module singleton so that a Lit element could reach it without a React
 * provider — which means it now needs the same per-test teardown the store gets, or one
 * test's navigation is still the current location when the next one mounts.
 *
 * Installing one is as important as resetting it. Without an installed router `getRouter()`
 * falls back to a **browser-backed** one over jsdom's `window.location`, and jsdom's window
 * is shared by every test in a file: a `pushState` in one test would still be the URL in the
 * next, and disposing the router does not undo it. A memory history has no such reach.
 *
 * Global rather than per-suite, because a suite cannot tell from its own imports whether it
 * needs this — any element carrying a `RouterController` reaches the singleton, including one
 * a test only mounts as a child of something else.
 *
 * A test that wants a specific URL calls `setRouterForTest` with its own; a test that wants
 * the *real* address bar (`test/App.test.tsx` has the only one) calls `resetRouterForTest`
 * and lets the next `getRouter()` build a browser-backed router.
 */
beforeEach(() => {
  setRouterForTest(new Router({ history: memoryHistory(['/']) }));
});

afterEach(() => {
  resetRouterForTest();
});

// Silence Lit's "Lit is in dev mode" banner (#918) — one stderr line per test file that
// touches a Lit or WebAwesome element, so it scales with the suite: 77 lines per full run
// at 5d4567a. It is per-file rather than per-run because `litIssuedWarnings` is a
// per-realm global and Vitest isolates each test file. This is Lit's own escape hatch,
// not a console patch: `issueWarning(code, warning)` skips any warning whose *code* is
// already in `globalThis.litIssuedWarnings`, and reactive-element's comment says so —
// "disabling via `code` can be done by users". Suppressing by code rather than by message
// means the other dev-mode diagnostics (`change-in-update`, `multiple-versions`, …) still
// print; those catch real bugs. Must run before the microtask that issues it, which any
// setup file does. Vitest resolves Lit's `development` export condition, so the dev build
// is what the suite loads — and should be: it validates more than the production build.
(globalThis as { litIssuedWarnings?: Set<string> }).litIssuedWarnings ??= new Set();
(globalThis as { litIssuedWarnings?: Set<string> }).litIssuedWarnings!.add('dev-mode');

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
// `show()` belongs with its two siblings: it is the non-modal open, and it is what
// `wa-popover` calls. Without it the popover rejects on open and simply never appears —
// which reads in a test as "the panel did not render" rather than as a missing stub.
if (!HTMLDialogElement.prototype.show) {
  HTMLDialogElement.prototype.show = vi.fn();
}

// jsdom does not implement the Popover / top-layer API used by keep-alert.
if (!HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
  HTMLElement.prototype.togglePopover = function () {
    return false;
  };
}

// jsdom does not implement the Web Animations API. Web Awesome's show/hide helpers call
// `getAnimations()` from a requestAnimationFrame callback to wait out a transition, so any
// test that *opens* a wa-drawer or wa-dialog raised an unhandled TypeError from a timer —
// outside any test's stack, which is why it surfaced as "Vitest caught N unhandled errors"
// rather than a failure. An empty list is the truthful answer here: nothing animates in jsdom,
// so the helpers proceed immediately.
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = function () {
    return [];
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
