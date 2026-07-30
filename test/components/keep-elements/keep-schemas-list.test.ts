/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import {
  fetchKeepDatabases as seedSchemas,
  fetchKeepPermissions as seedPermissions,
  fetchKeepScopes as seedScopes,
  setPullDatabase,
  setPullScope,
} from '../../../src/store/databases/reducer';
import { setOnlyShowSchemasWithScopes } from '../../../src/store/databases/reducer';
import { toggleAlert } from '../../../src/store/alerts/reducer';
import { setLoading } from '../../../src/store/loading/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import { fetchKeepDatabases } from '../../../src/store/databases/action';
import { Router, memoryHistory } from '../../../src/router/router';
import '../../../src/components/keep-elements/keep-schemas-list';
import type SchemasList from '../../../src/components/keep-elements/keep-schemas-list';
import type SchemasMultiView from '../../../src/components/keep-elements/keep-schemas-multi-view';
import type CardViewOptions from '../../../src/components/keep-elements/keep-card-view-options';
import type Tooltip from '../../../src/components/keep-elements/keep-tooltip';

/**
 * `keep-schemas-list` — the conversion of `schemas/SchemasLists.tsx`, the `/schema` route.
 *
 * The React file had no test of its own, so nothing was carried over; everything below is
 * new cover for behaviour that shipped untested. What it is written around is the set of
 * decisions the conversion had to make: the fetch that used to be an effect now happens once
 * on connect, the filtered list is derived per render instead of mirrored into state, and the
 * two navigations go through a `Router` handed in as a property rather than a React hook.
 *
 * `fetchKeepDatabases` is the one thing mocked — it is a thunk that talks to the server. It
 * becomes a tagged plain action, so these tests can assert *that* it was asked for; no
 * reducer claims the tag, so nothing else in the store moves as a side effect. The rest of
 * the module is kept, because the dialog this element renders dispatches `addSchema` from it.
 */
vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  fetchKeepDatabases: vi.fn(() => ({ type: 'test/fetchKeepDatabases' })),
}));

const TAG = 'keep-schemas-list';

const schema = (schemaName: string, nsfPath: string) => ({
  schemaName,
  nsfPath,
  description: '',
  icon: '',
  iconName: '',
});

const scope = (schemaName: string, nsfPath: string) => ({
  apiName: `${schemaName}-api`,
  schemaName,
  nsfPath,
  description: '',
  icon: '',
  iconName: '',
  isActive: 'true',
});

/** Deliberately unsorted, and with a space in one path so the URL encoding is visible. */
const ZETA = schema('Zeta', 'z.nsf');
const ALPHA = schema('Alpha', 'my apps.nsf');
const MID = schema('Mid', 'm.nsf');

/** Zeta and Alpha have scopes; Mid does not, so the filter separates them. */
const seed = () => {
  store.dispatch(seedSchemas([ZETA, ALPHA, MID]));
  store.dispatch(seedScopes([scope('Zeta', 'z.nsf'), scope('Alpha', 'my apps.nsf')]));
  store.dispatch(setPullScope(true));
  store.dispatch(setPullDatabase(true));
};

const shadow = (el: SchemasList) => el.shadowRoot!;
const heading = (el: SchemasList) => shadow(el).querySelector('h1')!;
const buttonNamed = (el: SchemasList, text: string) =>
  Array.from(shadow(el).querySelectorAll('keep-button')).find(
    (button) => button.textContent!.trim() === text,
  ) as HTMLElement;
const search = (el: SchemasList) => shadow(el).querySelector('keep-database-search')!;
const viewOptions = (el: SchemasList) =>
  shadow(el).querySelector('keep-card-view-options') as CardViewOptions;
const toggle = (el: SchemasList) => shadow(el).querySelector('wa-switch')!;
const tooltip = (el: SchemasList) => shadow(el).querySelector('keep-tooltip') as Tooltip;
const multiView = (el: SchemasList) =>
  shadow(el).querySelector('keep-schemas-multi-view') as SchemasMultiView | null;
const listed = (el: SchemasList) =>
  (multiView(el)?.databases ?? []).map((database: { schemaName: string }) => database.schemaName);
const dialog = (el: SchemasList) => shadow(el).querySelector('keep-add-import-dialog')!;

const emitOn = async (el: SchemasList, target: Element, type: string, detail: unknown) => {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  await el.updateComplete;
};

const router = (entry = '/schema') => new Router({ history: memoryHistory([entry]) });

const mount = async (props: Partial<SchemasList> = {}) => {
  const el = await mountLit<SchemasList>(TAG, props);
  await el.updateComplete;
  return el;
};

