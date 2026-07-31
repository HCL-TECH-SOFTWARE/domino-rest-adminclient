/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-agents-table';
import AgentsTableClass from '../../../src/components/keep-elements/keep-agents-table';
import type {
  KeepAgentsTableAgent,
  KeepAgentsTableToggleDetail,
} from '../../../src/components/keep-elements/keep-agents-table';
import { store } from '../../../src/store/store';
import { setApiLoading } from '../../../src/store/dialog/action';

const TAG = 'keep-agents-table';

type AgentsTable = InstanceType<typeof AgentsTableClass>;

const agents: KeepAgentsTableAgent[] = [
  { agentActive: false, agentAlias: [], agentName: 'NightlyClean', agentUnid: 'u1' },
  { agentActive: true, agentAlias: ['ac'], agentName: 'SendDigest', agentUnid: 'u2' },
];

const mount = (list: KeepAgentsTableAgent[] = agents) =>
  mountLit<AgentsTable>(TAG, { agents: list });

/** Everything the element draws is in its shadow root now, so every read starts there. */
const headerCells = (el: AgentsTable) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLTableCellElement>('thead th'));

const headerLabels = (el: AgentsTable) =>
  headerCells(el).map((cell) => cell.textContent?.trim() ?? '');

const bodyRows = (el: AgentsTable) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr'));

const cellTexts = (row: HTMLTableRowElement) =>
  Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() ?? '');

/**
 * The switch is a nested Lit element, so it draws into a shadow root of its own and its
 * first update is queued rather than run. `performUpdate()` is public and synchronous —
 * the same accommodation the replaced suite made — so these stay synchronous reads of
 * exactly what that suite read.
 *
 * It is `protected` on `ReactiveElement`, hence the cast through `unknown`: the tag map
 * types the query result as the element class, and a protected member cannot be widened to
 * a public one in a single assertion.
 */
const switchIn = (row: HTMLTableRowElement) => {
  const el = row.querySelector('keep-activate-switch')!;
  (el as unknown as { performUpdate: () => void }).performUpdate();
  return el;
};

/** The one click target. */
const toggleIn = (row: HTMLTableRowElement) =>
  switchIn(row).shadowRoot!.querySelector<HTMLButtonElement>('button.toggle-container')!;

/** The filled half, which is the one carrying the current state. */
const stateOf = (row: HTMLTableRowElement) =>
  switchIn(row).shadowRoot!.querySelector('.toggle-btn')!.textContent?.trim();

/** Record both toggle events, so each assertion can also show the other did not fire. */
function listen(el: AgentsTable) {
  const activated: KeepAgentsTableAgent[] = [];
  const deactivated: KeepAgentsTableAgent[] = [];
  el.addEventListener('agent-activate', (event) =>
    activated.push((event as CustomEvent<KeepAgentsTableToggleDetail>).detail.agent),
  );
  el.addEventListener('agent-deactivate', (event) =>
    deactivated.push((event as CustomEvent<KeepAgentsTableToggleDetail>).detail.agent),
  );
  return { activated, deactivated };
}

/** The whole `static styles` group as text, for the rules the suite cannot compute. */
const styleText = (AgentsTableClass as unknown as { styles: Array<{ cssText: string }> }).styles
  .map((sheet) => sheet.cssText)
  .join('\n');

/**
 * The switch reads `dialog.loading` from the real store through a `StoreController`, not
 * from any Provider. Anything this file sets there has to be put back, because that store
 * outlives the test.
 */
afterEach(() => {
  store.dispatch(setApiLoading(false));
  cleanupLit();
});

