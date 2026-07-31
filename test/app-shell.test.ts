/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * #707 PR 3 — the `wa-page` shell.
 *
 * These are source and stylesheet scans, not renders, and that is a deliberate choice
 * rather than a shortcut. The suite runs with `css: false` and jsdom has no layout engine,
 * so a render can tell you a `<div slot="navigation">` exists but not that it is 242px wide,
 * not that `::part(menu)` painted the gradient, and not that the menu column collapsed on
 * mobile. Asserting on the rendered tree would look like coverage while proving none of the
 * things that broke during this work. #748 is the standing lesson.
 *
 * What is actually checkable here is the set of couplings that no single file can enforce
 * on its own — a breakpoint written in three places, a class name shared between a
 * component and a stylesheet, and a list of deletions. Everything geometric was verified in
 * a browser at 767/768/769px, collapsed and expanded, light and dark; the measurements are
 * in the PR.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

const shell = read('src/AppShell.tsx');
const shellCss = read('src/styles/app-shell.css');
const views = read('src/Views.tsx');
const mobileHeader = read('src/components/keep-elements/keep-mobile-header.ts');
const globalCss = read('src/styles/styles.css');
/** The footer's own copy of the breakpoint since #806 moved it out of the global sheet. */
const footerElement = read('src/components/keep-elements/keep-footer.ts');

