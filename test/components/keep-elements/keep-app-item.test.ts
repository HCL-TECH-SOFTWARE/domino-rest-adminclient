/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deepQueryAll } from '../../test-utils/shadow';
import '../../../src/components/keep-elements/keep-app-item';
import type AppItem from '../../../src/components/keep-elements/keep-app-item';
import { generateSecret } from '../../../src/store/applications/action';
import { toggleAlert } from '../../../src/store/alerts/action';

vi.mock('../../../src/store/applications/action', () => ({
  generateSecret: vi.fn(() => ({ type: 'GENERATE_SECRET' })),
}));
vi.mock('../../../src/store/alerts/action', () => ({
  toggleAlert: vi.fn(() => ({ type: 'TOGGLE_ALERT' })),
}));
// The icon is a real custom element, so there is no component left to stand in for. What the
// stand-in was keeping out of this file is the 221 KB payload chunk the element imports on
// connect (#772) — so that is what is mocked, and the element renders for real, showing its
// placeholder because the map comes back empty.
vi.mock('../../../src/styles/app-icons', () => ({ default: {} }));

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    appName: 'Timesheets',
    appDescription: 'Track hours',
    appCallbackUrls: [],
    appContacts: [],
    appIcon: 'beach',
    appId: 'app-123',
    appScope: 'read',
    appHasSecret: false,
    appSecret: '',
    appStartPage: 'https://example.test/start',
    appStatus: 'isActive',
    usePkce: false,
    ...overrides,
  } as AppItem['app'];
}

/**
 * The element renders into the light DOM, so it mounts inside a real `<tbody>` — which is
 * both what the table does and the only place a `<tr>` can legally live.
 */
const tables: HTMLTableElement[] = [];

afterEach(() => {
  tables.forEach((table) => table.remove());
  tables.length = 0;
});

beforeEach(() => {
  vi.mocked(generateSecret).mockClear();
  vi.mocked(toggleAlert).mockClear();
});

async function mount(app = makeApp()) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  document.body.appendChild(table);
  tables.push(table);

  const el = document.createElement('keep-app-item') as AppItem;
  el.app = app;
  tbody.appendChild(el);
  await el.updateComplete;

  const edits: CustomEvent[] = [];
  const deletes: CustomEvent[] = [];
  el.addEventListener('app-edit', (e) => edits.push(e as CustomEvent));
  el.addEventListener('app-delete', (e) => deletes.push(e as CustomEvent));
  return { el, edits, deletes };
}

/**
 * The `<button>` inside the `keep-tooltip` whose copy is `content`.
 *
 * `getByRole('button', { name: … })` could not find these before the conversion:
 * `keep-tooltip` sets `role="tooltip"` on its *own* popup and projects the trigger through a
 * plain slot, so a tooltip gives its trigger no accessible name at all. Every one of these
 * controls now carries its own `aria-label` (#713) — which is asserted separately — but the
 * lookup stays by tooltip copy, because that is what pins the tooltip text as a side effect
 * and it is stable against layout changes.
 */
function tooltipButton(content: string): HTMLButtonElement {
  const host = deepQueryAll('keep-tooltip').find(
    (t) => (t as unknown as { content?: string }).content === content,
  );
  if (!host) {
    const seen = tooltipCopy().join(', ');
    throw new Error(`No keep-tooltip with content "${content}". Seen: [${seen}]`);
  }
  const button = host.querySelector('button');
  if (!button) throw new Error(`keep-tooltip "${content}" wraps no button`);
  return button;
}

/** Copy of every tooltip currently rendered — for absence assertions. */
const tooltipCopy = () =>
  deepQueryAll('keep-tooltip').map((t) => (t as unknown as { content?: string }).content);

/** The first node in the row whose trimmed text is exactly `value`. */
const textOf = (value: string) =>
  Array.from(document.querySelectorAll('td *')).find((n) => n.textContent?.trim() === value);

describe('keep-app-item — identity', () => {
  it('registers the custom element', () => {
    expect(customElements.get('keep-app-item')).toBeTruthy();
  });

  it('renders into the light DOM so the table sheets reach its cells', async () => {
    const { el } = await mount();
    expect(el.shadowRoot).toBeNull();
  });

  it('keeps the row and its confirmation as siblings under the element', async () => {
    // A Lit template is parsed by setting innerHTML on a `<template>`, which puts a bare
    // `<tr>` into the table insertion modes — where a following `<dialog>` is a parse error
    // that foster-parents the node. It lands in the template contents either way, but this
    // pins it: if a future edit moved the dialog out of this element, `showModal` would open
    // a confirmation the row no longer owns.
    const { el } = await mount();
    const kids = Array.from(el.children).map((n) => n.tagName);
    expect(kids).toContain('TR');
    expect(kids).toContain('DIALOG');
  });
});