describe('keep-schemas-list', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    // Neither the alerts nor the loading slice answers the reset broadcast, so both are
    // cleared by hand — otherwise a message left by one test reads as a pass in the next.
    store.dispatch(toggleAlert(''));
    store.dispatch(setLoading({ status: false }));
    vi.mocked(fetchKeepDatabases).mockClear();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    store.dispatch(setLoading({ status: false }));
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- the initial fetch ----------------------------------------------------------------

  it('asks for the schemas on connect when nothing has been pulled', async () => {
    await mount();
    expect(vi.mocked(fetchKeepDatabases)).toHaveBeenCalledTimes(1);
  });

  it('does not ask again when the schemas are already in the store', async () => {
    seed();
    await mount();
    expect(vi.mocked(fetchKeepDatabases)).not.toHaveBeenCalled();
  });

  it('does not ask while a pull is already recorded', async () => {
    store.dispatch(setPullDatabase(true));
    await mount();
    expect(vi.mocked(fetchKeepDatabases)).not.toHaveBeenCalled();
  });

  // ---- page chrome ----------------------------------------------------------------------

  it('renders the page title as the screen heading', async () => {
    const el = await mount();
    expect(heading(el).textContent!.trim()).toBe('Schema Management');
  });

  it('labels the scopes filter on the control itself, so it has an accessible name', async () => {
    const el = await mount();
    expect(toggle(el).textContent!.trim()).toBe('Only show schemas configured with scopes');
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

  // ---- refresh --------------------------------------------------------------------------

  it('clears both pull flags, raises the loader and refetches on Refresh', async () => {
    seed();
    const el = await mount();

    buttonNamed(el, 'Refresh').click();
    await el.updateComplete;

    const { databasePull, scopePull } = store.getState().databases;
    expect(databasePull).toBe(false);
    expect(scopePull).toBe(false);
    expect(store.getState().loading.loading.status).toBe(true);
    expect(vi.mocked(fetchKeepDatabases)).toHaveBeenCalledTimes(1);
  });

  // ---- add schema -----------------------------------------------------------------------

  it('refuses to open the Add dialog while the scopes are still loading', async () => {
    const el = await mount();

    buttonNamed(el, 'Add Schema').click();
    await el.updateComplete;

    expect(store.getState().alert.message).toBe('Please wait until schema loading complete!');
    expect(dialog(el).hasAttribute('open')).toBe(false);
  });

  it('refuses to open the Add dialog without the create permission', async () => {
    seed();
    store.dispatch(seedPermissions({ createDbMapping: false, deleteDbMapping: false }));
    const el = await mount();

    buttonNamed(el, 'Add Schema').click();
    await el.updateComplete;

    expect(store.getState().alert.message).toBe("You don't have permission to create schema.");
    expect(dialog(el).hasAttribute('open')).toBe(false);
  });

  it('opens the Add dialog with the create permission, and closes it on request', async () => {
    seed();
    store.dispatch(seedPermissions({ createDbMapping: true, deleteDbMapping: true }));
    const el = await mount();

    buttonNamed(el, 'Add Schema').click();
    await el.updateComplete;
    expect(dialog(el).hasAttribute('open')).toBe(true);
    expect(store.getState().alert.message).toBe('');

    await emitOn(el, dialog(el), 'dialog-close', undefined);
    expect(dialog(el).hasAttribute('open')).toBe(false);
  });

  // ---- the scopes filter ----------------------------------------------------------------

  it('shows only schemas a scope points at while the filter is on', async () => {
    seed();
    const el = await mount();
    expect(listed(el)).toEqual(['Alpha', 'Zeta']);
    expect(toggle(el).hasAttribute('checked')).toBe(true);
    expect(tooltip(el).content).toBe('On');
  });

  it('shows every schema once the filter is off', async () => {
    seed();
    store.dispatch(setOnlyShowSchemasWithScopes(false));
    const el = await mount();
    expect(listed(el)).toEqual(['Alpha', 'Mid', 'Zeta']);
    expect(toggle(el).hasAttribute('checked')).toBe(false);
    expect(tooltip(el).content).toBe('Off');
  });

  it('flips the stored flag when the toggle changes', async () => {
    seed();
    const el = await mount();

    toggle(el).dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    expect(store.getState().databases.onlyShowSchemasWithScopes).toBe(false);
    expect(listed(el)).toEqual(['Alpha', 'Mid', 'Zeta']);
  });

  // ---- searching ------------------------------------------------------------------------

  it('filters on the schema name, case-insensitively, and trims what was typed', async () => {
    seed();
    store.dispatch(setOnlyShowSchemasWithScopes(false));
    const el = await mount();

    await emitOn(el, search(el), 'search-change', { value: '  mi  ' });
    expect(listed(el)).toEqual(['Mid']);
  });

  it('filters on the NSF path once the search type names it', async () => {
    seed();
    store.dispatch(setOnlyShowSchemasWithScopes(false));
    const el = await mount();

    await emitOn(el, search(el), 'search-type-change', { searchType: 'NSF NAME' });
    await emitOn(el, search(el), 'search-change', { value: 'my apps' });
    expect(listed(el)).toEqual(['Alpha']);
  });

  it('drops the text filter again when the field is cleared', async () => {
    seed();
    store.dispatch(setOnlyShowSchemasWithScopes(false));
    const el = await mount();

    await emitOn(el, search(el), 'search-change', { value: 'mi' });
    await emitOn(el, search(el), 'search-change', { value: '' });
    expect(listed(el)).toEqual(['Alpha', 'Mid', 'Zeta']);
  });

  it('sorts an unnamed schema to the front, and hands out each schema once', async () => {
    const unnamed = schema('', 'blank.nsf');
    store.dispatch(seedSchemas([ZETA, unnamed, ALPHA, ALPHA]));
    store.dispatch(setPullDatabase(true));
    store.dispatch(setOnlyShowSchemasWithScopes(false));
    const el = await mount();

    expect(listed(el)).toEqual(['', 'Alpha', 'Zeta']);
  });

  // ---- the view, and the URL it is recorded in -------------------------------------------

  it('defaults to the card view when the URL says nothing', async () => {
    seed();
    const el = await mount({ router: router() });
    expect(viewOptions(el).view).toBe('card');
    expect(multiView(el)!.view).toBe('card');
  });

  it('reads the view out of the query string on arrival', async () => {
    seed();
    const el = await mount({ router: router('/schema?view=nsf') });
    expect(viewOptions(el).view).toBe('nsf');
  });

  it('ignores a query string that carries something else', async () => {
    seed();
    const el = await mount({ router: router('/schema?sort=name') });
    expect(viewOptions(el).view).toBe('card');
  });

  it('records a view pick in the query string and re-labels the picker', async () => {
    seed();
    const instance = router();
    const el = await mount({ router: instance });

    await emitOn(el, viewOptions(el), 'view-change', { view: 'stack' });

    expect(instance.location()).toMatchObject({ pathname: '/schema', search: '?view=stack' });
    expect(viewOptions(el).view).toBe('stack');
    expect(multiView(el)!.view).toBe('stack');
  });

  it('changes the view with no router in scope, and navigates nowhere', async () => {
    seed();
    const el = await mount();

    await emitOn(el, viewOptions(el), 'view-change', { view: 'stack' });

    expect(viewOptions(el).view).toBe('stack');
  });

  // ---- opening a schema -----------------------------------------------------------------

  it('navigates to the schema a card asked to open, encoding the NSF path', async () => {
    seed();
    const instance = router();
    const el = await mount({ router: instance });

    await emitOn(el, multiView(el)!, 'schema-open', { database: ALPHA });

    expect(instance.location().pathname).toBe('/schema/my%20apps.nsf/Alpha');
  });

  it('survives a schema-open with no router in scope', async () => {
    seed();
    const el = await mount();

    await emitOn(el, multiView(el)!, 'schema-open', { database: ALPHA });

    expect(multiView(el)).toBeTruthy();
  });

  // ---- loading and empty states ---------------------------------------------------------

  it('replaces the list with the loading indicator while a pull is in flight', async () => {
    seed();
    const el = await mount();
    expect(multiView(el)).toBeTruthy();

    store.dispatch(setLoading({ status: true }));
    await el.updateComplete;

    expect(multiView(el)).toBeNull();
    const loader = shadow(el).querySelector('keep-page-loading')!;
    expect(loader.getAttribute('contained')).toBe('');
    expect(loader.getAttribute('page-height')).toBe('');
    expect(shadow(el).querySelector('keep-zero-results')).toBeNull();
  });

  it('shows the zero-results panel when nothing matches', async () => {
    seed();
    const el = await mount();

    await emitOn(el, search(el), 'search-change', { value: 'nothing-matches-this' });

    expect(multiView(el)).toBeNull();
    expect(shadow(el).querySelector('keep-zero-results')).toBeTruthy();
  });

  it('always renders the network-error dialog', async () => {
    const el = await mount();
    expect(shadow(el).querySelector('keep-network-error-dialog')).toBeTruthy();
  });
});