describe('keep-agents-table — structure', () => {
  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('starts with no agents', async () => {
    const el = await mountLit<AgentsTable>(TAG);
    expect(el.agents).toEqual([]);
    expect(bodyRows(el)).toHaveLength(0);
  });

  it('labels the columns', async () => {
    const el = await mount();
    expect(headerLabels(el)).toEqual(['Agent Name', 'Status']);
  });

  it('explains what Status means', async () => {
    const el = await mount();
    // `KeepTooltip`'s `content` is a Lit reactive property declared without `reflect`, so
    // it never becomes an HTML attribute — it only reaches the popup's textContent on
    // hover or focus. Assert on the visible trigger text and pin the tooltip copy by
    // reading the live DOM property.
    expect(el.shadowRoot!.querySelector('.status-trigger')!.textContent?.trim()).toMatch(/^Status/);
    const tooltip = el.shadowRoot!.querySelector('keep-tooltip') as Element & { content?: string };
    expect(tooltip.content).toContain('Activate the Agents');
  });

  it('renders one row per agent, in order', async () => {
    const el = await mount();
    const rows = bodyRows(el);
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0])[0]).toBe('NightlyClean');
    expect(cellTexts(rows[1])[0]).toBe('SendDigest');
  });

  it('renders no rows for an empty agent list', async () => {
    const el = await mount([]);
    expect(bodyRows(el)).toHaveLength(0);
  });
});

describe('keep-agents-table — activation', () => {
  it('shows Inactive for an inactive agent and Active for an active one', async () => {
    const el = await mount();
    const [inactive, active] = bodyRows(el);
    // Both labels are always in the DOM (the switch renders each side); the filled half is
    // the highlighted one, so assert on that.
    //
    // This is also the only place the seeding order is exercised for real: the switch
    // snapshots `agentActive` in its first `willUpdate`, and this element assigns `view`
    // from its own render. If that ever stopped happening before the switch's first
    // update, both rows would read "Inactive" here.
    expect(stateOf(inactive)).toBe('Inactive');
    expect(stateOf(active)).toBe('Active');
  });

  it('gives each switch an accessible name and a switch role', async () => {
    const el = await mount();
    const [inactive, active] = bodyRows(el);
    expect(toggleIn(inactive).getAttribute('role')).toBe('switch');
    expect(toggleIn(inactive).getAttribute('aria-label')).toBe('Agent NightlyClean');
    expect(toggleIn(inactive).getAttribute('aria-checked')).toBe('false');
    expect(toggleIn(active).getAttribute('aria-checked')).toBe('true');
  });

  it('activates an inactive agent', async () => {
    const el = await mount();
    const { activated, deactivated } = listen(el);

    toggleIn(bodyRows(el)[0]).click();

    // By reference: the activation thunk takes the whole record it was handed.
    expect(activated).toEqual([agents[0]]);
    expect(activated[0]).toBe(agents[0]);
    expect(deactivated).toEqual([]);
  });

  it('deactivates an active agent', async () => {
    const el = await mount();
    const { activated, deactivated } = listen(el);

    toggleIn(bodyRows(el)[1]).click();

    expect(deactivated).toEqual([agents[1]]);
    expect(activated).toEqual([]);
  });

  it('refuses to toggle while a save is in flight', async () => {
    // The switch is a Lit element reading the real store through a StoreController, so the
    // flag has to be set there rather than in a Provider's preloaded state.
    store.dispatch(setApiLoading(true));
    const el = await mount();
    const { activated, deactivated } = listen(el);

    toggleIn(bodyRows(el)[0]).click();

    expect(activated).toEqual([]);
    expect(deactivated).toEqual([]);
  });

  it('bubbles its own events out of the shadow root, so a React host can hear them', async () => {
    const el = await mount();
    const seen: string[] = [];
    document.addEventListener('agent-activate', () => seen.push('agent-activate'));
    document.addEventListener('agent-deactivate', () => seen.push('agent-deactivate'));

    toggleIn(bodyRows(el)[0]).click();
    toggleIn(bodyRows(el)[1]).click();

    expect(seen).toEqual(['agent-activate', 'agent-deactivate']);
  });

  it('does not also let the switch’s own event escape, which would double every toggle', async () => {
    const el = await mount();
    const raw: string[] = [];
    document.addEventListener('toggle-active', () => raw.push('toggle-active'));
    document.addEventListener('toggle-inactive', () => raw.push('toggle-inactive'));

    toggleIn(bodyRows(el)[0]).click();
    toggleIn(bodyRows(el)[1]).click();

    expect(raw).toEqual([]);
  });

  it('keeps a row’s switch with its agent when the list is filtered', async () => {
    // Rows are keyed on `agentName`. The switch snapshots `agentActive` once and never
    // reads the record again, so with positional reuse the surviving row would keep the
    // pill that had been seeded from the agent that used to sit there.
    const el = await mount();
    const digest = switchIn(bodyRows(el)[1]);

    el.agents = [agents[1]];
    await el.updateComplete;

    const rows = bodyRows(el);
    expect(rows).toHaveLength(1);
    expect(switchIn(rows[0])).toBe(digest);
    expect(stateOf(rows[0])).toBe('Active');
  });
});