describe('keep-app-item — layout', () => {
  it('renders five cells in the data row', async () => {
    await mount();
    const row = document.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.querySelectorAll('td')).toHaveLength(5);
  });

  it('shows the app name and description', async () => {
    await mount();
    expect(textOf('Timesheets')).toBeTruthy();
    expect(textOf('Track hours')).toBeTruthy();
  });

  it('shows the app id', async () => {
    await mount();
    expect(textOf('app-123')).toBeTruthy();
  });
});

describe('keep-app-item — launching', () => {
  it('opens the start page for an active app', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      await mount();
      tooltipButton('Launch Timesheets').click();
      expect(open).toHaveBeenCalledWith('https://example.test/start');
    } finally {
      // try/finally so a failed assertion above still restores window.open instead of
      // leaking a stub into every later test in this file.
      open.mockRestore();
    }
  });

  it('offers no launch button for a disabled app', async () => {
    await mount(makeApp({ appStatus: 'disabled' }));
    expect(tooltipCopy()).not.toContain('Launch Timesheets');
    // The disabled app gets the inactive-marker tooltip instead — asserting that too keeps
    // this from passing merely because the row failed to render at all.
    expect(tooltipCopy()).toContain('This application is inactive.');
  });

  it('names the launch control, which the tooltip never did (#713)', async () => {
    await mount();
    expect(tooltipButton('Launch Timesheets').getAttribute('aria-label')).toBe(
      'Launch Timesheets',
    );
  });

  it('gives the inactive marker a text alternative (#713)', async () => {
    await mount(makeApp({ appStatus: 'disabled' }));
    const marker = document.querySelector('[role="img"]');
    expect(marker?.getAttribute('aria-label')).toBe('This application is inactive.');
  });

  it('shows neither control for a status it does not recognise', async () => {
    // The cell tests the two strings it knows and renders nothing otherwise. The store holds
    // four status words, so this is reachable rather than theoretical.
    await mount(makeApp({ appStatus: 'Requested' }));
    expect(document.querySelector('td.expand')!.children).toHaveLength(0);
  });
});

