/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { a11yViolations, expectNoA11yViolations } from './test-utils/a11y';
import { ELEMENT_FIXTURES, type ElementFixture } from './test-utils/a11y-fixtures';

/**
 * The axe smoke test #713 asked for.
 *
 * The issue chose "(c) defer to the WA migration, then add an axe smoke test", and the
 * migration is done. Its second comment adds the constraint this file is built around:
 * per-file a11y work rides with each element's conversion — 42 elements already carry an
 * explicit `#713` section — so what is left is not an audit but a **guard**, something that
 * fails when the next element arrives without a name on its controls.
 *
 * ## It sweeps everything, and gives fixtures only where one is needed
 *
 * Every registered `keep-*` element is mounted and scanned. Most need nothing: an element
 * that renders no interactive content when bare has nothing for axe to object to, and
 * passes honestly.
 *
 * The ones that *do* need a fixture are the ones that render a control with no content —
 * a `keep-button` with no slotted label really has no accessible name, and flagging that
 * would be flagging the test rather than the element. Those live in `a11y-fixtures.ts`,
 * each with a note saying what it is standing in for. **A missing fixture shows up as a
 * violation, not as a silent pass**, which is the right way round.
 *
 * ## What this cannot do
 *
 * Contrast and visible focus. `vitest.config.ts` sets `css: false` and jsdom has no canvas,
 * so `color-contrast` can only ever come back "incomplete" — see `a11y-fixtures.ts` and
 * `test-utils/a11y.ts`. Those two need a browser; #944 is the worked example.
 */

/**
 * Mounting an element runs its `connectedCallback`, and a good many of these load data —
 * `keep-login-page` asks for the IdP list, `keep-schemas-list` for the databases. jsdom
 * cannot parse the relative URL those thunks build, so each one rejects, and an unhandled
 * rejection fails the run **even when every test passes**: 187 files green, exit code 1.
 *
 * The stub answers all of them with empty lists. This file is about markup, not about what
 * the server says — the thunks have their own suites — and the elements render their empty
 * state, which is a state worth scanning anyway.
 */
beforeAll(() => {
  // An empty *array*, because most of these thunks store the payload straight into a slice
  // and the components then call `.slice()` / `.find()` on it. An object payload keeps
  // `folders.ts` happy and breaks the consents pair instead; the array is the shape more of
  // them agree on.
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
    ),
  );

  // Web Awesome observes intersection in a couple of components; jsdom has no such global.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    },
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ─── anti-vacuity ────────────────────────────────────────────────────────────
//
// Everything below asserts an empty array. If axe could not see into a shadow root — where
// all but two of these elements render — every one of them would pass by looking at nothing.
// This proves it looks.

@customElement('a11y-shadow-probe')
class ShadowProbe extends LitElement {
  render() {
    return html`<button></button><img src="probe.png" />`;
  }
}

describe('the scanner can see inside a shadow root', () => {
  it('finds an unnamed button and an alt-less image through the boundary', async () => {
    const el = document.createElement('a11y-shadow-probe') as ShadowProbe;
    document.body.appendChild(el);
    await el.updateComplete;

    const ids = (await a11yViolations(el)).map((f) => f.id).sort();
    el.remove();

    expect(
      ids,
      'axe stopped crossing shadow boundaries; every assertion in this file is now vacuous',
    ).toEqual(['button-name', 'image-alt']);
  });
});

// ─── the sweep ───────────────────────────────────────────────────────────────

const mount = async (fixture: ElementFixture): Promise<HTMLElement> => {
  fixture.setup?.();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const el = document.createElement(fixture.tag) as HTMLElement & {
    updateComplete?: Promise<unknown>;
  };
  if (fixture.props) Object.assign(el, fixture.props);
  if (fixture.text) el.textContent = fixture.text;
  host.appendChild(el);
  await el.updateComplete;
  return el;
};

describe('every keep-* element passes the rules axe can check here (#713)', () => {
  it.each(ELEMENT_FIXTURES.map((f) => [f.tag, f] as const))('%s', async (tag, fixture) => {
    const el = await mount(fixture);
    try {
      await expectNoA11yViolations(el, tag);
    } finally {
      el.parentElement?.remove();
    }
  });
});
