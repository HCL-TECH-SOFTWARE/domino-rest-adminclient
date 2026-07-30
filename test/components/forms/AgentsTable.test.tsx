/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, cellTexts, headerLabels } from '../../test-utils/tables';
import { deepQuery } from '../../test-utils/shadow';
import AgentsTable from '../../../src/components/forms/AgentsTable';
import { store } from '../../../src/store/store';
import { setApiLoading } from '../../../src/store/dialog/action';

const agents = [
  { agentActive: false, agentAlias: [], agentName: 'NightlyClean', agentUnid: 'u1' },
  { agentActive: true, agentAlias: ['ac'], agentName: 'SendDigest', agentUnid: 'u2' },
];

function renderAgentsTable(list = agents) {
  const toggleActive = vi.fn().mockResolvedValue(undefined);
  const toggleInactive = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <AgentsTable agents={list} toggleActive={toggleActive} toggleInactive={toggleInactive} />,
  );
  return { toggleActive, toggleInactive };
}

/**
 * The switch is `<keep-activate-switch>` now, so everything it draws is in a shadow root
 * and Lit's first update is async. `performUpdate()` is synchronous — the same accommodation
 * `test-utils/tables.ts` makes for `keep-data-table` — so these stay synchronous reads of
 * exactly what they read before.
 *
 * It is `protected` on `ReactiveElement`, hence the cast through `unknown`: the tag map types
 * the query result as the element class, and a protected member cannot be widened to a public
 * one in a single assertion.
 */
const switchIn = (row: HTMLTableRowElement) => {
  const el = row.querySelector('keep-activate-switch')!;
  (el as unknown as { performUpdate: () => void }).performUpdate();
  return el.shadowRoot!;
};

/** The one click target. It used to be a div; it is the switch button itself now. */
const toggleIn = (row: HTMLTableRowElement) =>
  switchIn(row).querySelector<HTMLButtonElement>('button.toggle-container')!;

/** The filled half, which is the one carrying the current state. */
const stateOf = (row: HTMLTableRowElement) =>
  switchIn(row).querySelector('.toggle-btn')!.textContent?.trim();

/**
 * The element reads `dialog.loading` from the real store, not from the Provider's — the
 * converted elements have no Provider to read. Anything this file sets there has to be put
 * back, because that store outlives the test.
 */
afterEach(() => {
  store.dispatch(setApiLoading(false));
});

describe('AgentsTable — structure', () => {
  it('labels the columns', () => {
    renderAgentsTable();
    expect(headerLabels()).toEqual(['Agent Name', 'Status']);
  });

  it('explains what Status means', () => {
    renderAgentsTable();
    // Correction: `KeepTooltip`'s `content` is a Lit reactive property declared without
    // `reflect: true` (see keep-tooltip.ts), so it never becomes an HTML attribute — it
    // only reaches the popup's textContent on hover/focus. `getByText` on the tooltip copy
    // finds nothing, and `getAttribute('content')` returns null too. Assert on the visible
    // trigger text and pin the tooltip copy by reading the live DOM property instead.
    expect(screen.getByText(/^Status/)).toBeInTheDocument();
    const tooltip = deepQuery('keep-tooltip') as (Element & { content?: string }) | null;
    expect(tooltip?.content).toContain('Activate the Agents');
  });

  it('renders one row per agent, in order', () => {
    renderAgentsTable();
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0])[0]).toBe('NightlyClean');
    expect(cellTexts(rows[1])[0]).toBe('SendDigest');
  });

  it('renders no rows for an empty agent list', () => {
    renderAgentsTable([]);
    expect(bodyRows()).toHaveLength(0);
  });
});

describe('AgentsTable — activation', () => {
  it('shows Inactive for an inactive agent and Active for an active one', () => {
    renderAgentsTable();
    const [inactive, active] = bodyRows();
    // Both labels are always in the DOM (the switch renders each side); the filled half is
    // the highlighted one, so assert on that.
    //
    // This is also the only place the seeding order is exercised for real: the element
    // snapshots `agentActive` in its first `willUpdate`, and the bridge assigns `view` from
    // a layout effect. If that ever stopped happening before Lit's first update, both rows
    // would read "Inactive" here.
    expect(stateOf(inactive)).toBe('Inactive');
    expect(stateOf(active)).toBe('Active');
  });

  it('gives each switch an accessible name and a switch role', () => {
    renderAgentsTable();
    const [inactive, active] = bodyRows();
    expect(toggleIn(inactive).getAttribute('role')).toBe('switch');
    expect(toggleIn(inactive).getAttribute('aria-label')).toBe('Agent NightlyClean');
    expect(toggleIn(inactive).getAttribute('aria-checked')).toBe('false');
    expect(toggleIn(active).getAttribute('aria-checked')).toBe('true');
  });

  it('activates an inactive agent', () => {
    const { toggleActive, toggleInactive } = renderAgentsTable();
    fireEvent.click(toggleIn(bodyRows()[0]));
    expect(toggleActive).toHaveBeenCalledWith(agents[0]);
    expect(toggleInactive).not.toHaveBeenCalled();
  });

  it('deactivates an active agent', () => {
    const { toggleActive, toggleInactive } = renderAgentsTable();
    fireEvent.click(toggleIn(bodyRows()[1]));
    expect(toggleInactive).toHaveBeenCalledWith(agents[1]);
    expect(toggleActive).not.toHaveBeenCalled();
  });

  it('refuses to toggle while a save is in flight', () => {
    // `preloadedState` no longer reaches this: the switch is a Lit element reading the
    // real store through a StoreController, so the flag has to be set there.
    store.dispatch(setApiLoading(true));
    const { toggleActive, toggleInactive } = renderAgentsTable();
    fireEvent.click(toggleIn(bodyRows()[0]));
    expect(toggleActive).not.toHaveBeenCalled();
    expect(toggleInactive).not.toHaveBeenCalled();
  });
});
