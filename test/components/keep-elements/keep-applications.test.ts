/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setPulledApp } from '../../../src/store/applications/reducer';
import { fetchKeepPermissions, setPullScope } from '../../../src/store/databases/reducer';
import { closeSnackbar } from '../../../src/store/alerts/reducer';
import { deleteApplication, fetchMyApps } from '../../../src/store/applications/action';
import { fetchUsers } from '../../../src/store/access/action';
import { getConsents } from '../../../src/store/consents/action';
import { INIT_STATE } from '../../../src/store/databases/types';
import type { AppFormProp } from '../../../src/store/applications/types';
import '../../../src/components/keep-elements/keep-applications';
import type Applications from '../../../src/components/keep-elements/keep-applications';
import type AppForm from '../../../src/components/keep-elements/keep-app-form';
import type Drawer from '../../../src/components/keep-elements/keep-drawer';

/*
 * The four thunks this screen dispatches become tagged plain actions, so what is asserted is
 * *which* of them it asked for and with what — its whole job. The plain actions reach the real
 * store and no reducer claims them, which is the point: nothing here should move any slice
 * except through the reducers the element genuinely drives.
 *
 * Each mock keeps the rest of its module, because the real list, form and consents screen all
 * render inside this element and read other creators out of the same three files.
 */
vi.mock('../../../src/store/applications/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/applications/action')>()),
  fetchMyApps: vi.fn(() => ({ type: 'test/fetchMyApps' })),
  deleteApplication: vi.fn((appId: string) => ({ type: 'test/deleteApplication', appId })),
}));
vi.mock('../../../src/store/access/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/access/action')>()),
  fetchUsers: vi.fn(() => ({ type: 'test/fetchUsers' })),
}));
vi.mock('../../../src/store/consents/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/consents/action')>()),
  getConsents: vi.fn(() => ({ type: 'test/getConsents' })),
}));

const TAG = 'keep-applications';

/** The seed a row hands up as `app-edit` — an application, so the form must call it an edit. */
const ROW: AppFormProp = {
  appId: 'client-77',
  appName: 'Orders',
  appDescription: 'Order intake',
  appStatus: true,
  appCallbackUrlsStr: 'https://a.example/cb',
  appContactsStr: 'ada@example.com',
  appHasSecret: true,
  appSecret: 's3cret',
  appStartPage: 'https://a.example',
  appScope: 'MAIL',
  appIcon: 'anchor',
  usePkce: false,
};

/**
 * The `/apps` route (#806 wave 6). Replaces `applications/Applications.tsx` and
 * `applications/kanban/Kanban.tsx`, which were one screen split over two files, plus the
 * Application branch of `applications/FormDrawer.tsx`.
 *
 * Neither replaced file had a test, so nothing is carried over here — every case below is new.
 */
