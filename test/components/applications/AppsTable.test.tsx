/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { deepQuery } from '../../test-utils/shadow';
import { headerLabels, nav, rangeText, setRowsPerPage } from '../../test-utils/tables';
import AppsTable from '../../../src/components/applications/AppsTable';

vi.mock('../../../src/components/applications/AppItem', () => ({
  default: ({ app }: any) => (
    <tr data-testid="app-row">
      <td>{app.appName}</td>
    </tr>
  ),
}));
vi.mock('../../../src/components/applications/AppFilterContainer', () => ({
  default: () => <div data-testid="app-filters" />,
}));
vi.mock('../../../src/store/applications/action', () => ({
  fetchMyApps: vi.fn(() => ({ type: 'FETCH_MY_APPS' })),
}));

/** 12 apps named App01…App12 — enough for three pages at the default size of 5. */
const apps = Array.from({ length: 12 }, (_, i) => ({
  appName: `App${String(i + 1).padStart(2, '0')}`,
  appId: `id-${i}`,
  appStatus: i % 2 === 0 ? 'isActive' : 'disabled',
  appSecret: null,
  usePkce: false,
}));

function renderAppsTable(list: any[] = apps) {
  const deleteApplication = vi.fn();
  renderWithProviders(
    <AppsTable
      filtersOn={false}
      setFiltersOn={vi.fn()}
      reset={false}
      setReset={vi.fn()}
      deleteApplication={deleteApplication}
      formik={{ setValues: vi.fn() } as any}
    />,
    { preloadedState: { apps: { apps: list } } },
  );
}

const visibleNames = () =>
  screen.queryAllByTestId('app-row').map((row) => row.textContent?.trim() ?? '');

describe('AppsTable — structure', () => {
  it('labels the columns', () => {
    renderAppsTable();
    expect(headerLabels()).toEqual(
      expect.arrayContaining(['App IDApp Secret', 'Description']),
    );
  });

  it('offers a search box for app names', () => {
    renderAppsTable();
    expect(screen.getByPlaceholderText('Search App Name')).toBeInTheDocument();
  });

  it('replaces the whole table with a prompt when there are no apps', async () => {
    renderAppsTable([]);
    // ZeroResultsWrapper became the Lit element keep-zero-results upstream (469d9cf), so
    // mainLabel/secondaryLabel render into that element's shadow root on Lit's own update
    // microtask — `screen` queries can't cross the shadow boundary, and querying before
    // that microtask runs finds an empty root either way. deepQuery pierces the
    // boundary; awaiting the element's updateComplete waits out the render.
    const zeroResults = deepQuery<HTMLElement & { updateComplete: Promise<boolean> }>(
      'keep-zero-results',
    );
    await zeroResults?.updateComplete;
    expect(deepQuery('[data-testid="no-search-result"]')?.textContent?.trim()).toBe(
      'There are currently no apps to display.',
    );
    expect(deepQuery('.secondary')?.textContent?.trim()).toBe(
      "Click 'Add Application' to create an app.",
    );
    expect(document.querySelector('table')).toBeNull();
  });
});

describe('AppsTable — pagination', () => {
  it('shows the first five apps by default', () => {
    renderAppsTable();
    expect(visibleNames()).toEqual(['App01', 'App02', 'App03', 'App04', 'App05']);
  });

  it('reports the visible range', () => {
    renderAppsTable();
    expect(rangeText()).toBe('1–5 of 12');
  });

  it('advances a page', () => {
    renderAppsTable();
    fireEvent.click(nav.next());
    expect(visibleNames()).toEqual(['App06', 'App07', 'App08', 'App09', 'App10']);
  });

  it('shows a short final page', () => {
    renderAppsTable();
    fireEvent.click(nav.last());
    expect(visibleNames()).toEqual(['App11', 'App12']);
  });

  it('goes back to the start', () => {
    renderAppsTable();
    fireEvent.click(nav.last());
    fireEvent.click(nav.first());
    expect(visibleNames()).toEqual(['App01', 'App02', 'App03', 'App04', 'App05']);
  });

  it('steps back one page', () => {
    renderAppsTable();
    fireEvent.click(nav.next());
    fireEvent.click(nav.prev());
    expect(visibleNames()[0]).toBe('App01');
  });

  it('disables first and previous on page one', () => {
    renderAppsTable();
    expect(nav.first()).toBeDisabled();
    expect(nav.prev()).toBeDisabled();
    expect(nav.next()).toBeEnabled();
  });

  it('disables next and last on the final page', () => {
    renderAppsTable();
    fireEvent.click(nav.last());
    expect(nav.next()).toBeDisabled();
    expect(nav.last()).toBeDisabled();
    expect(nav.prev()).toBeEnabled();
  });

  it('shows every app when the page size is All', () => {
    renderAppsTable();
    setRowsPerPage(-1);
    // Full identity list, not just a count, so a dropped/duplicated/misordered row is
    // caught — matches the equivalent ConsentsTable assertion (#771).
    expect(visibleNames()).toEqual(apps.map((a) => a.appName));
  });

  it('returns to page one when the page size changes', () => {
    renderAppsTable();
    fireEvent.click(nav.next());
    setRowsPerPage(10);
    expect(visibleNames()[0]).toBe('App01');
  });
});

describe('AppsTable — filtering and sorting', () => {
  it('filters by app name, case-insensitively', () => {
    renderAppsTable();
    fireEvent.change(screen.getByPlaceholderText('Search App Name'), {
      target: { value: 'app1' },
    });
    expect(visibleNames()).toEqual(['App10', 'App11', 'App12']);
  });

  it('shows no rows when nothing matches', () => {
    renderAppsTable();
    fireEvent.change(screen.getByPlaceholderText('Search App Name'), {
      target: { value: 'nope' },
    });
    expect(visibleNames()).toEqual([]);
  });

  it('reverses the name order when sorting twice', () => {
    renderAppsTable();
    const sort = screen.getByPlaceholderText('Search App Name')
      .closest('th, td')!
      .querySelector('button')!;
    fireEvent.click(sort);
    const ascending = visibleNames();
    fireEvent.click(sort);
    expect(visibleNames()).not.toEqual(ascending);
    expect(visibleNames()[0]).toBe('App12');
  });
});