/**
 * The replaced markup named the table after all three screens it had been copied to, left
 * both header cells without a scope, and put the Status explanation somewhere no assistive
 * technology could reach: `keep-tooltip` builds its popup imperatively and never points an
 * `aria-describedby` at it, so the copy existed for pointer users only.
 */
describe('keep-agents-table — accessibility (#713)', () => {
  it('names the table after what it actually lists', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-label')).toBe('agents table');
  });

  it('marks both header cells as column headers', async () => {
    const el = await mount();
    expect(headerCells(el).map((cell) => cell.getAttribute('scope'))).toEqual(['col', 'col']);
  });

  it('describes the Status column with the copy the tooltip shows', async () => {
    const el = await mount();
    const id = headerCells(el)[1].getAttribute('aria-describedby')!;
    expect(el.shadowRoot!.getElementById(id)?.textContent).toContain('Activate the Agents');
  });

  it('keeps that description out of the column name, so it is not read on every row', async () => {
    // Inside the header cell it would join the cell's text and be announced as the
    // column's name for every cell beneath it.
    const el = await mount();
    expect(headerLabels(el)[1]).toBe('Status');
  });

  it('hides the description visually rather than removing it from the a11y tree', () => {
    expect(styleText).toContain('.visually-hidden');
    expect(styleText).not.toMatch(/\.visually-hidden\s*\{[^}]*display:\s*none/);
  });

  it('puts the tooltip trigger in the keyboard focus order', async () => {
    const el = await mount();
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('.status-trigger')!;
    trigger.focus();
    expect(el.shadowRoot!.activeElement).toBe(trigger);
  });

  it('leaves the question mark decorative, so the name is not announced twice', async () => {
    const el = await mount();
    const icons = Array.from(el.shadowRoot!.querySelectorAll('wa-icon'));
    expect(icons).toHaveLength(1);
    // Web Awesome renders an icon aria-hidden unless it is given a label of its own.
    expect(icons[0].hasAttribute('label')).toBe(false);
    // And a library, or it silently fetches the glyph from the Font Awesome CDN.
    expect(icons[0].getAttribute('library')).toBeTruthy();
  });
});

/**
 * The suite runs with `css: false`, so nothing here can compute a style. What it can do is
 * pin the selectors, which is what a lost document sheet actually costs: the table moved
 * into a shadow root, and two sheets that reach it today stop at that boundary.
 */
describe('keep-agents-table — styles a document sheet cannot reach in here', () => {
  it('adopts the slotted-table sheet from keep-data-table', () => {
    expect(styleText).toContain('keep-data-table td');
    expect(styleText).toContain('keep-data-table thead th');
  });

  it('restates the border-box reset, which arrives through a universal selector', () => {
    expect(styleText).toContain('box-sizing: border-box');
  });

  it('restates the parts of the wa-native table layer nothing else supplies', () => {
    // Bare element selectors, all three of them, and all three visible: the rule above
    // each body row, cell content at the top of a row sized by the pill beside it, and
    // header cells a step down the type ramp from the body cells.
    expect(styleText).toMatch(/tbody tr\s*\{[^}]*border-block-start/);
    expect(styleText).toMatch(/th,\s*\n?\s*td\s*\{[^}]*vertical-align:\s*top/);
    expect(styleText).toMatch(/thead th\s*\{[^}]*font-size:\s*var\(--wa-font-size-smaller\)/);
  });

  it('keeps the name column at the width its width attribute set', () => {
    expect(styleText).toMatch(/\.col-name\s*\{[^}]*width:\s*550px/);
  });

  it('still asks keep-data-table for zebra striping', async () => {
    // The adopted sheet stripes on `keep-data-table[zebra]`, so the attribute is what
    // draws the banding — losing it is invisible to a suite that computes no styles.
    const el = await mount();
    expect(el.shadowRoot!.querySelector('keep-data-table')!.hasAttribute('zebra')).toBe(true);
  });
});
