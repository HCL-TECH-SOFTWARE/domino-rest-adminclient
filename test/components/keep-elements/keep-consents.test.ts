/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setConsents, toggleDeleteConsent } from '../../../src/store/consents/reducer';
import { getApps } from '../../../src/store/applications/reducer';
import { setUsers } from '../../../src/store/access/reducer';
import {
  toggleConsentsLoading,
  toggleUsersLoading,
} from '../../../src/store/loading/reducer';
import '../../../src/components/keep-elements/keep-consents';
import type Consents from '../../../src/components/keep-elements/keep-consents';
import type ConsentsTable from '../../../src/components/keep-elements/keep-consents-table';

const TAG = 'keep-consents';
const DAY = 86_400_000;

/** Two consents, enough to make the table branch and to name a revoke target. */
const consents = [
  {
    username: 'User01',
    scope: 'read',
    client_id: 'app-0',
    unid: 'unid-0',
    redirect_uri: 'https://example.test/cb',
    code_expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
    refresh_token_expires_at: new Date(Date.now() + 30 * DAY).toISOString(),
    scope_claim: '',
    scope_description: '',
    scope_logo_url: '',
  },
  {
    username: 'User02',
    scope: 'write',
    client_id: 'app-1',
    unid: 'unid-1',
    redirect_uri: 'https://example.test/cb',
    code_expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
    refresh_token_expires_at: new Date(Date.now() + 30 * DAY).toISOString(),
    scope_claim: '',
    scope_description: '',
    scope_logo_url: '',
  },
];

const apps = [
  { appId: 'app-0', appName: 'App00' },
  { appId: 'app-1', appName: 'App01' },
];

/** Seed through the real actions, as `keep-consents-table`'s own suite does. */
const seed = (list: typeof consents | [] = consents) => {
  store.dispatch({ type: 'INIT_STATE' });
  store.dispatch(setConsents(list as never));
  store.dispatch(getApps(apps as never));
  store.dispatch(setUsers([]));
};

/** The loading slice is a plain toggle pair, so it has to be put back the way it was. */
const clearLoading = () => {
  if (store.getState().loading.consentsLoading) store.dispatch(toggleConsentsLoading());
  if (store.getState().loading.usersLoading) store.dispatch(toggleUsersLoading());
};

const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

