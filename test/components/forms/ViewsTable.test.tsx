/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, headerLabels } from '../../test-utils/tables';
import { deepQueryAll } from '../../test-utils/shadow';
import ViewsTable from '../../../src/components/forms/ViewsTable';
import { toggleAlert } from '../../../src/store/alerts/action';

vi.mock('../../../src/store/alerts/action', () => ({
  toggleAlert: vi.fn(() => ({ type: 'TOGGLE_ALERT' })),
}));

const views = [
  { viewName: 'ActiveView', viewAlias: ['av'], viewActive: true, viewUpdated: false },
  { viewName: 'InactiveView', viewAlias: [], viewActive: false, viewUpdated: false },
];

function renderViewsTable(
  list: any[] = views,
  preloadedState: Record<string, unknown> = {},
) {
  const toggleActive = vi.fn();
  const toggleInactive = vi.fn();
  const setViewOpen = vi.fn();
  const setOpenViewName = vi.fn();
  renderWithProviders(
    <ViewsTable
      views={list}
      toggleActive={toggleActive}
      toggleInactive={toggleInactive}
      dbName="testdb"
      nsfPath="test.nsf"
      setViewOpen={setViewOpen}
      setOpenViewName={setOpenViewName}
    />,
    { preloadedState },
  );
  return { setViewOpen, setOpenViewName };
}

beforeEach(() => {
  vi.mocked(toggleAlert).mockClear();
});

describe('ViewsTable — structure', () => {
  it('labels the columns, with a blank cell above the edit buttons', () => {
    renderViewsTable();
    expect(headerLabels()).toEqual(['', 'View Name', 'Alias', 'Status']);
  });

  it('renders one row per view', () => {
    renderViewsTable();
    expect(bodyRows()).toHaveLength(2);
  });

  it('shows the view name', () => {
    renderViewsTable();
    expect(within(bodyRows()[0]).getByText('ActiveView')).toBeInTheDocument();
  });

  it('shows the first alias only', () => {
    renderViewsTable();
    expect(within(bodyRows()[0]).getByText('av')).toBeInTheDocument();
  });

  it('shows no alias for a view without one', () => {
    renderViewsTable();
    expect(within(bodyRows()[1]).queryByText('av')).not.toBeInTheDocument();
  });

  it('bolds the name of a view that changed while active', () => {
    renderViewsTable([{ ...views[0], viewUpdated: true }]);
    expect(bodyRows()[0].querySelector('b')).toHaveTextContent('ActiveView');
  });

  it('does not bold a view that changed while inactive', () => {
    renderViewsTable([{ ...views[1], viewUpdated: true }]);
    expect(bodyRows()[0].querySelector('b')).toBeNull();
  });
});

describe('ViewsTable — opening a view', () => {
  it('opens an active view by name', () => {
    const { setViewOpen, setOpenViewName } = renderViewsTable();
    fireEvent.click(screen.getByTitle('ActiveView'));
    expect(setOpenViewName).toHaveBeenCalledWith('ActiveView');
    expect(setViewOpen).toHaveBeenCalledWith(true);
    expect(toggleAlert).not.toHaveBeenCalled();
  });

  it('refuses to open an inactive view and says why', () => {
    const { setViewOpen, setOpenViewName } = renderViewsTable();
    fireEvent.click(screen.getByTitle('InactiveView'));
    expect(setOpenViewName).not.toHaveBeenCalled();
    expect(setViewOpen).toHaveBeenCalledWith(false);
    expect(toggleAlert).toHaveBeenCalledWith('Please activate this view before editing it!');
  });

  it('disables the edit buttons while a save is in flight', () => {
    renderViewsTable(views, { dialog: { loading: true } });
    expect(screen.getByTitle('ActiveView')).toBeDisabled();
  });
});

describe('ViewsTable — folders', () => {
  it('marks a view that is really a folder', () => {
    renderViewsTable(views, { databases: { folders: [{ viewName: 'ActiveView' }], scopes: [] } });
    // The marker is a KeepTooltip whose `content` is a Lit reactive property declared
    // without `reflect: true` (keep-tooltip.ts), so it never becomes an HTML attribute —
    // getByText/getAttribute('content') both find nothing. Read the live JS property.
    const tips = deepQueryAll('keep-tooltip').map(
      (t) => (t as unknown as { content?: string }).content,
    );
    expect(tips).toContain('ActiveView is a folder.');
  });

  it('leaves an ordinary view unmarked', () => {
    renderViewsTable();
    const tips = deepQueryAll('keep-tooltip').map(
      (t) => (t as unknown as { content?: string }).content,
    );
    expect(tips.join(' ')).not.toContain('is a folder');
  });
});