describe('keep-app-item — secrets', () => {
  it('offers to generate a secret when the app has none', async () => {
    await mount();
    expect(textOf('Click to Generate Secret')).toBeTruthy();
    // Rule out the other two branches, not just confirm this one: a fixture with
    // `appHasSecret: false, usePkce: false` should render neither the masked-secret nor the
    // PKCE marker.
    expect(textOf('********************')).toBeUndefined();
    expect(textOf('PKCE')).toBeUndefined();
  });

  it('generates the secret when asked', async () => {
    await mount();
    (textOf('Click to Generate Secret')!.closest('button') as HTMLButtonElement).click();
    // Pin the arguments, not just that some dispatch happened: a call with the wrong appId,
    // the wrong appStatus, or with the two callbacks swapped would all pass a bare
    // `toHaveBeenCalled()`.
    expect(generateSecret).toHaveBeenCalledWith(
      'app-123',
      'isActive',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('masks an existing secret rather than showing it', async () => {
    await mount(makeApp({ appHasSecret: true }));
    expect(textOf('********************')).toBeTruthy();
    expect(textOf('Click to Generate Secret')).toBeUndefined();
    expect(textOf('PKCE')).toBeUndefined();
  });

  it('shows PKCE instead of a secret when the app uses it', async () => {
    await mount(makeApp({ usePkce: true }));
    expect(textOf('PKCE')).toBeTruthy();
    // The whole "App Secret:" block — label plus whichever of the four secret states — lives
    // behind the same `usePkce` branch, so ruling out the label rules out all of them at
    // once. Exact text, not a substring match: the row always renders a (closed) confirmation
    // titled "Regenerate App Secret?", which a loose /App Secret/ match would also hit.
    expect(textOf('App Secret:')).toBeUndefined();
  });
});

describe('keep-app-item — actions', () => {
  it('reports the app values for the form and lets the parent open the drawer', async () => {
    const { edits } = await mount();
    tooltipButton('Edit Application').click();
    expect(edits).toHaveLength(1);
    expect(edits[0].detail.values).toEqual(
      expect.objectContaining({ appId: 'app-123', appName: 'Timesheets', appStatus: true }),
    );
  });

  it('reports the app status as a boolean derived from isActive', async () => {
    const { edits } = await mount(makeApp({ appStatus: 'disabled' }));
    tooltipButton('Edit Application').click();
    expect(edits[0].detail.values).toEqual(expect.objectContaining({ appStatus: false }));
  });

  it('sorts and joins the callback urls and contacts', async () => {
    const { edits } = await mount(
      makeApp({ appCallbackUrls: ['b/cb', 'a/cb'], appContacts: ['zoe@x', 'ann@x'] }),
    );
    tooltipButton('Edit Application').click();
    expect(edits[0].detail.values.appCallbackUrlsStr).toBe('a/cb\nb/cb');
    expect(edits[0].detail.values.appContactsStr).toBe('ann@x\nzoe@x');
  });

  it('leaves the three optional fields empty when the record has none', async () => {
    // Each of the three is guarded by a null-or-empty check, and an app created without a
    // start page, callbacks or contacts takes the other side of all three.
    const { edits } = await mount(
      makeApp({ appStartPage: '', appCallbackUrls: null, appContacts: null }),
    );
    tooltipButton('Edit Application').click();
    expect(edits[0].detail.values).toEqual(
      expect.objectContaining({ appStartPage: '', appCallbackUrlsStr: '', appContactsStr: '' }),
    );
  });

  it('strips whitespace out of the start page', async () => {
    const { edits } = await mount(makeApp({ appStartPage: 'https://example.test/ start ' }));
    tooltipButton('Edit Application').click();
    expect(edits[0].detail.values.appStartPage).toBe('https://example.test/start');
  });

  it('deletes by app id', async () => {
    const { deletes } = await mount();
    tooltipButton('Delete Application').click();
    expect(deletes).toHaveLength(1);
    expect(deletes[0].detail.appId).toBe('app-123');
  });

  it('names the edit and delete controls (#713)', async () => {
    await mount();
    expect(tooltipButton('Edit Application').getAttribute('aria-label')).toBe('Edit Application');
    expect(tooltipButton('Delete Application').getAttribute('aria-label')).toBe(
      'Delete Application',
    );
  });
});

/**
 * The two copy controls.
 *
 * The values passed to the clipboard changed with the conversion, and deliberately. The
 * original read `currentTarget.innerText`, which jsdom answers `undefined` for every element
 * — so the assertions these replace could only pin `Copied undefined to clipboard`, which is
 * jsdom's behaviour rather than the app's. The element passes the value it rendered, which in
 * a browser is the same string `innerText` returned, so the assertions can finally say what a
 * user actually gets.
 */
describe('keep-app-item — copy to clipboard', () => {
  it('writes to the Clipboard API and reports success when it is available', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
    try {
      await mount();
      tooltipButton('Copy App Id').click();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('app-123');
      expect(toggleAlert).toHaveBeenCalledWith('Copied app-123 to clipboard');
    } finally {
      // Mirrors the window.open try/finally above: restore jsdom's default (no Clipboard API)
      // so this stub cannot leak into the next test regardless of pass/fail.
      delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    }
  });

  it('reports a failed copy when the Clipboard API is unavailable', async () => {
    const original = (navigator as unknown as { clipboard?: unknown }).clipboard;
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    try {
      // Confirms the fixture this test relies on — jsdom's real default, not an assumption.
      expect(navigator.clipboard).toBeUndefined();
      await mount();
      tooltipButton('Copy App Id').click();
      // Trailing space before the closing delimiter is in the original source — pinned
      // verbatim, not a typo introduced here.
      expect(toggleAlert).toHaveBeenCalledWith(
        'Failed to copy to clipboard. Please copy by yourself: app-123 ',
      );
    } finally {
      if (original !== undefined) {
        Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true });
      }
    }
  });

  it('offers the copy controls as buttons, so a keyboard can reach them (#713)', async () => {
    await mount(makeApp({ appSecret: 'sekrit-value' }));
    expect(tooltipButton('Copy App Id').tagName).toBe('BUTTON');
    expect(tooltipButton('Copy Application Secret').tagName).toBe('BUTTON');
  });
});

/**
 * #844 — the row rendered a secret that was always blank.
 *
 * Two defects, characterized during the #771 table work and fixed since. Both came from the
 * same slip: **the branch tested the record and rendered the state.**
 *
 * - `app.appSecret?.length > 0` guarded the visible-secret branch, but a component-local
 *   empty string written only by `generateSecret`'s callback is what it printed. So any app
 *   whose secret came back from the API showed a "Copy Application Secret" tooltip over empty
 *   text.
 * - the refresh control set the just-generated flag outside its own branch, so merely opening
 *   the confirmation flipped the row into that same empty branch before the user had
 *   confirmed, and left it there on cancel.
 */
