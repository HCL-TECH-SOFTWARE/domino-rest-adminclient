/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { deepQuery } from '../../test-utils/shadow';
import { nav, rangeText, setRowsPerPage } from '../../test-utils/tables';
import { store } from '../../../src/store/store';
import { getApps } from '../../../src/store/applications/reducer';
import '../../../src/components/keep-elements/keep-apps-table';
import type AppsTable from '../../../src/components/keep-elements/keep-apps-table';

// `fetchMyApps` is dispatched on every page change and by the filter drawer's Show Results;
// `generateSecret` is reached from a row. Neither should make a request from this file.
vi.mock('../../../src/store/applications/action', () => ({
  fetchMyApps: vi.fn(() => ({ type: 'FETCH_MY_APPS' })),
  generateSecret: vi.fn(() => ({ type: 'GENERATE_SECRET' })),
}));
// The rows render a real `keep-app-icon`; this keeps its 221 KB payload chunk (#772) out of
// the suite without standing in for the element itself.
vi.mock('../../../src/styles/app-icons', () => ({ default: {} }));

const TAG = 'keep-apps-table';

/** 12 apps named App01…App12 — enough for three pages at the default size of 5. */
const apps = Array.from({ length: 12 }, (_, i) => ({
  appName: `App${String(i + 1).padStart(2, '0')}`,
  appId: `id-${i}`,
  appStatus: i % 2 === 0 ? 'isActive' : 'disabled',
  appSecret: null,
  usePkce: false,
}));

/**
 * Seed through the **real action**, not a preloaded state, so the arrays the element reads
 * are the deep-frozen ones a reducer produces — which is what an in-place sort would throw
 * on. This list already sorted a copy, so this is a guard rather than a fix.
 */
const seed = (list: unknown[] = apps) => {
  store.dispatch({ type: 'INIT_STATE' });
  store.dispatch(getApps(list as never));
};