describe('keep-applications', () => {
  const asked = {
    apps: () => vi.mocked(fetchMyApps),
    users: () => vi.mocked(fetchUsers),
    consents: () => vi.mocked(getConsents),
    remove: () => vi.mocked(deleteApplication),
  };

  const reset = () => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch(setPulledApp(false));
    store.dispatch(closeSnackbar());
  };

  beforeEach(() => {
    reset();
    for (const spy of Object.values(asked)) spy().mockClear();
  });

  afterEach(() => {
    cleanupLit();
    reset();
  });

  const mount = (props: Partial<Applications> = {}) => mountLit<Applications>(TAG, props);

  /**
   * A store dispatch reaches the element through `StoreController.requestUpdate()`, and the
   * elements it owns settle a tick later again — so assertions about the rendered result drain
   * the microtask queue rather than awaiting a single update.
   */
  const settle = async (el: Applications) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  /** Both halves of the loading gate, plus permission to create. */
  const ready = (canCreate = true) => {
    store.dispatch(setPullScope(true));
    store.dispatch(setPulledApp(true));
    store.dispatch(fetchKeepPermissions({ createDbMapping: canCreate, deleteDbMapping: true }));
  };

  const mountReady = async (canCreate = true) => {
    ready(canCreate);
    const el = await mount();
    await settle(el);
    return el;
  };

  const find = <T extends Element>(el: Applications, selector: string) =>
    el.shadowRoot!.querySelector(selector) as T;

  const buttonNamed = (el: Applications, label: string) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-button')).find(
      (b) => b.textContent!.trim() === label,
    ) as HTMLElement;

  const form = (el: Applications) => find<AppForm>(el, 'keep-app-form');
  // The element's own type, not an ad-hoc `{ open: boolean }` shape: `closeFn` is part of the
  // contract being asserted below, and a hand-written shape would have to be widened to reach
  // it — which is the same as not checking it.
  const drawer = (el: Applications) => find<Drawer>(el, 'keep-drawer');

  const emitFromTable = async (el: Applications, type: string, detail: unknown) => {
    find(el, 'keep-apps-table').dispatchEvent(
      new CustomEvent(type, { detail, bubbles: true, composed: true }),
    );
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- the loading gate ----------------------------------------------------------------------

  it('shows the loading state, named, until both pulls have landed', async () => {
    const el = await mount();
    const loading = find<HTMLElement & { message: string }>(el, 'keep-page-loading');
    expect(loading).toBeTruthy();
    expect(loading.message).toBe('Loading Applications');
    expect(find(el, 'keep-apps-table')).toBeNull();
  });

  it('keeps waiting while only one of the two pulls has landed', async () => {
    const el = await mount();
    store.dispatch(setPulledApp(true));
    await settle(el);
    expect(find(el, 'keep-apps-table')).toBeNull();

    store.dispatch(setPullScope(true));
    await settle(el);
    expect(find(el, 'keep-apps-table')).toBeTruthy();
    expect(find(el, 'keep-page-loading')).toBeNull();
  });

  // ---- fetching ------------------------------------------------------------------------------

  it('asks for the applications when nobody has pulled them', async () => {
    await mount();
    expect(asked.apps()).toHaveBeenCalledTimes(1);
  });

  it('leaves the list alone when it has already been pulled', async () => {
    store.dispatch(setPulledApp(true));
    await mount();
    expect(asked.apps()).not.toHaveBeenCalled();
  });

  it('asks once, not once per render, while the flag stays down', async () => {
    // The effect this replaces listed the pulled flag as a dependency; an unguarded port
    // would refetch on every unrelated store move instead.
    const el = await mount();
    store.dispatch(setPullScope(true));
    await settle(el);
    expect(asked.apps()).toHaveBeenCalledTimes(1);
  });

  // ---- adding --------------------------------------------------------------------------------

  it('opens the drawer to add, with no row behind it', async () => {
    const el = await mountReady();
    expect(drawer(el).open).toBe(false);

    buttonNamed(el, 'Add Application').click();
    await settle(el);

    expect(store.getState().drawer.applicationDrawer).toBe(true);
    expect(drawer(el).open).toBe(true);
    expect(form(el).initialValues).toBeUndefined();
  });

  /*
   * The drawer's own dismissal has to reach the store, and the write has to be guarded.
   *
   * `toggleApplicationDrawer` toggles rather than sets, so this is a two-sided trap. The React
   * `FormDrawer` this screen replaced passed no `closeFn`, so `keep-drawer`'s default no-op ran
   * and the store was never told the drawer had closed — leaving `applicationDrawer` true, so
   * the next *Add Application* toggled it to false and the button looked dead. Wiring an
   * *unguarded* handler instead swaps that for the mirror-image bug: a dismissal arriving when
   * the flag is already false would open the drawer.
   *
   * So both directions are asserted, in one sequence, against the real store.
   */
  it('records the drawer dismissing itself, and cannot re-open it by doing so twice', async () => {
    const el = await mountReady();
    buttonNamed(el, 'Add Application').click();
    await settle(el);
    expect(store.getState().drawer.applicationDrawer).toBe(true);

    // What wa-drawer invokes on its own close control, Escape, or a click outside.
    drawer(el).closeFn();
    await settle(el);
    expect(store.getState().drawer.applicationDrawer).toBe(false);

    // The guard: a second dismissal must not toggle the flag back on.
    drawer(el).closeFn();
    await settle(el);
    expect(store.getState().drawer.applicationDrawer).toBe(false);

    // And the button still works first time, which is the symptom users actually reported.
    buttonNamed(el, 'Add Application').click();
    await settle(el);
    expect(store.getState().drawer.applicationDrawer).toBe(true);
  });

  it('refuses to add without the permission, and says so instead of opening', async () => {
    const el = await mountReady(false);
    buttonNamed(el, 'Add Application').click();
    await settle(el);

    expect(store.getState().drawer.applicationDrawer).toBe(false);
    expect(store.getState().alert.visible).toBe(true);
    expect(store.getState().alert.message).toContain('permission to create application');
  });

  it('clears a previous row when the drawer is next opened to add', async () => {
    const el = await mountReady();
    await emitFromTable(el, 'app-edit', { values: ROW });
    expect(form(el).initialValues).toEqual(ROW);

    // Close, then Add: the seed is what tells the form which of the two this is.
    buttonNamed(el, 'Add Application').click();
    await settle(el);
    expect(form(el).initialValues).toBeUndefined();
  });

  // ---- editing (#939) ------------------------------------------------------------------------

  /**
   * The row is handed to the form as the seed and nothing else is said. The mode used to be a
   * separate string, and this screen was the caller that never set it — so every edit from the
   * list saved as a create and posted a duplicate application.
   */
  it('hands the row straight to the form and opens the drawer', async () => {
    const el = await mountReady();
    await emitFromTable(el, 'app-edit', { values: ROW });

    expect(form(el).initialValues).toEqual(ROW);
    expect(store.getState().drawer.applicationDrawer).toBe(true);
    expect(drawer(el).open).toBe(true);
  });

  it('leaves the form calling that an edit, with an Update button', async () => {
    const el = await mountReady();
    await emitFromTable(el, 'app-edit', { values: ROW });
    const panel = form(el);
    await settle(el);

    expect(panel.shadowRoot!.querySelector('.form-header')!.textContent!.trim()).toBe(
      'Edit Application',
    );
    const actions = Array.from(panel.shadowRoot!.querySelectorAll('.actions keep-button'));
    expect(actions[1].textContent!.trim()).toBe('Update');
  });

  // ---- deleting ------------------------------------------------------------------------------

  it('opens the confirmation for the row that asked, and deletes that one', async () => {
    const el = await mountReady();
    await emitFromTable(el, 'app-delete', { appId: 'client-77' });
    expect(store.getState().apps.deleteDialogOpen).toBe(true);

    find(el, 'keep-confirm-delete-dialog').dispatchEvent(
      new CustomEvent('confirm-delete', { bubbles: true, composed: true }),
    );
    await settle(el);

    expect(asked.remove()).toHaveBeenCalledWith('client-77');
  });

  it('deletes the row asked for most recently, not the first one', async () => {
    const el = await mountReady();
    await emitFromTable(el, 'app-delete', { appId: 'client-77' });
    await emitFromTable(el, 'app-delete', { appId: 'client-88' });

    find(el, 'keep-confirm-delete-dialog').dispatchEvent(
      new CustomEvent('confirm-delete', { bubbles: true, composed: true }),
    );
    await settle(el);

    expect(asked.remove()).toHaveBeenLastCalledWith('client-88');
  });

  it('names the confirmation after what it is about to delete', async () => {
    const el = await mountReady();
    const dialog = find<HTMLElement & { heading: string; message: string }>(
      el,
      'keep-confirm-delete-dialog',
    );
    expect(dialog.heading).toBe('Delete Application');
    expect(dialog.message).toContain('delete this Application');
  });

  // ---- the consents dialog -------------------------------------------------------------------

  const consentsDialog = (el: Applications) => find<HTMLDialogElement>(el, '.consents-dialog');

  it('holds no consents screen until the dialog is opened', async () => {
    const el = await mountReady();
    expect(find(el, 'keep-consents')).toBeNull();
    expect(asked.consents()).not.toHaveBeenCalled();
  });

  it('fetches the users and the consents, and shows the screen as a dialog', async () => {
    const el = await mountReady();
    buttonNamed(el, 'OAuth Consents').click();
    await settle(el);

    expect(asked.users()).toHaveBeenCalledTimes(1);
    expect(asked.consents()).toHaveBeenCalledTimes(1);
    const consents = find<HTMLElement & { dialog: boolean }>(el, 'keep-consents');
    expect(consents).toBeTruthy();
    expect(consents.dialog).toBe(true);
  });

  it('refetches the applications with it only when they have not been pulled', async () => {
    // Pulled: the list is already there, so only the two the dialog needs are asked for.
    const pulled = await mountReady();
    buttonNamed(pulled, 'OAuth Consents').click();
    await settle(pulled);
    expect(asked.apps()).not.toHaveBeenCalled();
  });

  it('closes when the screen inside says so', async () => {
    const el = await mountReady();
    buttonNamed(el, 'OAuth Consents').click();
    await settle(el);

    find(el, 'keep-consents').dispatchEvent(
      new CustomEvent('consents-close', { bubbles: true, composed: true }),
    );
    await settle(el);

    expect(find(el, 'keep-consents')).toBeNull();
  });

  it('closes when the dialog itself closes, which is what Escape does', async () => {
    const el = await mountReady();
    buttonNamed(el, 'OAuth Consents').click();
    await settle(el);

    consentsDialog(el).dispatchEvent(new Event('close'));
    await settle(el);

    expect(find(el, 'keep-consents')).toBeNull();
  });

  /** The dialog fills the viewport and insets its panel, so the region around it is the dialog. */
  it('closes on a press beside the panel, and not on one inside it', async () => {
    const el = await mountReady();
    buttonNamed(el, 'OAuth Consents').click();
    await settle(el);

    find(el, 'keep-consents').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(el);
    expect(find(el, 'keep-consents')).toBeTruthy();

    consentsDialog(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(el);
    expect(find(el, 'keep-consents')).toBeNull();
  });

  /**
   * Once, not once per render. The environment the suite runs in implements neither dialog
   * method, so `open` never moves and a guard written against it would reopen the dialog on
   * every subsequent update — hence the unrelated store move in the middle, which is what
   * makes this assertion discriminate.
   *
   * The counter is an own property of this dialog rather than a spy, because the method it
   * replaces is inherited: a spy would land on the prototype, where the suite's shared stub
   * lives, and count every dialog in the tree. The drawer the second press opens has one of
   * its own, so that count would read two whatever this element did.
   */
  it('opens the dialog on the top layer once, however many renders follow', async () => {
    const el = await mountReady();
    let opened = 0;
    Object.defineProperty(consentsDialog(el), 'showModal', {
      configurable: true,
      value: () => {
        opened += 1;
      },
    });

    buttonNamed(el, 'OAuth Consents').click();
    await settle(el);

    buttonNamed(el, 'Add Application').click();
    await settle(el);

    expect(opened).toBe(1);
  });

  // ---- the filter drawer ---------------------------------------------------------------------

  it('opens the filter drawer, from a control that has a name', async () => {
    const el = await mountReady();
    const filter = find<HTMLElement>(el, '.filter-button');
    expect(filter.getAttribute('aria-label')).toBe('Filter applications');
    // The funnel is a registered glyph now, not inline path data (#946). The claim is
    // unchanged — decorative, because the button carries the name.
    const glyph = filter.querySelector('wa-icon')!;
    expect(glyph.getAttribute('name')).toBe('filter');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(filter.querySelector('svg')).toBeNull();

    filter.click();
    await settle(el);
    expect(store.getState().drawer.appFilterDrawer).toBe(true);
  });

  // ---- accessibility -------------------------------------------------------------------------

  it('titles the page with a heading element, not a styled paragraph', async () => {
    const el = await mountReady();
    const title = find<HTMLElement>(el, '.title');
    expect(title.tagName).toBe('H1');
    expect(title.textContent!.trim()).toBe('Application Management');
  });

  it('names the consents dialog', async () => {
    const el = await mountReady();
    expect(consentsDialog(el).getAttribute('aria-label')).toBe('OAuth Consents');
  });

  it('names the drawer the form sits in', async () => {
    const el = await mountReady();
    expect(drawer(el).getAttribute('label')).toBe('Application Form');
  });
});
