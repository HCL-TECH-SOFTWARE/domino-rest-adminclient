/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import {
  fetchKeepPermissions as seedPermissions,
  fetchKeepScopes as seedScopes,
  setPullDatabase,
  setPullScope,
} from '../../../src/store/databases/reducer';
import { toggleAlert } from '../../../src/store/alerts/reducer';
import { setDBError } from '../../../src/store/databases/shared';
import { FETCH_AVAILABLE_DATABASES, INIT_STATE } from '../../../src/store/databases/types';
import { fetchKeepDatabases } from '../../../src/store/databases/action';
import { Router, memoryHistory } from '../../../src/router/router';
import { getRouter, setRouterForTest } from '../../../src/router/instance';
import '../../../src/components/keep-elements/keep-scopes-list';
import type ScopesList from '../../../src/components/keep-elements/keep-scopes-list';
import type ScopesMultiView from '../../../src/components/keep-elements/keep-scopes-multi-view';
import type ScopeFormContainer from '../../../src/components/keep-elements/keep-scope-form-container';
import type CardViewOptions from '../../../src/components/keep-elements/keep-card-view-options';

/**
 * `keep-scopes-list` — the conversion of `scopes/ScopeLists.tsx`, the `/scope` route.
 *
 * The React file had no test of its own, so nothing was carried over; everything below is new
 * cover for behaviour that shipped untested. It is written around what the conversion had to
 * decide: the filtered list is derived per render rather than mirrored into state, the drawer's
 * selection and mode stay this element's own state, and the one navigation goes through a
 * `Router` handed in as a property rather than a hook.
 *
 * `fetchKeepDatabases` is the one thing mocked — it is a thunk that talks to the server. It
 * becomes a tagged plain action, so these tests can assert *that* it was asked for; no reducer
 * claims the tag, so nothing else in the store moves as a side effect. The rest of the module
 * is kept, because the drawer this element renders dispatches from it.
 */
vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  fetchKeepDatabases: vi.fn(() => ({ type: 'test/fetchKeepDatabases' })),
}));

const TAG = 'keep-scopes-list';

const scope = (apiName: string, nsfPath: string) => ({
  apiName,
  schemaName: `${apiName}-schema`,
  description: '',
  nsfPath,
  icon: '',
  iconName: '',
  isActive: 'true',
});

/** Deliberately unsorted, and with a space in one path so the NSF search has something to find. */
const ZETA = scope('Zeta', 'z.nsf');
const ALPHA = scope('Alpha', 'my apps.nsf');
const MID = scope('Mid', 'm.nsf');

const seed = () => {
  store.dispatch(seedScopes([ZETA, ALPHA, MID]));
  store.dispatch(setPullScope(true));
};

const shadow = (el: ScopesList) => el.shadowRoot!;
const heading = (el: ScopesList) => shadow(el).querySelector('h1')!;
const buttonNamed = (el: ScopesList, text: string) =>
  Array.from(shadow(el).querySelectorAll('keep-button')).find(
    (button) => button.textContent!.trim() === text,
  ) as HTMLElement;
const search = (el: ScopesList) => shadow(el).querySelector('keep-database-search')!;
const viewOptions = (el: ScopesList) =>
  shadow(el).querySelector('keep-card-view-options') as CardViewOptions;
const multiView = (el: ScopesList) =>
  shadow(el).querySelector('keep-scopes-multi-view') as ScopesMultiView | null;
const drawer = (el: ScopesList) =>
  shadow(el).querySelector('keep-scope-form-container') as ScopeFormContainer;
const listed = (el: ScopesList) =>
  ((multiView(el)?.databases ?? []) as Array<{ apiName: string }>).map((row) => row.apiName);

const emitOn = async (el: ScopesList, target: Element, type: string, detail: unknown) => {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  await el.updateComplete;
};

/**
 * Put the app's router at `entry` for this test (#926).
 *
 * The element reads the URL through a `RouterController` over the module singleton now, so a
 * route is installed rather than passed in as a property. `setupTests.ts` installs a memory
 * router at `/` for every test and disposes it afterwards; this replaces it with one that
 * starts where the screen expects to be.
 */
const atRoute = (entry = '/scope') =>
  setRouterForTest(new Router({ history: memoryHistory([entry]) }));

const mount = async (props: Partial<ScopesList> = {}) => {
  const el = await mountLit<ScopesList>(TAG, props);
  await el.updateComplete;
  return el;
};

