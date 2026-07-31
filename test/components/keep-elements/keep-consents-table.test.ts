/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { nav, rangeText, setRowsPerPage } from '../../test-utils/tables';
import { store } from '../../../src/store/store';
import { setConsents } from '../../../src/store/consents/reducer';
import { getApps } from '../../../src/store/applications/reducer';
import { setUsers } from '../../../src/store/access/reducer';
import { toggleConsentsLoading, toggleUsersLoading } from '../../../src/store/loading/reducer';
import '../../../src/components/keep-elements/keep-consents-table';
import type ConsentsTable from '../../../src/components/keep-elements/keep-consents-table';

const TAG = 'keep-consents-table';
const DAY = 86_400_000;

/**
 * A frozen "now" for every date in this file (#997).
 *
 * The expiry filter matches on the **local calendar day** (`sameDay()` in the component reads
 * `getDate`/`getMonth`/`getFullYear`), and these tests used to build their dates from the real
 * `Date.now()`. That made them depend on two things they are not about:
 *
 *   - **The time of day.** `matches a Custom expiry on the calendar day` set the filter to the
 *     fixture's instant *plus an hour*; from 23:00 local onwards that hour landed on the next
 *     calendar day, the filter correctly matched nothing, and the case failed. One hour in
 *     every twenty-four. The same arithmetic makes the last hour of a month, the last hour of
 *     a year and a DST transition each their own way to go red.
 *   - **The moment of import.** `template` is a module-level constant, so its `Date.now()` ran
 *     at import while the test bodies ran theirs later. A suite that crossed midnight between
 *     those two moments would put the fixture and the filter a day apart.
 *
 * Two properties do the work, and **both** are needed:
 *
 *   - Constructed from local-time components, not a UTC string, so it is noon *in whatever
 *     zone the runner uses*. Freezing alone does not make this test timezone-proof: pin a UTC
 *     instant and its local time-of-day still varies by 25 hours across the zones, so the same
 *     +1 hour would still cross midnight somewhere.
 *   - Noon, mid-month, mid-year. June has no DST transition in either hemisphere, and twelve
 *     hours of margin on each side means no offset in this file can leave the day.
 *
 * `vi.setSystemTime` is scoped to `Date` only (`toFake: ['Date']`), so Lit's update scheduling
 * and `settle()` keep using real timers.
 */
const NOW = new Date(2026, 5, 15, 12, 0, 0, 0);

/** 12 consents, User01…User12, each tied to a distinct app so sorting is observable. */
const template = Array.from({ length: 12 }, (_, i) => ({
  username: `User${String(i + 1).padStart(2, '0')}`,
  scope: 'read',
  client_id: `app-${i}`,
  unid: `unid-${i}`,
  redirect_uri: 'https://example.test/cb',
  code_expires_at: new Date(NOW.getTime() + 7 * DAY).toISOString(),
  refresh_token_expires_at: new Date(NOW.getTime() + 30 * DAY).toISOString(),
  scope_claim: '',
  scope_description: '',
  scope_logo_url: '',
}));

/** Apps named inversely to users, so an app-name sort is not the default user order. */
const apps = template.map((c, i) => ({
  appId: c.client_id,
  appName: `App${String(12 - i).padStart(2, '0')}`,
}));

/** A fresh array of fresh objects, so no test inherits another's order. */
const freshConsents = () => template.map((c) => ({ ...c }));

/**
 * Seed through the **real actions**, not a preloaded state.
 *
 * That distinction is the whole reason the shipped sort was broken and nobody knew: Redux
 * Toolkit deep-freezes what a reducer produces, and `preloadedState` never passes through
 * one. The characterization suite this replaces used `preloadedState`, so its arrays were
 * writable and the in-place `.sort()` it pinned as behaviour worked there and threw in the
 * app. Everything below runs against the frozen arrays a user would actually have.
 */
const seed = ({
  consents = freshConsents(),
  appList = apps,
  loading = {} as { consentsLoading?: boolean; usersLoading?: boolean },
} = {}) => {
  store.dispatch({ type: 'INIT_STATE' });
  store.dispatch(setConsents(consents as never));
  store.dispatch(getApps(appList as never));
  store.dispatch(setUsers([]));
  if (loading.consentsLoading) store.dispatch(toggleConsentsLoading());
  if (loading.usersLoading) store.dispatch(toggleUsersLoading());
};