/** Block comments dropped, so prose about a name is not mistaken for a use of it. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('AppShell on wa-page (#707)', () => {
  it('renders wa-page and nothing else as the shell', () => {
    expect(shell).toMatch(/from '@awesome\.me\/webawesome\/dist\/react\/page/);
    expect(code(shell)).toMatch(/<WaPage/);
  });

  it('maps every region it claims to use onto a real wa-page slot', () => {
    // Typo a slot name and the content silently lands in the default slot — in the middle of
    // the page, unstyled, with no error anywhere. These are the names in
    // `dist/components/page/page.d.ts`.
    const VALID = new Set([
      'banner', 'header', 'subheader', 'menu', 'navigation', 'navigation-header',
      'navigation-footer', 'navigation-toggle', 'navigation-toggle-icon', 'main-header',
      'main-footer', 'aside', 'skip-to-content', 'footer',
    ]);
    const used = [...code(shell).matchAll(/slot="([^"]+)"/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) {
      expect(VALID.has(name), `"${name}" is not a wa-page slot`).toBe(true);
    }
    expect(new Set(used)).toEqual(new Set(['header', 'navigation-header', 'navigation', 'navigation-footer']));
  });

  it('keeps the breakpoint in step across the three places that state it', () => {
    // `mobile-breakpoint` is a component property, so the two media queries cannot read it —
    // they have to repeat the number. Disagreement is invisible until the viewport sits in
    // the gap: a menu column with no menu in it, or a header bar with no room for one.
    const declared = shell.match(/MOBILE_BREAKPOINT_PX = (\d+)/);
    expect(declared, 'AppShell no longer declares MOBILE_BREAKPOINT_PX').not.toBeNull();
    const px = declared![1];

    expect(code(shell)).toContain(`(width < ${'${MOBILE_BREAKPOINT_PX}'}px)`);
    expect(code(shell)).toContain('mobileBreakpoint={`${MOBILE_BREAKPOINT_PX}px`}');

    // Same form as wa-page's own `@media screen and (width < ${breakpoint})`, so the two
    // agree on which side of the boundary pixel falls.
    // The third statement of the breakpoint used to sit in styles.css, next to the footer's
    // global rules. #806 moved the footer into a shadow root, so its media query moved with
    // it — global CSS does not cross a shadow boundary.
    for (const [label, css] of [['app-shell.css', shellCss], ['Views.tsx', views], ['keep-footer.ts', footerElement]] as const) {
      expect(css, `${label} lost its (width < ${px}px) query`).toMatch(
        new RegExp(`\\(width < ${px}px\\)`),
      );
    }
    // And nothing left behind still testing the old MUI-style boundary, which included 768.
    expect(code(shell) + code(views)).not.toMatch(/max-width:\s*768px/);
  });

  it('zeroes the menu column below the breakpoint, at matching specificity', () => {
    // wa-page hides `part(navigation)` on mobile but keeps `part(menu)`, so a leftover
    // --menu-width is a gradient-filled hole down the page. And a media query adds no
    // specificity: without repeating `.nav-collapsed` the collapsed rail wins and the hole
    // is 57px instead of 242px — narrower, and just as wrong.
    const mobileBlock = shellCss.slice(shellCss.indexOf('@media screen and (width < 768px)'));
    expect(mobileBlock).toMatch(/wa-page,\s*\n\s*wa-page\.nav-collapsed\s*\{[^}]*--menu-width:\s*0px/);
  });

  it('drives the rail from a class the stylesheet actually reads', () => {
    // The collapse state crosses from TSX to CSS by name only; nothing else links them.
    expect(code(shell)).toMatch(/className=\{collapsed \? 'nav-collapsed' : undefined\}/);
    expect(shellCss).toMatch(/wa-page\.nav-collapsed\s*\{[^}]*--menu-width:\s*57px/);
    expect(shellCss).toMatch(/^wa-page\s*\{[^}]*--menu-width:\s*242px/m);
  });

  it('never puts data-toggle-nav in the shell', () => {
    // wa-page sets `disableNavigationToggle` the moment it finds that attribute anywhere in
    // its light DOM — so borrowing it for the desktop rail removes the mobile hamburger and
    // leaves no way to open the navigation drawer at all.
    expect(code(shell)).not.toMatch(/data-toggle-nav/);
  });

  it('states the mobile header height in both places that depend on it', () => {
    // wa-page publishes the measured header height as --header-height, and ViewContainer
    // subtracts it from the viewport — so an elastic header silently resizes every page. The
    // stylesheet pre-seeds the same number for the frames before the ResizeObserver fires.
    expect(code(mobileHeader)).toMatch(/height:\s*56px/);
    expect(shellCss).toMatch(/--header-height:\s*56px/);
    expect(code(views)).toMatch(/calc\(100vh - var\(--header-height, 0px\)\)/);
  });

  it('leaves the deleted scaffolding deleted', () => {
    expect(existsSync(resolve(ROOT, 'src/components/home/HomeElement.tsx'))).toBe(false);
    expect(existsSync(resolve(ROOT, 'src/components/sidenav/MobileSidebar.tsx'))).toBe(false);
    // The sidenav became `keep-side-nav` in #806; the deletions it must not resurrect are the
    // same ones, so the scan follows the file rather than being dropped with it.
    const sidenav = read('src/components/keep-elements/keep-side-nav.ts');
    expect(existsSync(resolve(ROOT, 'src/components/sidenav/SideNav.tsx'))).toBe(false);
    for (const gone of ['SideNavContainer', 'AppContainer', 'RightPanel', 'toggle-button']) {
      expect(code(sidenav) + code(shell), `${gone} is back`).not.toContain(gone);
    }
    // This line used to read `styles/sidenav.tsx` and assert the name was not in it — the
    // module the styled container had lived in. That module is gone: #806 wave 7 removed the
    // last importer of `styles/CommonStyles` and the six files behind it went with the barrel.
    // The name is still guarded, by the loop above, against the two files that now hold the
    // shell's navigation markup; what is checked here is the half the loop cannot see, that
    // the styled-component module is not back to hold it again.
    expect(existsSync(resolve(ROOT, 'src/styles/sidenav.tsx'))).toBe(false);
    // `sidenav/style.ts` held one export, `drawerWidth = 242`, which nothing read once
    // `--menu-width` took over the two rail widths.
    expect(existsSync(resolve(ROOT, 'src/components/sidenav/style.ts'))).toBe(false);
  });

  it('does not paint over the menu gradient', () => {
    // `slot[name]:not(…)::slotted(*)` gives every named region --wa-color-surface-default,
    // which sits on top of ::part(menu)'s gradient. Outer-tree rules beat ::slotted, so the
    // reset below is what makes the sidenav visible at all.
    expect(shellCss).toMatch(/wa-page > \[slot\^='navigation'\]\s*\{[^}]*background:\s*none/);
    expect(shellCss).toMatch(/wa-page::part\(menu\)\s*\{[^}]*background-image:\s*var\(--keep-sidenav-background\)/);
    // The mobile drawer re-projects the same white-on-gradient content into a white panel.
    expect(shellCss).toMatch(/wa-page::part\(drawer__dialog\)\s*\{[^}]*background-image:\s*var\(--keep-sidenav-background\)/);
  });

  it('has no phantom margin left on the profile icon', () => {
    // `.profile-menu-dialog-user` carried `margin: 0 0 115px 8px`. That turned a 24px icon
    // into a 139px box and made the mobile header ~168px of empty white — while
    // `calc(100vh - 56px)` under-subtracted by over 100px, so the document scrolled behind
    // the panel that was already scrolling. Nothing positioned against it.
    const rule = globalCss.slice(globalCss.indexOf('.profile-menu-dialog-user'));
    // Comments stripped: the note recording the removal names the number it removed.
    const declarations = code(rule.slice(0, rule.indexOf('}')));
    expect(declarations).not.toMatch(/115px/);
    expect(declarations).toMatch(/margin-left:\s*8px/);
  });
});