describe('keep-scopes-list', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    // The alerts slice does not answer the reset broadcast, so it is cleared by hand —
    // otherwise a message left by one test reads as a pass in the next.
    store.dispatch(toggleAlert(''));
    vi.mocked(fetchKeepDatabases).mockClear();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- page chrome -----------------------------------------------------------------------

  it('renders the page title as the screen heading', async () => {
    const el = await mount();
    expect(heading(el).textContent!.trim()).toBe('Scope Management');
  });

  it('offers the scope name as the first search column', async () => {
    const el = await mount();
    expect(search(el).nameType).toBe('SCOPE NAME');
    expect(search(el).searchType).toBe('SCOPE NAME');
  });

  it('blocks the search bar and the view picker until the scopes are in', async () => {
    const el = await mount();
    expect(search(el).hasAttribute('disabled')).toBe(true);
    expect(viewOptions(el).hasAttribute('disabled')).toBe(true);

    store.dispatch(setPullScope(true));
    await el.updateComplete;
    expect(search(el).hasAttribute('disabled')).toBe(false);
    expect(viewOptions(el).hasAttribute('disabled')).toBe(false);
  });

  it('asks for nothing on connect — the route owns the initial fetch', async () => {
    await mount();
    expect(vi.mocked(fetchKeepDatabases)).not.toHaveBeenCalled();
  });

  // ---- refresh ---------------------------------------------------------------------------

  it('clears both pull flags, empties the available databases and refetches on Refresh', async () => {
    seed();
    store.dispatch(setPullDatabase(true));
    store.dispatch({ type: FETCH_AVAILABLE_DATABASES, payload: [{ nsfpath: 'db.nsf' }] });
    const el = await mount();

    buttonNamed(el, 'Refresh').click();
    await el.updateComplete;

    const { databasePull, scopePull, availableDatabases } = store.getState().databases;
    expect(databasePull).toBe(false);
    expect(scopePull).toBe(false);
    expect(availableDatabases).toEqual([]);
    expect(vi.mocked(fetchKeepDatabases)).toHaveBeenCalledTimes(1);
  });

  // ---- add scope -------------------------------------------------------------------------

  it('refuses to open the drawer without the create permission', async () => {
    seed();
    store.dispatch(seedPermissions({ createDbMapping: false, deleteDbMapping: false }));
    const el = await mount();

    buttonNamed(el, 'Add Scope').click();
    await el.updateComplete;

    expect(store.getState().alert.message).toBe("You don't have permission to create scope.");
    expect(store.getState().drawer.visible).toBe(false);
    expect(vi.mocked(fetchKeepDatabases)).not.toHaveBeenCalled();
  });

  it('opens the drawer in Add mode, clears any error and fetches the schemas', async () => {
    seed();
    store.dispatch(seedPermissions({ createDbMapping: true, deleteDbMapping: true }));
    store.dispatch(setDBError('previous failure'));
    const el = await mount();

    buttonNamed(el, 'Add Scope').click();
    await el.updateComplete;

    expect(store.getState().drawer.visible).toBe(true);
    expect(store.getState().databases.dbError).toBe(false);
    expect(drawer(el).isEdit).toBe(false);
    expect(vi.mocked(fetchKeepDatabases)).toHaveBeenCalledTimes(1);
  });

  it('does not refetch the schemas for Add when they are already pulled', async () => {
    seed();
    store.dispatch(setPullDatabase(true));
    store.dispatch(seedPermissions({ createDbMapping: true, deleteDbMapping: true }));
    const el = await mount();

    buttonNamed(el, 'Add Scope').click();
    await el.updateComplete;

    expect(store.getState().drawer.visible).toBe(true);
    expect(vi.mocked(fetchKeepDatabases)).not.toHaveBeenCalled();
  });

  // ---- opening a scope -------------------------------------------------------------------

  it('opens the drawer in Edit mode on the scope a card asked for', async () => {
    seed();
    store.dispatch(setDBError('previous failure'));
    const el = await mount();

    await emitOn(el, multiView(el)!, 'scope-open', { scope: ALPHA });

    expect(drawer(el).isEdit).toBe(true);
    expect(drawer(el).database).toBe(ALPHA);
    expect(store.getState().drawer.visible).toBe(true);
    expect(store.getState().databases.dbError).toBe(false);
    expect(vi.mocked(fetchKeepDatabases)).toHaveBeenCalledTimes(1);
  });

  it('does not refetch the schemas on open when they are already pulled', async () => {
    seed();
    store.dispatch(setPullDatabase(true));
    const el = await mount();

    await emitOn(el, multiView(el)!, 'scope-open', { scope: ALPHA });

    expect(drawer(el).database).toBe(ALPHA);
    expect(vi.mocked(fetchKeepDatabases)).not.toHaveBeenCalled();
  });

  it('mounts the drawer container from the first render, so its close can animate', async () => {
    const el = await mount();
    expect(drawer(el)).toBeTruthy();
    expect(drawer(el).isEdit).toBe(false);
    expect(drawer(el).database).toBeUndefined();
  });

  // ---- searching -------------------------------------------------------------------------

  it('lists every scope, sorted by name, with nothing typed', async () => {
    seed();
    const el = await mount();
    expect(listed(el)).toEqual(['Alpha', 'Mid', 'Zeta']);
  });

  it('filters on the scope name, case-insensitively, and trims what was typed', async () => {
    seed();
    const el = await mount();

    await emitOn(el, search(el), 'search-change', { value: '  mi  ' });
    expect(listed(el)).toEqual(['Mid']);
  });

  it('filters on the NSF path once the search type names it', async () => {
    seed();
    const el = await mount();

    await emitOn(el, search(el), 'search-type-change', { searchType: 'NSF NAME' });
    await emitOn(el, search(el), 'search-change', { value: 'my apps' });
    expect(listed(el)).toEqual(['Alpha']);
    expect(search(el).searchType).toBe('NSF NAME');
  });

  it('drops the text filter again when the field is cleared', async () => {
    seed();
    const el = await mount();

    await emitOn(el, search(el), 'search-change', { value: 'mi' });
    await emitOn(el, search(el), 'search-change', { value: '' });
    expect(listed(el)).toEqual(['Alpha', 'Mid', 'Zeta']);
  });

  // ---- the view, and the URL it is recorded in --------------------------------------------

  it('defaults to the card view when the URL says nothing', async () => {
    seed();
    atRoute();
    const el = await mount();
    expect(viewOptions(el).view).toBe('card');
    expect(multiView(el)!.view).toBe('card');
  });

  it('reads the view out of the query string on arrival', async () => {
    seed();
    atRoute('/scope?view=nsf');
    const el = await mount();
    expect(viewOptions(el).view).toBe('nsf');
  });

  it('ignores a query string that carries something else', async () => {
    seed();
    atRoute('/scope?sort=name');
    const el = await mount();
    expect(viewOptions(el).view).toBe('card');
  });

  it('records a view pick in the query string and re-labels the picker', async () => {
    seed();
    const instance = atRoute();
    const el = await mount();

    await emitOn(el, viewOptions(el), 'view-change', { view: 'stack' });

    expect(instance.location()).toMatchObject({ pathname: '/scope', search: '?view=stack' });
    expect(viewOptions(el).view).toBe('stack');
    expect(multiView(el)!.view).toBe('stack');
  });

  /*
   * This was "changes the view with no router in scope, and navigates nowhere" — the element
   * took a nullable `router` property and the navigation was guarded. There is no such state
   * any more (#926): the controller always has a router, so what is left to pin is that the
   * screen works against whatever router it finds rather than against one a test handed it.
   */
  it('changes the view against the app router the controller found for itself', async () => {
    seed();
    const el = await mount();

    await emitOn(el, viewOptions(el), 'view-change', { view: 'alphabetical' });

    expect(viewOptions(el).view).toBe('alphabetical');
    expect(getRouter().location().search).toBe('?view=alphabetical');
  });

  // ---- loading ---------------------------------------------------------------------------

  it('shows the loading indicator instead of the list until something has been pulled', async () => {
    const el = await mount();

    expect(multiView(el)).toBeNull();
    const loader = shadow(el).querySelector('keep-page-loading')!;
    expect(loader.getAttribute('contained')).toBe('');
    expect(loader.getAttribute('page-height')).toBe('');
  });

  it('shows the list once the scopes are in', async () => {
    seed();
    const el = await mount();

    expect(multiView(el)).toBeTruthy();
    expect(shadow(el).querySelector('keep-page-loading')).toBeNull();
  });

  /**
   * `setPullDatabase` raises *both* flags — the two are only ever separated by a later
   * `setPullScope`, which is what this does. Without that second dispatch the two halves of
   * the condition are indistinguishable, and dropping either one still passes.
   */
  it('shows the list once the schemas are in, even with the scopes still pulling', async () => {
    store.dispatch(setPullDatabase(true));
    store.dispatch(setPullScope(false));
    const el = await mount();

    expect(multiView(el)).toBeTruthy();
    expect(shadow(el).querySelector('keep-page-loading')).toBeNull();
    expect(listed(el)).toEqual([]);
    // …and the search bar stays shut, because that one reads the scopes flag on its own.
    expect(search(el).hasAttribute('disabled')).toBe(true);
  });

  it('always renders the network-error dialog', async () => {
    const el = await mount();
    expect(shadow(el).querySelector('keep-network-error-dialog')).toBeTruthy();
  });
});