/** The loading slice is a plain toggle pair, so it has to be put back the way it was. */
const clearLoading = () => {
  if (store.getState().loading.consentsLoading) store.dispatch(toggleConsentsLoading());
  if (store.getState().loading.usersLoading) store.dispatch(toggleUsersLoading());
};

describe('keep-consents-table', () => {
  beforeEach(() => {
    // `Date` only — the component reads `new Date()` to decide what has expired, but Lit's
    // update scheduling and `settle()` must keep their real timers or nothing ever renders.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    clearLoading();
    seed();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupLit();
    clearLoading();
    store.dispatch({ type: 'INIT_STATE' });
  });

  /**
   * Everything below this element — `keep-data-table`'s footer, each `keep-consent-item`'s
   * two rows — is a nested Lit element whose first update is scheduled, not immediate. The
   * assertions drain the microtask queue rather than awaiting a single update.
   */
  const settle = async (el: ConsentsTable) => {
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
  const mount = async (props: Partial<ConsentsTable> = {}) => {
    const el = await mountLit<ConsentsTable>(TAG, { rowsPerPage: 5, ...props } as Partial<ConsentsTable>);
    await settle(el);
    return el;
  };

  const root = (el: ConsentsTable) => el.shadowRoot!;

  const headerLabels = (el: ConsentsTable) =>
    Array.from(root(el).querySelectorAll('thead th, thead td')).map(
      (cell) => cell.textContent?.trim() ?? '',
    );

  /** The username each visible row shows, in order. */
  const visibleUsers = (el: ConsentsTable) =>
    Array.from(root(el).querySelectorAll('tbody td.user')).map((cell) => cell.textContent!.trim());

  const searchBox = (el: ConsentsTable, placeholder: string) =>
    root(el).querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;

  const sortButtonFor = (el: ConsentsTable, placeholder: string) =>
    searchBox(el, placeholder).closest('th')!.querySelector('button')!;

  const type = async (el: ConsentsTable, placeholder: string, value: string) => {
    const box = searchBox(el, placeholder);
    box.value = value;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
  };

  const click = async (el: ConsentsTable, button: HTMLElement) => {
    button.click();
    await settle(el);
  };

  const loadingCaption = (el: ConsentsTable) => {
    const loading = root(el).querySelector('keep-page-loading');
    if (!loading) return null;
    (loading as unknown as { performUpdate: () => void }).performUpdate();
    return loading.shadowRoot!.querySelector('p[role="status"]')!.textContent;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('loading', () => {
    it('replaces the table while consents load', async () => {
      seed({ loading: { consentsLoading: true } });
      const el = await mount();
      expect(root(el).querySelector('table')).toBeNull();
      expect(loadingCaption(el)).toMatch(/Users and Consents are loading/);
    });

    // Both layout flags are booleans that the element's own stylesheet selects on, so a flag
    // that failed to reach the box would leave it absolutely positioned over the options bar,
    // or collapsed onto the dots — neither of which the caption assertion above would notice.
    it('lays the loading state out in flow at the page-body height', async () => {
      seed({ loading: { consentsLoading: true } });
      const el = await mount();
      const loading = root(el).querySelector('keep-page-loading')!;
      expect(loading.hasAttribute('contained')).toBe(true);
      expect(loading.hasAttribute('page-height')).toBe(true);
    });

    it('replaces the table while users load', async () => {
      seed({ loading: { usersLoading: true } });
      const el = await mount();
      expect(root(el).querySelector('table')).toBeNull();
    });

    it('shows the table once both have loaded', async () => {
      const el = await mount();
      expect(root(el).querySelector('table')).toBeTruthy();
    });

    it('keeps the filter drawer reachable while the list loads', async () => {
      // The drawer is a sibling of the loading state, not a child of the table, so opening
      // Filters mid-load still finds something to open.
      seed({ loading: { consentsLoading: true } });
      const el = await mount();
      expect(root(el).querySelector('keep-consent-filter')).toBeTruthy();
    });
  });

  describe('structure', () => {
    it('labels the columns', async () => {
      const el = await mount();
      expect(headerLabels(el).join('|')).toContain('Expirations');
      expect(headerLabels(el).join('|')).toContain('Action');
    });

    it('offers search boxes for user and app name', async () => {
      const el = await mount();
      expect(searchBox(el, 'Search User')).toBeTruthy();
      expect(searchBox(el, 'Search App Name')).toBeTruthy();
    });

    it('names both search boxes for a screen reader', async () => {
      // They carried a placeholder and nothing else, so neither had an accessible name.
      const el = await mount();
      expect(searchBox(el, 'Search User').getAttribute('aria-label')).toBe('Search User');
      expect(searchBox(el, 'Search App Name').getAttribute('aria-label')).toBe('Search App Name');
    });

    it('says which axis every header cell heads', async () => {
      const el = await mount();
      const headers = Array.from(root(el).querySelectorAll('thead th'));
      expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    });

    it('names the sort controls, and says which way they will sort', async () => {
      const el = await mount();
      expect(sortButtonFor(el, 'Search User').getAttribute('aria-label')).toBe(
        'Sort by user, ascending',
      );
      await click(el, sortButtonFor(el, 'Search User'));
      expect(sortButtonFor(el, 'Search User').getAttribute('aria-label')).toBe(
        'Sort by user, descending',
      );
    });

    it('renders one row element per visible consent', async () => {
      const el = await mount();
      expect(root(el).querySelectorAll('keep-consent-item')).toHaveLength(5);
    });

    it('hands each row the directories it resolves against', async () => {
      const el = await mount();
      const row = root(el).querySelector('keep-consent-item')!;
      expect(row.consent.username).toBe('User01');
      expect(row.apps).toHaveLength(12);
    });

    it('passes Expand all down to every row', async () => {
      const el = await mount({ expand: true });
      const rows = Array.from(root(el).querySelectorAll('keep-consent-item'));
      expect(rows.every((row) => row.hasAttribute('expand'))).toBe(true);
    });
  });

  describe('pagination', () => {
    /**
     * Asserted directly, because the shared `mount` pins the page size so the paging cases
     * below stay meaningful — which would otherwise leave the default itself uncovered. #955.
     */
    it('defaults to 25 rows a page, one of the sizes the footer offers', async () => {
      const el = await mountLit<ConsentsTable>(TAG);
      await settle(el);
      expect(el.rowsPerPage).toBe(25);
      const table = el.shadowRoot!.querySelector('keep-data-table') as HTMLElement & {
        rowsPerPage: number;
        rowsPerPageOptions: number[];
      };
      expect(table.rowsPerPage).toBe(25);
      expect(table.rowsPerPageOptions).toContain(25);
    });

    it('shows the first five consents by default', async () => {
      const el = await mount();
      expect(visibleUsers(el)).toEqual(['User01', 'User02', 'User03', 'User04', 'User05']);
    });

    it('reports the visible range', async () => {
      await mount();
      expect(rangeText()).toBe('1–5 of 12');
    });

    it('advances a page', async () => {
      const el = await mount();
      await click(el, nav.next());
      expect(visibleUsers(el)).toEqual(['User06', 'User07', 'User08', 'User09', 'User10']);
    });

    it('shows a short final page', async () => {
      const el = await mount();
      await click(el, nav.last());
      expect(visibleUsers(el)).toEqual(['User11', 'User12']);
    });

    it('disables first and previous on page one', async () => {
      await mount();
      expect(nav.first().disabled).toBe(true);
      expect(nav.prev().disabled).toBe(true);
    });

    it('disables next and last on the final page', async () => {
      const el = await mount();
      await click(el, nav.last());
      expect(nav.next().disabled).toBe(true);
      expect(nav.last().disabled).toBe(true);
    });

    it('shows every consent when the page size is All', async () => {
      const el = await mount();
      setRowsPerPage(-1);
      await settle(el);
      // Full identity list, not just a count, so a dropped, duplicated or misordered record
      // in the slice is caught.
      expect(visibleUsers(el)).toEqual(template.map((c) => c.username));
    });

    it('returns to page one when the page size changes', async () => {
      const el = await mount();
      await click(el, nav.last());
      setRowsPerPage(10);
      await settle(el);
      expect(visibleUsers(el)[0]).toBe('User01');
    });
  });

  describe('filtering and sorting', () => {
    it('filters by username', async () => {
      const el = await mount();
      await type(el, 'Search User', 'user1');
      expect(visibleUsers(el)).toEqual(['User10', 'User11', 'User12']);
    });

    it('searches the address the directory resolves to, not the name the consent holds', async () => {
      // The search matches what the user can see in the column, which for a consent with a
      // directory entry is the internet address rather than the Domino name.
      store.dispatch(
        setUsers([
          { u: { FullName: ['User07'], InternetAddress: ['grace@acme.test'] } },
        ] as never),
      );
      const el = await mount();
      expect(visibleUsers(el)[0]).toBe('User01');

      await type(el, 'Search User', 'acme');
      expect(visibleUsers(el)).toEqual(['grace@acme.test']);
    });

    it('falls back to the raw name for a directory entry with no address', async () => {
      store.dispatch(setUsers([{ u: { FullName: ['User07'], InternetAddress: [''] } }] as never));
      const el = await mount();
      await type(el, 'Search User', 'user07');
      expect(visibleUsers(el)).toEqual(['User07']);
    });

    it('filters by app name', async () => {
      const el = await mount();
      await type(el, 'Search App Name', 'App01');
      expect(visibleUsers(el)).toEqual(['User12']);
    });

    // The filter pass ends by returning to page one, so changing a search box always does —
    // even if a later page was already showing.
    it('returns to page one when a filter changes', async () => {
      const el = await mount();
      await click(el, nav.next());
      expect(visibleUsers(el)[0]).toBe('User06');

      await type(el, 'Search User', 'user0');
      expect(visibleUsers(el)).toEqual(['User01', 'User02', 'User03', 'User04', 'User05']);
    });

    it('reverses the user order when sorted twice', async () => {
      const el = await mount();
      await click(el, sortButtonFor(el, 'Search User'));
      await click(el, sortButtonFor(el, 'Search User'));
      expect(visibleUsers(el)[0]).toBe('User12');
    });

    it('sorts by app name independently of the user sort', async () => {
      const el = await mount();
      await click(el, sortButtonFor(el, 'Search App Name'));
      // Apps are named inversely to users (User01 -> App12, ..., User12 -> App01), so
      // ascending-by-app-name order is App01..App12, i.e. User12..User01. A single click must
      // show User12 first: a no-op button, or one wired to the user sort instead, would both
      // leave User01 first, so this discriminates both failure modes rather than only
      // re-checking the default.
      expect(visibleUsers(el)[0]).toBe('User12');
    });

    /*
     * Replaces the characterization suite's "mutates the store consents array in place when
     * sorting", which pinned a defect rather than a behaviour: the original sorted the array
     * read straight out of the store, and Redux Toolkit deep-freezes what a reducer produces,
     * so both sort controls threw `TypeError: Cannot assign to read only property '0'` for
     * every list the app actually loaded. That assertion only passed because the suite seeded
     * through `preloadedState`, which bypasses the reducer and the freeze with it.
     *
     * These two are what should have been asserted: the store's order is left alone, and the
     * sort works at all against the frozen array a user really has. The second is the
     * regression test for the crash — a sort that threw would leave the order untouched and
     * satisfy the first on its own.
     */
    it('leaves the store’s own consent order alone when sorting', async () => {
      const el = await mount();
      const usernames = () =>
        store.getState().consents.consents.map((c: { username: string }) => c.username);
      const before = usernames();
      await click(el, sortButtonFor(el, 'Search User'));
      await click(el, sortButtonFor(el, 'Search User'));
      expect(usernames()).toEqual(before);
    });

    it('sorts a list the store has frozen', async () => {
      expect(Object.isFrozen(store.getState().consents.consents)).toBe(true);
      const el = await mount();
      await click(el, sortButtonFor(el, 'Search User'));
      await click(el, sortButtonFor(el, 'Search User'));
      expect(visibleUsers(el)[0]).toBe('User12');
    });

    it('applies a filter the drawer publishes', async () => {
      const el = await mount();
      root(el).querySelector('keep-consent-filter')!.dispatchEvent(
        new CustomEvent('filter-change', {
          detail: {
            status: 'All',
            showWithApps: false,
            expiration: { expiration: 'All', date: new Date() },
            tokenExpiration: { expiration: 'All', date: new Date() },
            scopes: ['nothing-matches-this'],
          },
          bubbles: true,
          composed: true,
        }),
      );
      await settle(el);
      expect(visibleUsers(el)).toEqual([]);
      expect(rangeText()).toBe('0 of 0');
    });

    it('keeps only consents whose code has not expired when the status is Active', async () => {
      const consents = freshConsents();
      consents[0].code_expires_at = new Date(NOW.getTime() - DAY).toISOString();
      seed({ consents });
      const el = await mount();

      el.status = 'Active';
      await settle(el);
      expect(visibleUsers(el)).not.toContain('User01');
      expect(visibleUsers(el)[0]).toBe('User02');
    });

    it('keeps only consents that name an application', async () => {
      seed({ appList: apps.slice(0, 2) });
      const el = await mount();

      el.showWithApps = true;
      await settle(el);
      expect(visibleUsers(el)).toEqual(['User01', 'User02']);
    });

    it('keeps only consents with an unparseable expiry when the mode is None', async () => {
      const consents = freshConsents();
      consents[3].code_expires_at = 'not-a-date';
      seed({ consents });
      const el = await mount();

      el.expiration = { expiration: 'None', date: new Date() };
      await settle(el);
      expect(visibleUsers(el)).toEqual(['User04']);
    });

    it('matches a Custom expiry on the calendar day, not the instant', async () => {
      const consents = freshConsents();
      // An hour after the fixture's expiry instant, so a filter comparing instants finds
      // nothing and only a calendar-day comparison matches. With `NOW` frozen at local noon
      // that hour cannot leave the day — which is the whole of #997; this line used to read
      // `Date.now()` and failed for one hour in every twenty-four.
      const day = new Date(NOW.getTime() + 7 * DAY);
      seed({ consents });
      const el = await mount();

      el.expiration = { expiration: 'Custom', date: new Date(day.getTime() + 3_600_000) };
      await settle(el);
      expect(visibleUsers(el)).toHaveLength(5);
    });

    it('filters the token expiry independently of the code expiry', async () => {
      const consents = freshConsents();
      consents[5].refresh_token_expires_at = 'not-a-date';
      seed({ consents });
      const el = await mount();

      el.tokenExpiration = { expiration: 'None', date: new Date() };
      await settle(el);
      expect(visibleUsers(el)).toEqual(['User06']);
    });

    it('keeps only consents holding one of the wanted scopes', async () => {
      const consents = freshConsents();
      consents[2].scope = 'read,admin';
      seed({ consents });
      const el = await mount();

      el.scopes = ['admin'];
      await settle(el);
      expect(visibleUsers(el)).toEqual(['User03']);
    });

    it('treats an empty scope entry as no scope filter at all', async () => {
      // The original's two "cleared" values were `['']` and `[]`; the filter discards empty
      // strings before counting, so both have always meant the same thing.
      const el = await mount();
      el.scopes = [''];
      await settle(el);
      expect(visibleUsers(el)).toHaveLength(5);
    });

    it('re-filters when the store’s consents change underneath it', async () => {
      const el = await mount();
      store.dispatch(setConsents(freshConsents().slice(0, 2) as never));
      await settle(el);
      expect(visibleUsers(el)).toEqual(['User01', 'User02']);
    });
  });

  describe('the two flags the options bar owns', () => {
    it('clears every filter, both searches and both sorts on reset', async () => {
      const el = await mount();
      await type(el, 'Search User', 'user1');
      await click(el, sortButtonFor(el, 'Search User'));
      el.scopes = ['read'];
      el.status = 'Active';
      await settle(el);

      el.reset = true;
      await settle(el);

      expect(el.user).toBe('');
      expect(el.appName).toBe('');
      expect(el.status).toBe('All');
      expect(el.showWithApps).toBe(false);
      expect(el.expiration.expiration).toBe('All');
      expect(el.tokenExpiration.expiration).toBe('All');
      expect(el.scopes).toEqual([]);
      expect(el.sortUser).toBe(true);
      expect(el.sortAppName).toBe(true);
      expect(visibleUsers(el)).toHaveLength(5);
    });

    it('empties the search boxes on the screen, not only in its own state', async () => {
      const el = await mount();
      await type(el, 'Search User', 'user1');
      el.reset = true;
      await settle(el);
      expect(searchBox(el, 'Search User').value).toBe('');
    });

    it('reports the reset consumed, so the parent can lower the flag', async () => {
      const el = await mount();
      const heard = vi.fn();
      el.addEventListener('reset-change', heard);

      el.reset = true;
      await settle(el);

      expect(heard).toHaveBeenCalledTimes(1);
      expect(heard.mock.calls[0][0].detail).toEqual({ reset: false });
    });

    it('consumes a reset once, however many updates follow', async () => {
      const el = await mount();
      const heard = vi.fn();
      el.addEventListener('reset-change', heard);

      el.reset = true;
      await settle(el);
      await type(el, 'Search User', 'user1');

      expect(heard).toHaveBeenCalledTimes(1);
    });

    it('re-arms once the parent lowers the flag', async () => {
      const el = await mount();
      const heard = vi.fn();
      el.addEventListener('reset-change', heard);

      el.reset = true;
      await settle(el);
      el.reset = false;
      await settle(el);
      el.reset = true;
      await settle(el);

      expect(heard).toHaveBeenCalledTimes(2);
    });

    it('clears the drawer filters and reports back off when filtersOn arrives true', async () => {
      const el = await mount();
      const heard = vi.fn();
      el.addEventListener('filters-on-change', heard);
      el.status = 'Active';
      await type(el, 'Search User', 'user1');

      el.filtersOn = true;
      await settle(el);

      expect(el.status).toBe('All');
      // The searches are the reset's to clear, not this flag's — it only ever called the
      // drawer's own reset.
      expect(el.user).toBe('user1');
      expect(heard).toHaveBeenCalledTimes(1);
      expect(heard.mock.calls[0][0].detail).toEqual({ filtersOn: false });
    });

    it('never reports the flag on', async () => {
      // The original set it true on every filter pass and cleared it again in the same
      // batch; the one path where it stuck fed the effect above, which then wiped the very
      // filter that had made it stick.
      const el = await mount();
      const heard = vi.fn();
      el.addEventListener('filters-on-change', heard);

      await type(el, 'Search User', 'user1');
      el.status = 'Active';
      el.scopes = [];
      el.expiration = { expiration: 'None', date: new Date() };
      el.tokenExpiration = { expiration: 'None', date: new Date() };
      await settle(el);

      expect(heard).not.toHaveBeenCalled();
      expect(el.status).toBe('Active');
    });
  });

  describe('the drawer it owns', () => {
    it('hands the drawer the filter the table is applying', async () => {
      const el = await mount();
      el.status = 'Active';
      el.scopes = ['read'];
      await settle(el);

      const filter = root(el).querySelector('keep-consent-filter')!;
      expect(filter.status).toBe('Active');
      expect(filter.scopes).toEqual(['read']);
    });

    it('hands the drawer the consents its scope list is built from', async () => {
      const el = await mount();
      const filter = root(el).querySelector('keep-consent-filter')!;
      expect(filter.consents).toHaveLength(12);
    });

    it('keeps the drawer’s filter-change to itself', async () => {
      const el = await mount();
      const leaked = vi.fn();
      document.body.addEventListener('filter-change', leaked);

      root(el).querySelector('keep-consent-filter')!.dispatchEvent(
        new CustomEvent('filter-change', {
          detail: {
            status: 'All',
            showWithApps: false,
            expiration: { expiration: 'All', date: new Date() },
            tokenExpiration: { expiration: 'All', date: new Date() },
            scopes: [],
          },
          bubbles: true,
          composed: true,
        }),
      );
      await settle(el);

      expect(leaked).not.toHaveBeenCalled();
      document.body.removeEventListener('filter-change', leaked);
    });
  });
});