describe('keep-consents', () => {
  beforeEach(() => {
    clearLoading();
    seed();
    vi.mocked(HTMLDialogElement.prototype.showModal).mockClear();
    vi.mocked(HTMLDialogElement.prototype.close).mockClear();
  });

  afterEach(() => {
    cleanupLit();
    clearLoading();
    store.dispatch({ type: 'INIT_STATE' });
    vi.restoreAllMocks();
  });

  /**
   * The table below this element is a nested Lit element whose first update is scheduled,
   * not immediate, and it has nested elements of its own. Drain the microtask queue rather
   * than awaiting a single update.
   */
  const settle = async (el: Consents) => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  const mount = async (props: Partial<Consents> = {}) => {
    const el = await mountLit<Consents>(TAG, props);
    await settle(el);
    return el;
  };

  const root = (el: Consents) => el.shadowRoot!;

  const table = (el: Consents) => root(el).querySelector<ConsentsTable>('keep-consents-table');

  const dialog = (el: Consents) => root(el).querySelector<HTMLDialogElement>('dialog')!;

  const buttonNamed = (el: Consents, label: string) =>
    [...root(el).querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
    )!;

  const dialogAction = (el: Consents, label: string) =>
    ([...root(el).querySelectorAll('keep-button')].find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLElement)!;

  /** Collect a bubbling, composed event as an ancestor would see it. */
  const listen = (el: Consents, type: string) => {
    const seen: CustomEvent[] = [];
    el.addEventListener(type, (e) => seen.push(e as CustomEvent));
    return seen;
  };

  /** Open the revoke confirmation the way a row's Revoke control does. */
  const askToRevoke = async (el: Consents, unid = 'unid-0') => {
    store.dispatch(
      toggleDeleteConsent({ unid, appName: 'App00', username: 'User01', scope: 'read' }),
    );
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('heads the screen with a real heading', async () => {
    const el = await mount();
    const heading = root(el).querySelector('h2.heading')!;
    expect(heading.textContent).toContain('OAuth Consents');
  });

  it('renders the table when there are consents', async () => {
    const el = await mount();
    expect(table(el)).toBeTruthy();
    expect(root(el).querySelector('keep-zero-results')).toBeNull();
  });

  it('renders the empty state when there are none and nothing is loading', async () => {
    seed([]);
    const el = await mount();
    const zero = root(el).querySelector('keep-zero-results')!;
    expect(zero).toBeTruthy();
    expect((zero as unknown as { mainLabel: string }).mainLabel).toBe('Sorry, no consents found');
    expect(table(el)).toBeNull();
  });

  it('keeps the table up while the list is still arriving, rather than the empty state', async () => {
    // The choice used to be on consents.length alone, which is zero during the first fetch —
    // so every cold arrival flashed "no consents found" and the table's own loading panel
    // could only ever be seen by a user who already had consents.
    seed([]);
    store.dispatch(toggleConsentsLoading());
    const el = await mount();
    expect(table(el)).toBeTruthy();
    expect(root(el).querySelector('keep-zero-results')).toBeNull();
  });

  it('shows the loading branch while the users list alone is arriving', async () => {
    seed([]);
    store.dispatch(toggleUsersLoading());
    const el = await mount();
    expect(table(el)).toBeTruthy();
  });

  it('hands Expand all and Collapse all down to the table', async () => {
    const el = await mount();
    expect(table(el)!.expand).toBe(false);

    buttonNamed(el, 'Expand all').click();
    await settle(el);
    expect(table(el)!.expand).toBe(true);

    buttonNamed(el, 'Collapse all').click();
    await settle(el);
    expect(table(el)!.expand).toBe(false);
  });

  it('opens the filter drawer from All filters', async () => {
    const el = await mount();
    expect(store.getState().drawer.consentsDrawer).toBe(false);
    buttonNamed(el, 'All filters').click();
    expect(store.getState().drawer.consentsDrawer).toBe(true);
  });

  it('hands Reset down to the table, and takes the flag back off it', async () => {
    const el = await mount();
    buttonNamed(el, 'Reset').click();
    await settle(el);
    // The table clears itself and reports the flag back off in the same pass, so what is
    // observable here is the round trip having completed, not the flag standing at true.
    expect(el.resetFilters).toBe(false);
    expect(table(el)!.reset).toBe(false);
  });

  it('takes the legacy filters-on flag back off the table', async () => {
    const el = await mount();
    el.filtersOn = true;
    await settle(el);
    expect(el.filtersOn).toBe(false);
  });

  it('does not leak the table events past itself', async () => {
    const el = await mount();
    const resets = listen(el, 'reset-change');
    const filters = listen(el, 'filters-on-change');
    buttonNamed(el, 'Reset').click();
    await settle(el);
    expect(resets).toHaveLength(0);
    expect(filters).toHaveLength(0);
  });

  describe('the close control', () => {
    it('is absent off the dialog, where it was an unnamed zero-size tab stop', async () => {
      const el = await mount();
      expect(root(el).querySelector('button.close')).toBeNull();
    });

    it('is present and named inside the dialog', async () => {
      const el = await mount({ dialog: true });
      const button = root(el).querySelector('button.close')!;
      expect(button.getAttribute('aria-label')).toBe('Close');
    });

    it('emits consents-close', async () => {
      const el = await mount({ dialog: true });
      const seen = listen(el, 'consents-close');
      buttonNamed(el, 'Close').click();
      expect(seen).toHaveLength(1);
      expect(seen[0].bubbles).toBe(true);
      expect(seen[0].composed).toBe(true);
    });
  });

  describe('the revoke confirmation', () => {
    it('stays shut until the store flag is set', async () => {
      const el = await mount();
      expect(showModal()).not.toHaveBeenCalled();
      await askToRevoke(el);
      expect(showModal()).toHaveBeenCalledTimes(1);
    });

    it('names the application when one resolved', async () => {
      const el = await mount();
      await askToRevoke(el);
      expect(root(el).textContent).toContain(
        'revoke consent for application App00 with user User01 and scopes read',
      );
    });

    it('leaves the application out when none resolved', async () => {
      const el = await mount();
      store.dispatch(
        toggleDeleteConsent({ unid: 'unid-1', appName: '', username: 'User02', scope: 'write' }),
      );
      await settle(el);
      expect(root(el).textContent).toContain(
        'revoke consent for user User02 with scopes write',
      );
      expect(root(el).textContent).not.toContain('for application');
    });

    it('describes itself for assistive tech without an IDREF', async () => {
      const el = await mount();
      await askToRevoke(el);
      expect(dialog(el).getAttribute('aria-label')).toBe('Revoke consent?');
      const describedBy = dialog(el).getAttribute('aria-describedby')!;
      expect(root(el).getElementById(describedBy)!.textContent).toContain('Are you sure');
    });

    it('closes from No, clearing what it was asking about', async () => {
      const el = await mount();
      await askToRevoke(el);
      dialogAction(el, 'No').click();
      await settle(el);
      expect(store.getState().consents.deleteConsentDialog).toBe(false);
      expect(store.getState().consents.deleteUnid).toBe('');
      expect(close()).toHaveBeenCalledTimes(1);
    });

    it('closes from the header close button', async () => {
      const el = await mount();
      await askToRevoke(el);
      const header = root(el).querySelector('keep-form-dialog-header') as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
      await header.updateComplete;
      header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
      expect(store.getState().consents.deleteConsentDialog).toBe(false);
    });

    it('closes on Escape, so the store does not go on believing it is open', async () => {
      // A native dialog closes itself on cancel without telling anyone. The flag that drives
      // it lives in the store, so leaving it set meant the next Revoke toggled it false and
      // closed an already-closed dialog — the confirmation never came back.
      const el = await mount();
      await askToRevoke(el);
      dialog(el).dispatchEvent(new Event('cancel'));
      await settle(el);
      expect(store.getState().consents.deleteConsentDialog).toBe(false);

      await askToRevoke(el, 'unid-1');
      expect(showModal()).toHaveBeenCalledTimes(2);
    });

    it('revokes the consent the store named, from Yes', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify(consents[0]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      const el = await mount();
      await askToRevoke(el);
      dialogAction(el, 'Yes').click();
      await settle(el);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/consent/revoke/unid-0');
      expect((init as RequestInit).method).toBe('DELETE');
      // The thunk's success callback is what closes the dialog, so a green revoke leaves
      // nothing behind for the next one.
      expect(store.getState().consents.deleteConsentDialog).toBe(false);
    });

    it('does not re-open a dialog that is already open', async () => {
      // showModal() throws InvalidStateError on an open dialog, and jsdom's stub records the
      // call without ever setting `.open` — so the guard has to be driven by hand to be seen.
      const el = await mount();
      dialog(el).open = true;
      await askToRevoke(el);
      expect(showModal()).not.toHaveBeenCalled();
    });

    it('applies each change of the flag once', async () => {
      // The store is not a reactive property, so updated() runs on every render with nothing
      // to key off. Without the edge trigger an unrelated re-render re-issues showModal(),
      // which throws InvalidStateError on an already-open dialog.
      const el = await mount();
      await askToRevoke(el);
      el.dialog = true;
      await settle(el);
      expect(showModal()).toHaveBeenCalledTimes(1);
    });
  });
});
