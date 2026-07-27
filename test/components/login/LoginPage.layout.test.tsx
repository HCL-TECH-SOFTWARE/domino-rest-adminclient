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

  it('leaves exactly two CssBaseline mounts in the app', () => {
    // Was three (App.tsx, HomeElement.tsx, LoginPage.tsx). Report 03 §6 step 5 removes the
    // remaining two; App.tsx's is the next one to go, once the typography change that
    // follows it has been decided (#705). Update this count when that lands.
    const mounts = sources('.')
      .filter(({ text }) => /<CssBaseline\s*\/>/.test(code(text)))
      .map(({ file }) => file)
      .sort();
    expect(mounts).toEqual(['src/App.tsx', 'src/components/home/HomeElement.tsx']);
  });

  it('renders the form panel and the background panel', async () => {
    await renderPage();
    expect(document.querySelector('.login-page-grid')).not.toBeNull();
    expect(document.querySelector('.login-castle-bg')).not.toBeNull();
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
    expect(toggle!.querySelector('svg')).not.toBeNull();
  });
});
