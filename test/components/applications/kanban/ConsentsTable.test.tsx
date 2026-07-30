/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { headerLabels, nav, rangeText, setRowsPerPage } from '../../../test-utils/tables';
import { deepQuery } from '../../../test-utils/shadow';
import ConsentsTable from '../../../../src/components/applications/kanban/ConsentsTable';

vi.mock('../../../../src/components/applications/kanban/ConsentItem', () => ({
  default: ({ consent }: any) => (
    <tr data-testid="consent-row">
      <td>{consent.username}</td>
      <td>
        <button>Revoke</button>
      </td>
    </tr>
  ),
}));
vi.mock('../../../../src/components/consents/ConsentFilterContainer', () => ({
  default: () => <div data-testid="consent-filters" />,
}));

const DAY = 86_400_000;

/** 12 consents, User01…User12, each tied to a distinct app so sorting is observable. */
const consents = Array.from({ length: 12 }, (_, i) => ({
  username: `User${String(i + 1).padStart(2, '0')}`,
  scope: 'read',
  client_id: `app-${i}`,
  unid: `unid-${i}`,
  redirect_uri: 'https://example.test/cb',
  code_expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
  refresh_token_expires_at: new Date(Date.now() + 30 * DAY).toISOString(),
}));

const apps = consents.map((c, i) => ({
  appId: c.client_id,
  appName: `App${String(12 - i).padStart(2, '0')}`,
}));

function renderConsentsTable(preloadedState: Record<string, unknown> = {}) {
  return renderWithProviders(
    <ConsentsTable
      expand={false}
      filtersOn={false}
      setFiltersOn={vi.fn()}
      reset={false}
      setReset={vi.fn()}
    />,
    {
      preloadedState: {
        // `handleSortUsers`/`handleSortAppNames` in ConsentsTable call `consents.sort(...)`
        // directly on the array read from the store — not a copy, unlike AppsTable, which
        // copies with `[...apps]` first. A shared module-level array would come out of
        // whichever sort test runs first already reordered, making every later test's
        // pass/fail depend on file execution order. Building a fresh array of fresh
        // objects for every render keeps each test's starting order independent of what
        // ran before it in this file.
        consents: { consents: consents.map((c) => ({ ...c })) },
        apps: { apps },
        users: { users: [] },
        loading: { consentsLoading: false, usersLoading: false },
        ...preloadedState,
      },
    },
  );
}

const visibleUsers = () =>
  screen.queryAllByTestId('consent-row').map((r) => r.querySelector('td')!.textContent);

/**
 * The loading state is `<keep-page-loading>` since #806, so its caption lives in a shadow
 * root that Testing Library's `screen` queries do not enter, and Lit's first update is async.
 * `performUpdate()` is synchronous — the same accommodation `AgentsTable.test.tsx` makes —
 * so this stays a synchronous read of the text the user actually sees.
 */
const loadingCaption = () => {
  const el = deepQuery('keep-page-loading');
  if (!el) return null;
  (el as unknown as { performUpdate: () => void }).performUpdate();
  return el.shadowRoot!.querySelector('p[role="status"]')!.textContent;
};

describe('ConsentsTable — loading', () => {
  it('replaces the table while consents load', () => {
    renderConsentsTable({ loading: { consentsLoading: true, usersLoading: false } });
    expect(document.querySelector('table')).toBeNull();
    expect(loadingCaption()).toMatch(/Users and Consents are loading/);
  });

  // Both layout flags are booleans crossing the React wrapper as properties, and both are
  // reflected because the layout is selected purely in the element's stylesheet. A flag that
  // failed to cross would leave the box absolutely positioned over the options bar, or
  // collapsed onto the dots — neither of which the caption assertion above would notice.
  it('lays the loading state out in flow at the page-body height', () => {
    renderConsentsTable({ loading: { consentsLoading: true, usersLoading: false } });
    const el = deepQuery('keep-page-loading')!;
    (el as unknown as { performUpdate: () => void }).performUpdate();
    expect(el.hasAttribute('contained')).toBe(true);
    expect(el.hasAttribute('page-height')).toBe(true);
  });

  it('replaces the table while users load', () => {
    renderConsentsTable({ loading: { consentsLoading: false, usersLoading: true } });
    expect(document.querySelector('table')).toBeNull();
  });

  it('shows the table once both have loaded', () => {
    renderConsentsTable();
    expect(document.querySelector('table')).toBeTruthy();
  });
});

