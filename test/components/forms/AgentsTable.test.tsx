/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, cellTexts, headerLabels } from '../../test-utils/tables';
import { deepQuery } from '../../test-utils/shadow';
import AgentsTable from '../../../src/components/forms/AgentsTable';

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

/** The switch is a click target, not a <button> — scope to the row and take its container. */
const toggleIn = (row: HTMLTableRowElement) => row.querySelector('.toggle-container')!;

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
    // Both labels are always in the DOM (the switch renders each side); the *first*
    // button is the highlighted one, so assert on that.
    expect(within(inactive).getAllByRole('button')[0]).toHaveTextContent('Inactive');
    expect(within(active).getAllByRole('button')[0]).toHaveTextContent('Active');
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
    const toggleActive = vi.fn();
    const toggleInactive = vi.fn();
    renderWithProviders(
      <AgentsTable agents={agents} toggleActive={toggleActive} toggleInactive={toggleInactive} />,
      { preloadedState: { dialog: { loading: true } } },
    );
    fireEvent.click(toggleIn(bodyRows()[0]));
    expect(toggleActive).not.toHaveBeenCalled();
    expect(toggleInactive).not.toHaveBeenCalled();
  });
});