describe('keep-apps-table', () => {
  beforeEach(() => {
    seed();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: 'INIT_STATE' });
  });

  /**
   * Everything below this element — `keep-data-table`'s footer, every `keep-app-item` — is a
   * nested Lit element whose first update is scheduled, not immediate. The assertions drain
   * the microtask queue rather than awaiting a single update.
   */
  const settle = async (el: AppsTable) => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  /**
   * `rowsPerPage: 5` unless a test says otherwise.
   *
   * The element's default moved to 25 in #955, which is larger than the 12-row fixture below —
   * so every paging assertion here would be testing "one page holds everything". These cases
   * are about paging *behaviour*, so they pin the page size rather than inherit it; the
   * default itself is asserted once, separately.
   */
  const mount = async (props: Partial<AppsTable> = {}) => {
    const el = await mountLit<AppsTable>(TAG, { rowsPerPage: 5, ...props } as Partial<AppsTable>);
    await settle(el);
    return el;
  };

  const root = (el: AppsTable) => el.shadowRoot!;

  const headerLabels = (el: AppsTable) =>
    Array.from(root(el).querySelectorAll('thead th, thead td')).map(
      (cell) => cell.textContent?.trim() ?? '',
    );

  /** The name each visible row shows, in order. */
  const visibleNames = (el: AppsTable) =>
    Array.from(root(el).querySelectorAll('tbody td.app-name span.small-text')).map((cell) =>
      cell.textContent!.trim(),
    );

  const searchBox = (el: AppsTable) =>
    root(el).querySelector<HTMLInputElement>('input[placeholder="Search App Name"]')!;

  const sortButton = (el: AppsTable) => searchBox(el).closest('th')!.querySelector('button')!;

  const type = async (el: AppsTable, value: string) => {
    const box = searchBox(el);
    box.value = value;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
  };

  const click = async (el: AppsTable, button: HTMLElement) => {
    button.click();
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('structure', () => {
    it('labels the columns', async () => {
      const el = await mount();
      expect(headerLabels(el)).toEqual(
        expect.arrayContaining(['App IDApp Secret', 'Description']),
      );
    });

    it('offers a search box for app names', async () => {
      const el = await mount();
      expect(searchBox(el)).toBeTruthy();
    });

    it('replaces the whole table with a prompt when there are no apps', async () => {
      seed([]);
      const el = await mount();
      expect(deepQuery('[data-testid="no-search-result"]')?.textContent?.trim()).toBe(
        'There are currently no apps to display.',
      );
      expect(deepQuery('.secondary')?.textContent?.trim()).toBe(
        "Click 'Add Application' to create an app.",
      );
      expect(root(el).querySelector('table')).toBeNull();
    });

    it('keeps the filter drawer reachable when the list is empty', async () => {
      // The drawer is a sibling of the zero-results panel, not a child of the table, so the
      // Filter button still finds something to open on an empty account.
      seed([]);
      const el = await mount();
      expect(root(el).querySelector('keep-app-filter')).toBeTruthy();
    });

    it('says it is the applications table, not the consents one (#713)', async () => {
      // The label was copied from the screen next door and named neither.
      const el = await mount();
      expect(root(el).querySelector('table')!.getAttribute('aria-label')).toBe(
        'applications table',
      );
    });

    it('names the search box for a screen reader (#713)', async () => {
      const el = await mount();
      expect(searchBox(el).getAttribute('aria-label')).toBe('Search App Name');
    });

    it('says which axis every header cell heads (#713)', async () => {
      const el = await mount();
      const headers = Array.from(root(el).querySelectorAll('thead th'));
      expect(headers).toHaveLength(5);
      expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    });

    it('names the sort control, and says which way it will sort (#713)', async () => {
      const el = await mount();
      expect(sortButton(el).getAttribute('aria-label')).toBe('Sort by app name, ascending');
      await click(el, sortButton(el));
      expect(sortButton(el).getAttribute('aria-label')).toBe('Sort by app name, descending');
    });

    it('keeps the alignment field out of the tab order and the a11y tree (#713)', async () => {
      const el = await mount();
      const spacer = root(el).querySelector<HTMLInputElement>('input.hidden')!;
      expect(spacer.getAttribute('aria-hidden')).toBe('true');
      expect(spacer.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('pagination', () => {
    /**
     * Asserted directly, because the shared `mount` pins the page size so the paging cases
     * below stay meaningful — which would otherwise leave the default itself uncovered. #955.
     */
    it('defaults to 25 rows a page, one of the sizes the footer offers', async () => {
      const el = await mountLit<AppsTable>(TAG);
      await settle(el);
      expect(el.rowsPerPage).toBe(25);
      const table = el.shadowRoot!.querySelector('keep-data-table') as HTMLElement & {
        rowsPerPage: number;
        rowsPerPageOptions: number[];
      };
      expect(table.rowsPerPage).toBe(25);
      expect(table.rowsPerPageOptions).toContain(25);
    });

    it('shows the first five apps by default', async () => {
      const el = await mount();
      expect(visibleNames(el)).toEqual(['App01', 'App02', 'App03', 'App04', 'App05']);
    });

    it('reports the visible range', async () => {
      await mount();
      expect(rangeText()).toBe('1–5 of 12');
    });

    it('advances a page', async () => {
      const el = await mount();
      await click(el, nav.next());
      expect(visibleNames(el)).toEqual(['App06', 'App07', 'App08', 'App09', 'App10']);
    });

    it('shows a short final page', async () => {
      const el = await mount();
      await click(el, nav.last());
      expect(visibleNames(el)).toEqual(['App11', 'App12']);
    });

    it('goes back to the start', async () => {
      const el = await mount();
      await click(el, nav.last());
      await click(el, nav.first());
      expect(visibleNames(el)).toEqual(['App01', 'App02', 'App03', 'App04', 'App05']);
    });

    it('steps back one page', async () => {
      const el = await mount();
      await click(el, nav.next());
      await click(el, nav.prev());
      expect(visibleNames(el)[0]).toBe('App01');
    });

    // `deepButton` resolves `button[aria-label=…]`, so these are native buttons and
    // `.disabled` is the property the user agent acts on. That is what jest-dom's
    // toBeDisabled read here too — it walks ancestors for a disabled fieldset and checks
    // aria-disabled, neither of which is in play for a pagination button in a shadow root.
    it('disables first and previous on page one', async () => {
      await mount();
      expect(nav.first().disabled).toBe(true);
      expect(nav.prev().disabled).toBe(true);
      expect(nav.next().disabled).toBe(false);
    });

    it('disables next and last on the final page', async () => {
      const el = await mount();
      await click(el, nav.last());
      expect(nav.next().disabled).toBe(true);
      expect(nav.last().disabled).toBe(true);
      expect(nav.prev().disabled).toBe(false);
    });

    it('shows every app when the page size is All', async () => {
      const el = await mount();
      setRowsPerPage(-1);
      await settle(el);
      // Full identity list, not just a count, so a dropped/duplicated/misordered row is
      // caught — matches the equivalent ConsentsTable assertion (#771).
      expect(visibleNames(el)).toEqual(apps.map((a) => a.appName));
    });

    it('returns to page one when the page size changes', async () => {
      const el = await mount();
      await click(el, nav.next());
      setRowsPerPage(10);
      await settle(el);
      expect(visibleNames(el)[0]).toBe('App01');
    });
  });

  describe('filtering and sorting', () => {
    it('filters by app name, case-insensitively', async () => {
      const el = await mount();
      await type(el, 'app1');
      expect(visibleNames(el)).toEqual(['App10', 'App11', 'App12']);
    });

    it('shows no rows when nothing matches', async () => {
      const el = await mount();
      await type(el, 'nope');
      expect(visibleNames(el)).toEqual([]);
    });

    it('reverses the name order when sorting twice', async () => {
      const el = await mount();
      await click(el, sortButton(el));
      const ascending = visibleNames(el);
      await click(el, sortButton(el));
      expect(visibleNames(el)).not.toEqual(ascending);
      expect(visibleNames(el)[0]).toBe('App12');
    });

    it('applies the drawer filters when they arrive', async () => {
      const el = await mount();
      // Six of the twelve are active — the fixture alternates.
      el.status = 'Active';
      await settle(el);
      expect(visibleNames(el)).toEqual(['App01', 'App03', 'App05', 'App07', 'App09']);

      el.status = 'Inactive';
      await settle(el);
      expect(visibleNames(el)[0]).toBe('App02');
    });

    it('filters on the authentication method', async () => {
      seed([
        { appName: 'Pkce', appId: 'p', appStatus: 'isActive', appSecret: null, usePkce: true },
        { appName: 'Plain', appId: 'q', appStatus: 'isActive', appSecret: null, usePkce: false },
        { appName: 'Made', appId: 'r', appStatus: 'isActive', appSecret: 'x', usePkce: false },
      ]);
      const el = await mount();

      el.appSecret = 'PKCE';
      await settle(el);
      expect(visibleNames(el)).toEqual(['Pkce']);

      el.appSecret = 'App secret';
      await settle(el);
      expect(visibleNames(el)).toEqual(['Plain', 'Made']);

      el.appSecret = 'App secret generated';
      await settle(el);
      expect(visibleNames(el)).toEqual(['Made']);

      el.appSecret = 'App secret not generated';
      await settle(el);
      expect(visibleNames(el)).toEqual(['Plain']);
    });

    it('re-filters when the list in the store changes', async () => {
      const el = await mount();
      seed(apps.slice(0, 2));
      await settle(el);
      expect(visibleNames(el)).toEqual(['App01', 'App02']);
    });
  });

  describe('the rows', () => {
    it('passes each row its own record', async () => {
      const el = await mount();
      const rows = Array.from(root(el).querySelectorAll('keep-app-item'));
      expect(rows).toHaveLength(5);
      expect((rows[0] as { app: { appId: string } }).app.appId).toBe('id-0');
    });

    it('re-emits a row edit under its own name, with the form values', async () => {
      const el = await mount();
      const heard: CustomEvent[] = [];
      el.addEventListener('app-edit', (e) => heard.push(e as CustomEvent));

      const row = root(el).querySelector('keep-app-item')!;
      row.dispatchEvent(
        new CustomEvent('app-edit', {
          bubbles: true,
          composed: true,
          detail: { values: { appId: 'id-0' } },
        }),
      );

      expect(heard).toHaveLength(1);
      expect(heard[0].detail.values).toEqual({ appId: 'id-0' });
    });

    it('re-emits a row delete under its own name, with the id', async () => {
      const el = await mount();
      const heard: CustomEvent[] = [];
      el.addEventListener('app-delete', (e) => heard.push(e as CustomEvent));

      const row = root(el).querySelector('keep-app-item')!;
      row.dispatchEvent(
        new CustomEvent('app-delete', {
          bubbles: true,
          composed: true,
          detail: { appId: 'id-0' },
        }),
      );

      expect(heard).toHaveLength(1);
      expect(heard[0].detail.appId).toBe('id-0');
    });
  });
});
