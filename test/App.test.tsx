/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { test, expect, vi } from 'vitest';
import { render, waitFor } from "@testing-library/react";
import App from "../src/App";
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from "react-redux";
import { rootReducer } from "../src/store";

const mockFetch = (data: any) => vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => data,
  }),
);

// The local `attachInternals` stub that used to live here is gone. Its premise — that
// setupTests.ts installs its polyfill only conditionally, so jsdom's incomplete
// ElementInternals wins — stopped being true in #742: that polyfill is now unconditional
// *and* faithful (a real `states` Set, a `setValidity` that records what it is given).
// This copy was the old no-op shape, so keeping it would have re-blinded this file to every
// WebAwesome validity state.

/**
 * The login screen's rendered text.
 *
 * Read out of the shadow root rather than through a text query: the page is `keep-login-page`
 * now (#806 wave 6), and testing-library's queries only see the light DOM. The route is also
 * code-split, so the element is absent until its chunk resolves — which is exactly the
 * settling this `waitFor` is here to do.
 */
const loginPageText = () => document.querySelector('keep-login-page')?.shadowRoot?.textContent ?? '';

test("renders home page", async () => {
  window.fetch = mockFetch({ ok: true, json: () => ({}) });
  const store = configureStore({ reducer: rootReducer });

  render(<Provider store={store}><App /></Provider>);

  // Wait for async effects in LoginPage (getIdpList, getKeepIdpActive, canDoPasskey)
  // to settle before the test ends, avoiding "not wrapped in act(...)" warnings
  await waitFor(() => {
    expect(loginPageText()).toMatch(/log in with password/i);
  });
});

test("goes home when the login page reports a success", async () => {
  // #806 wave 6 · #926. `keep-login-page` cannot navigate — the router is published through
  // React context with no module-level instance, and unlike `/callback` this route is behind
  // a `load`, so `RouterOutlet` renders it with no props to hand a callback to. It emits
  // `login-success` instead, and this listener is the only thing that turns that into a
  // navigation: nothing else in the suite covers the join.
  window.fetch = mockFetch({ ok: true, json: () => ({}) });
  const store = configureStore({ reducer: rootReducer });
  window.history.pushState(null, '', '/admin/ui/scope/whatever');

  render(<Provider store={store}><App /></Provider>);
  await waitFor(() => {
    expect(loginPageText()).toMatch(/log in with password/i);
  });

  document
    .querySelector('keep-login-page')!
    .dispatchEvent(new CustomEvent('login-success', { bubbles: true, composed: true }));

  await waitFor(() => {
    expect(window.location.pathname).toBe('/admin/ui/');
  });
});

test("injects no MUI document baseline on the login route", async () => {
  // #743: App.tsx's <ThemeProvider>/<CssBaseline> are gone, so nothing mounts MUI's global
  // style engine before the user authenticates. With them, this route injected six Emotion
  // <style> tags, two of which redefined the document baseline:
  //
  //   html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  //        box-sizing:border-box;-webkit-text-size-adjust:100%}
  //   body{margin:0;color:#383838;font-family:"Roboto","Helvetica","Arial",sans-serif;
  //        font-weight:400;font-size:1rem;line-height:1.5;letter-spacing:0.00938em;
  //        background-color:#f5f5f5}
  //
  // The box-sizing and margin halves are unchanged — WebAwesome's native.css sets the same
  // values, and only lost because it is in @layer wa-native while CssBaseline was unlayered.
  // The typography and colour halves now come from WebAwesome's tokens instead.
  //
  // Asserting on Emotion's injected tags rather than computed style: vitest runs with
  // `css: false`, so imported stylesheets are absent, but Emotion injects at runtime and is
  // therefore still observable.
  window.fetch = mockFetch({ ok: true, json: () => ({}) });
  const store = configureStore({ reducer: rootReducer });

  render(<Provider store={store}><App /></Provider>);
  await waitFor(() => {
    expect(loginPageText()).toMatch(/log in with password/i);
  });

  const baselineRules = [...document.querySelectorAll('style[data-emotion]')]
    .map((tag) => tag.textContent ?? '')
    .filter((css) => /(^|\})\s*(html|body)\s*\{/.test(css));

  expect(baselineRules, `MUI re-entered the login route: ${baselineRules.join(' | ')}`).toEqual([]);
});