describe('ConsentsTable — structure', () => {
  it('labels the columns', () => {
    renderConsentsTable();
    expect(headerLabels().join('|')).toContain('Expirations');
    expect(headerLabels().join('|')).toContain('Action');
  });

  it('offers search boxes for user and app name', () => {
    renderConsentsTable();
    expect(screen.getByPlaceholderText('Search User')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search App Name')).toBeInTheDocument();
  });
});

describe('ConsentsTable — pagination', () => {
  it('shows the first five consents by default', () => {
    renderConsentsTable();
    expect(visibleUsers()).toEqual(['User01', 'User02', 'User03', 'User04', 'User05']);
  });

  it('reports the visible range', () => {
    renderConsentsTable();
    expect(rangeText()).toBe('1–5 of 12');
  });

  it('advances a page', () => {
    renderConsentsTable();
    fireEvent.click(nav.next());
    expect(visibleUsers()).toEqual(['User06', 'User07', 'User08', 'User09', 'User10']);
  });

  it('shows a short final page', () => {
    renderConsentsTable();
    fireEvent.click(nav.last());
    expect(visibleUsers()).toEqual(['User11', 'User12']);
  });

  it('disables first and previous on page one', () => {
    renderConsentsTable();
    expect(nav.first()).toBeDisabled();
    expect(nav.prev()).toBeDisabled();
  });

  it('disables next and last on the final page', () => {
    renderConsentsTable();
    fireEvent.click(nav.last());
    expect(nav.next()).toBeDisabled();
    expect(nav.last()).toBeDisabled();
  });

  it('shows every consent when the page size is All', () => {
    renderConsentsTable();
    setRowsPerPage(-1);
    // Full identity list, not just a count, so a dropped/duplicated/misordered record
    // in the `rowsPerPage > 0 ? slice(...) : filteredConsents` ternary is caught — that
    // ternary is exactly what PR 5 rewrites.
    expect(visibleUsers()).toEqual(consents.map((c) => c.username));
  });
});

describe('ConsentsTable — filtering and sorting', () => {
  it('filters by username', () => {
    renderConsentsTable();
    fireEvent.change(screen.getByPlaceholderText('Search User'), {
      target: { value: 'user1' },
    });
    expect(visibleUsers()).toEqual(['User10', 'User11', 'User12']);
  });

  it('filters by app name', () => {
    renderConsentsTable();
    fireEvent.change(screen.getByPlaceholderText('Search App Name'), {
      target: { value: 'App01' },
    });
    expect(visibleUsers()).toEqual(['User12']);
  });

  // The filter effect ends with setPage(0), so changing a search box always returns to
  // page one — even if a later page was already showing. Real behaviour, cheap to pin.
  it('returns to page one when a filter changes', () => {
    renderConsentsTable();
    fireEvent.click(nav.next());
    expect(visibleUsers()[0]).toBe('User06');

    fireEvent.change(screen.getByPlaceholderText('Search User'), {
      target: { value: 'user0' },
    });
    expect(visibleUsers()).toEqual(['User01', 'User02', 'User03', 'User04', 'User05']);
  });

  it('reverses the user order when sorted twice', () => {
    renderConsentsTable();
    const sort = screen.getByPlaceholderText('Search User')
      .closest('td, th')!
      .querySelector('button')!;
    fireEvent.click(sort);
    fireEvent.click(sort);
    expect(visibleUsers()[0]).toBe('User12');
  });

  it('sorts by app name independently of the user sort', () => {
    renderConsentsTable();
    const sort = screen.getByPlaceholderText('Search App Name')
      .closest('td, th')!
      .querySelector('button')!;
    fireEvent.click(sort);
    // Apps are named inversely to users (User01 -> App12, ..., User12 -> App01), so
    // ascending-by-app-name order is App01..App12, i.e. User12..User01. A single click
    // must show User12 first: a no-op button, or one wired to `handleSortUsers` instead,
    // would both leave User01 first (ascending-by-username is already the default order),
    // so this discriminates both failure modes rather than only re-checking the default.
    expect(visibleUsers()[0]).toBe('User12');
  });

  // BUG: `handleSortUsers`/`handleSortAppNames` call `consents.sort(...)` on the exact
  // array reference read from the store, mutating it in place instead of sorting a copy
  // (contrast AppsTable, which copies with `[...apps]` first). `ConsentsTable` never
  // dispatches, so `store.getState()` cannot change reference over its lifetime no
  // matter what the component does — comparing the array *reference* would pass
  // whether or not the in-place sort existed. Comparing *content* through that same
  // reference is what actually depends on the mutation: two clicks (ascending, then
  // descending) guarantee a real reorder, since a single ascending click on an
  // already-ascending fixture would leave the order (and therefore the content check)
  // unchanged even though `.sort()` still ran.
  it('mutates the store consents array in place when sorting', () => {
    const { store } = renderConsentsTable();
    const usernames = () => store.getState().consents.consents.map((c: { username: string }) => c.username);
    const before = usernames();
    const sort = screen.getByPlaceholderText('Search User')
      .closest('td, th')!
      .querySelector('button')!;
    fireEvent.click(sort);
    fireEvent.click(sort);
    const after = usernames();
    expect(after).not.toEqual(before);
  });
});