describe('keep-app-item — the visible-secret branch (#844)', () => {
  it('shows the secret the API supplied', async () => {
    await mount(makeApp({ appSecret: 'sekrit-value' }));
    // Rule out the sibling branches first: appHasSecret is false and usePkce is false, so
    // neither the generate-prompt nor the masked-with-refresh branch should render.
    expect(textOf('Click to Generate Secret')).toBeUndefined();
    expect(textOf('********************')).toBeUndefined();
    expect(tooltipCopy()).toContain('Copy Application Secret');

    expect(tooltipButton('Copy Application Secret').textContent?.trim()).toBe('sekrit-value');
  });

  it('keeps offering to generate when there is genuinely no secret', async () => {
    await mount(makeApp({ appSecret: '' }));
    expect(textOf('Click to Generate Secret')).toBeTruthy();
    expect(tooltipCopy()).not.toContain('Copy Application Secret');
  });

  it('treats an absent secret as no secret, not as a length of zero', async () => {
    // The list action leaves `appSecret` null for an app that has never had one, and the
    // guard reads its length. Unguarded that throws out of render for every such row.
    await mount(makeApp({ appSecret: null }));
    expect(textOf('Click to Generate Secret')).toBeTruthy();
  });

  it('leaves the masked secret alone until the regeneration is confirmed', async () => {
    // The refresh control opens "Regenerate App Secret?" and nothing more. It used to also
    // set the just-generated flag, blanking the row before the user answered.
    const { el } = await mount(makeApp({ appHasSecret: true }));
    regenerateButton().click();
    await el.updateComplete;

    // The confirmation is genuinely up — asserted explicitly rather than inferred from the
    // two negatives below, which would also hold if the control did nothing at all.
    expect(el.confirming).toBe(true);
    expect(textOf('********************')).toBeTruthy();
    expect(generateSecret).not.toHaveBeenCalled();
  });

  /*
   * Re-ported from `test/components/applications/AppCard.secret.test.tsx`, which #806 wave 5
   * deleted along with the unreachable `AppCard` (#939). Three assertions in that file were
   * the *only* cover for reachable behaviour; two of them survive above as "leaves the masked
   * secret alone…" and "closes the confirmation on cancel…". This was the third, and it was
   * lost in the hand-off: the component's suite moved here in the same wave that ported them.
   *
   * It is worth keeping separate from the naming test below it. That one asserts the dialog
   * has an accessible name (#713, an a11y contract); this asserts the dialog says what the
   * user is about to lose. A confirmation that does not name the consequence is a speed bump,
   * not a confirmation — and the copy is the whole reason this dialog exists, since
   * regenerating a secret silently breaks every client already using the old one.
   */
  it('names the consequence in the warning', async () => {
    const { el } = await mount(makeApp({ appHasSecret: true }));
    regenerateButton().click();
    await el.updateComplete;

    // Whitespace-collapsed first. The sentence wraps across two source lines in the template,
    // so a raw `textContent` carries a newline and the indentation mid-phrase and no
    // human-readable regex matches it. Collapsing is also what the browser actually renders.
    const warning = document.querySelector('dialog')?.textContent?.replace(/\s+/g, ' ');
    expect(warning).toMatch(/may break existing applications/i);
  });

  it('generates only once the regeneration is confirmed', async () => {
    const { el } = await mount(makeApp({ appHasSecret: true }));
    regenerateButton().click();
    await el.updateComplete;
    yesButton().click();

    expect(generateSecret).toHaveBeenCalledWith(
      'app-123',
      'isActive',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('closes the confirmation on cancel without generating', async () => {
    const { el } = await mount(makeApp({ appHasSecret: true }));
    regenerateButton().click();
    await el.updateComplete;
    noButton().click();
    await el.updateComplete;

    expect(el.confirming).toBe(false);
    expect(generateSecret).not.toHaveBeenCalled();
    expect(textOf('********************')).toBeTruthy();
  });

  it('names the confirmation dialog (#713)', async () => {
    await mount(makeApp({ appHasSecret: true }));
    const dialog = document.querySelector('dialog')!;
    const heading = document.getElementById(dialog.getAttribute('aria-labelledby')!);
    expect(heading?.textContent?.trim()).toBe('Regenerate App Secret?');
  });
});

/** The refresh control beside a masked secret — the one glyph button in the secret cell. */
const regenerateButton = () =>
  document.querySelector<HTMLButtonElement>('button[aria-label="Regenerate app secret"]')!;

const dialogButton = (label: string) =>
  Array.from(document.querySelectorAll('dialog keep-button')).find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLElement;

const yesButton = () => dialogButton('Yes');
const noButton = () => dialogButton('No');
