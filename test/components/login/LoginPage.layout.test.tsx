/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { act } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

/**
 * #743 part 1 — `LoginPage` no longer imports Material UI.
 *
 * The page used six `@mui/material` primitives (`Grid`, `Paper`, `Box`, `Link`,
 * `useMediaQuery`, `CssBaseline`) plus two `@mui/icons-material` glyphs, none of which read
 * the MUI theme. They are replaced by a CSS grid, plain elements and `react-icons`.
 *
 * **Layout fidelity is not asserted here and cannot be.** `vitest.config.ts` sets
 * `css: false`, and jsdom has no layout engine, so nothing in this suite can tell a 60/40
 * grid from the flex row it replaced. The 767/768/769px behaviour needs a browser check.
 * What is asserted is the structure the CSS hangs off, and that MUI cannot creep back in.
 */

const walk = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, match);
    return match.test(entry.name) ? [path] : [];
  });

const SRC = resolve(process.cwd(), 'src');
const rel = (file: string) => file.slice(resolve(process.cwd()).length + 1);

/** Whole-line comments removed, so the note explaining the swap is not an offender. */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

const sources = (dir: string) =>
  walk(resolve(SRC, dir), /\.tsx?$/).map((file) => ({ file: rel(file), text: readFileSync(file, 'utf8') }));

vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  getIdpList: vi.fn(async () => []),
  getKeepIdpActive: vi.fn(async () => false),
}));

const ACCOUNT = { error: false, error401: false, idpLogin: false, errorMessage: '' };

describe('LoginPage without Material UI (#743)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const renderPage = async () => {
    const { default: LoginPage } = await import('../../../src/components/login/LoginPage');
    await act(async () => {
      renderWithProviders(<LoginPage />, { preloadedState: { account: ACCOUNT }, route: '/' });
    });
  };

  it('imports no Material UI anywhere under components/login', () => {
    const offenders = sources('components/login')
      .filter(({ text }) => /from\s+['"]@mui\//.test(code(text)))
      .map(({ file }) => file);
    expect(offenders, `these still import MUI: ${offenders.join(', ')}`).toEqual([]);
  });

  it('leaves exactly one CssBaseline mount in the app', () => {
    // Was three — App.tsx, HomeElement.tsx, LoginPage.tsx. LoginPage's went with the MUI
    // removal and App.tsx's followed once it had no consumer left. HomeElement's is the
    // last, and goes with the rest of the MUI theme layer (report 03 §6 step 5, #709).
    const mounts = sources('.')
      .filter(({ text }) => /<CssBaseline\s*\/>/.test(code(text)))
      .map(({ file }) => file)
      .sort();
    expect(mounts).toEqual(['src/AppShell.tsx']);
  });

  it('leaves theme.ts with a single importer', () => {
    // The MUI theme object itself. One importer left (HomeElement) means one ThemeProvider
    // left; when this reaches zero, theme.ts can be deleted outright.
    const importers = sources('.')
      .filter(({ file, text }) => file !== 'src/theme.ts' && /from\s+'\.{1,2}(\/\.\.)*\/theme'/.test(code(text)))
      .map(({ file }) => file);
    expect(importers).toEqual(['src/AppShell.tsx']);
  });

  it('renders the form panel and the background panel', async () => {
    await renderPage();
    expect(document.querySelector('.login-page-grid')).not.toBeNull();
    expect(document.querySelector('.login-castle-bg')).not.toBeNull();
  });

  it('never makes the theme toggle a direct child of the grid', async () => {
    // The regression this exists for. `<keep-tooltip>` — the theme toggle's wrapper — was a
    // direct child of the layout, so `grid-template-columns: 60% 40%` auto-placed *it* into
    // cell one, pushing the form panel into column two and the background image onto a
    // second row. Under the previous MUI `<Grid container>` it was invisible: as a flex item
    // the wrapper collapsed to zero width, because its only child is absolutely positioned.
    //
    // It now sits inside ThemeToggleSlot, which is `position: absolute` and therefore not a
    // grid item at all. jsdom cannot check that — `css: false`, and no layout engine — so
    // this asserts the structural precondition instead: a `keep-tooltip` parented directly
    // by the layout is a bug whatever the CSS says. The rendered result needs a browser.
    await renderPage();
    const layout = document.querySelector('.login-page-grid')!.parentElement!;
    const tooltip = document.querySelector('keep-tooltip');

    expect(tooltip).not.toBeNull();
    expect(layout.contains(tooltip!)).toBe(true);
    expect(tooltip!.parentElement).not.toBe(layout);
  });

  it('orders the form panel before the background panel', async () => {
    await renderPage();
    const layout = document.querySelector('.login-page-grid')!.parentElement!;
    const panels = [...layout.children].filter((el) => /login-(page-grid|castle-bg)/.test(el.className));

    expect(panels.map((el) => el.className.split(' ').find((c) => c.startsWith('login-')))).toEqual([
      'login-page-grid',
      'login-castle-bg',
    ]);
  });

  it('always renders the background panel, leaving the breakpoint to CSS', async () => {
    // It used to be gated on `useMediaQuery('(max-width:768px)')`, so the page re-rendered
    // on resize and the panel left the DOM entirely. It is now hidden by a media query.
    await renderPage();
    // matchMedia is stubbed to `matches: false` in setupTests, i.e. the desktop case; the
    // panel must be present regardless, since no JS decides this any more.
    expect(document.querySelectorAll('.login-castle-bg')).toHaveLength(1);
  });

  it('opens the passkey.org link with rel="noreferrer"', async () => {
    // The passkey block renders only under https (WebAuthn requires a secure context) and
    // the jsdom document is served over http, so the protocol has to be stubbed to reach it.
    const real = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...real, protocol: 'https:' },
    });
    try {
      await renderPage();
      const link = document.querySelector('a[href="https://passkey.org"]') as HTMLAnchorElement | null;
      expect(link).not.toBeNull();
      expect(link!.target).toBe('_blank');
      // `target="_blank"` without this hands the opened page a `window.opener` reference.
      expect(link!.rel).toBe('noreferrer');
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: real });
    }
  });

  it('renders the theme toggle', async () => {
    await renderPage();
    const toggle = document.querySelector('keep-tooltip button');
    expect(toggle).not.toBeNull();
    // This asserted `querySelector('svg')` while the toggle used react-icons, which put
    // the graphic straight in the light DOM. `wa-icon` renders its `<svg>` inside a shadow
    // root (#718), so that can no longer match however correct the markup is. Asserting the
    // glyph name instead is narrower than the old check, not weaker: `svg` was satisfied by
    // any graphic, this only by the theme icon.
    const icon = toggle!.querySelector('wa-icon') as (HTMLElement & { name?: string }) | null;
    expect(icon).not.toBeNull();
    expect(icon!.name).toMatch(/^(moon|sun)$/);
  });
});
