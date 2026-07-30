/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setApiLoading } from '../../../src/store/dialog/action';
import { closeSnackbar } from '../../../src/store/alerts/action';
import { INIT_STATE } from '../../../src/store/dialog/types';
import '../../../src/components/keep-elements/keep-activate-menu';
import type ActivateMenu from '../../../src/components/keep-elements/keep-activate-menu';

/**
 * The deactivate thunk is stubbed because the real one posts the whole schema back to the
 * API. `importOriginal` rather than a bare factory, so nothing else the element or the store
 * reaches for in that barrel is silently blanked out.
 */
const { deleteForm } = vi.hoisted(() => ({
  deleteForm: vi.fn(() => ({ type: 'TEST_DELETE_FORM' }))
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  deleteForm
}));

const TAG = 'keep-activate-menu';

const KNOWN = { formName: 'Contact', alias: [], formModes: [{ modeName: 'default' }] } as never;
const INACTIVE = { formName: 'Invoice', alias: [], formModes: [] } as never;
const CUSTOM = { formName: 'Bespoke', alias: [], formModes: [] } as never;

const SCHEMA = { schemaName: 'Demo', nsfPath: 'demo.nsf', forms: [] } as never;

const setSchemaData = vi.fn();

/** The database knows Contact and Invoice; Bespoke exists only in the schema. */
const FORM_LIST = ['Contact', 'Invoice'];

const mount = (props: Partial<ActivateMenu>) =>
  mountLit<ActivateMenu>(TAG, {
    formList: FORM_LIST,
    schemaData: SCHEMA,
    setSchemaData,
    ...props
  });

const dialogOf = (el: ActivateMenu) => el.shadowRoot!.querySelector('dialog')!;
const trigger = (el: ActivateMenu) => el.shadowRoot!.querySelector<HTMLButtonElement>('button.menu-button')!;
const items = (el: ActivateMenu) => [...el.shadowRoot!.querySelectorAll('wa-dropdown-item')];
const item = (el: ActivateMenu, value: string) =>
  items(el).find((i) => i.getAttribute('value') === value) as HTMLElement;
const button = (el: ActivateMenu, label: string) =>
  [...el.shadowRoot!.querySelectorAll('keep-button')].find(
    (b) => b.textContent?.trim() === label
  ) as HTMLElement;

const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

/** `wa-dropdown` filters disabled items itself, so a plain click is the whole interaction. */
const choose = async (el: ActivateMenu, value: string) => {
  item(el, value).click();
  await el.updateComplete;
};

describe('keep-activate-menu', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    // The alert slice has no INIT_STATE case, so a message raised by one test is still
    // visible in the next. Without this, "nothing happened" is unassertable.
    store.dispatch(closeSnackbar());
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('status', () => {
    it('reads Active off the form’s modes', async () => {
      const el = await mount({ form: KNOWN });
      expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Active');
      expect(el.shadowRoot!.querySelector('.status')!.classList).toContain('on');
    });

    it('reads Inactive off a form with no modes', async () => {
      const el = await mount({ form: INACTIVE });
      expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Inactive');
      expect(el.shadowRoot!.querySelector('.status')!.classList).not.toContain('on');
    });

    it('re-derives when a different form arrives, which the React version never did', async () => {
      const el = await mount({ form: INACTIVE });
      el.form = KNOWN;
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Active');
    });

    it('colours the dot from the label rather than a literal, so dark mode matches', async () => {
      const el = await mount({ form: KNOWN });
      // The two used to disagree in dark mode: the dot's fill was a light-mode hex while the
      // text used the mode-aware token. currentColor is what ties them together now.
      expect(el.shadowRoot!.querySelector('circle')!.getAttribute('fill')).toBe('currentColor');
      expect(el.shadowRoot!.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('the menu (#713)', () => {
    it('names the trigger after its row and makes it a real button', async () => {
      const el = await mount({ form: KNOWN });
      expect(trigger(el).type).toBe('button');
      expect(trigger(el).getAttribute('aria-label')).toBe('Form actions for Contact');
    });

    it('offers the three actions', async () => {
      const el = await mount({ form: KNOWN });
      expect(items(el).map((i) => i.textContent!.trim())).toEqual([
        'Activate',
        'Deactivate',
        'Delete'
      ]);
    });

    it('lets a known form be activated or deactivated but not deleted', async () => {
      const el = await mount({ form: KNOWN });
      expect(item(el, 'activate').hasAttribute('disabled')).toBe(false);
      expect(item(el, 'deactivate').hasAttribute('disabled')).toBe(false);
      expect(item(el, 'delete').hasAttribute('disabled')).toBe(true);
    });

    it('lets a custom form only be deleted', async () => {
      const el = await mount({ form: CUSTOM });
      expect(item(el, 'activate').hasAttribute('disabled')).toBe(true);
      expect(item(el, 'deactivate').hasAttribute('disabled')).toBe(true);
      expect(item(el, 'delete').hasAttribute('disabled')).toBe(false);
    });

    it('exposes menu semantics and the expanded state, which the old menu never did', async () => {
      const el = await mount({ form: KNOWN });
      const dropdown = el.shadowRoot!.querySelector('wa-dropdown') as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
      await dropdown.updateComplete;
      // Flush the trigger slotchange that syncs the trigger's aria attributes.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dropdown.shadowRoot!.querySelector('[role="menu"]')).toBeTruthy();
      expect(items(el).map((i) => i.getAttribute('role'))).toEqual([
        'menuitem',
        'menuitem',
        'menuitem'
      ]);
      expect(item(el, 'delete').getAttribute('aria-disabled')).toBe('true');
      expect(trigger(el).getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('activating', () => {
    it('asks the parent to activate an inactive form', async () => {
      const el = await mount({ form: INACTIVE });
      const activated = vi.fn();
      el.addEventListener('activate-form', activated as EventListener);

      await choose(el, 'activate');

      expect(activated).toHaveBeenCalledTimes(1);
      expect(activated.mock.calls[0][0].detail).toEqual({ formName: 'Invoice' });
    });

    it('refuses while a save is in flight, and says so', async () => {
      const el = await mount({ form: INACTIVE });
      const activated = vi.fn();
      el.addEventListener('activate-form', activated as EventListener);
      store.dispatch(setApiLoading(true));

      await choose(el, 'activate');

      expect(activated).not.toHaveBeenCalled();
      expect(store.getState().alert.message).toBe('Please wait while forms are still saving!');
    });

    it('says so when the form is already active', async () => {
      const el = await mount({ form: KNOWN });
      const activated = vi.fn();
      el.addEventListener('activate-form', activated as EventListener);

      await choose(el, 'activate');

      expect(activated).not.toHaveBeenCalled();
      expect(store.getState().alert.message).toBe('This form is already active!');
    });

    it('does nothing at all when the item is disabled', async () => {
      const el = await mount({ form: CUSTOM });
      const activated = vi.fn();
      el.addEventListener('activate-form', activated as EventListener);

      await choose(el, 'activate');

      expect(activated).not.toHaveBeenCalled();
      expect(store.getState().alert.visible).toBe(false);
    });
  });

  describe('the confirmation', () => {
    it('stays shut until an action asks for it', async () => {
      await mount({ form: KNOWN });
      expect(showModal()).not.toHaveBeenCalled();
    });

    it('calls deactivating a known form a reset', async () => {
      const el = await mount({ form: KNOWN });
      await choose(el, 'deactivate');

      expect(showModal()).toHaveBeenCalledTimes(1);
      expect(dialogOf(el).getAttribute('aria-label')).toBe('Reset Form?');
      expect(el.shadowRoot!.getElementById('warning')!.textContent).toContain(
        'delete all form modes'
      );
    });

    it('warns harder about deleting a custom form', async () => {
      const el = await mount({ form: CUSTOM });
      await choose(el, 'delete');

      expect(dialogOf(el).getAttribute('aria-label')).toBe('WARNING: Deleting Custom Form');
      expect(el.shadowRoot!.getElementById('warning')!.textContent).toContain(
        'removes it from the schema entirely'
      );
    });

    it('describes itself with the warning it is asking about', async () => {
      const el = await mount({ form: KNOWN });
      await choose(el, 'deactivate');
      const describedBy = dialogOf(el).getAttribute('aria-describedby')!;
      expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain('proceed?');
    });

    it('does not reopen a dialog that is already open', async () => {
      const el = await mount({ form: KNOWN });
      await choose(el, 'deactivate');
      // jsdom has no top layer, so showModal() is a stub that leaves `open` alone. Setting it
      // is what makes the second render see an already-open dialog — showModal() on one
      // throws InvalidStateError in a browser.
      dialogOf(el).open = true;
      el.requestUpdate();
      await el.updateComplete;
      expect(showModal()).toHaveBeenCalledTimes(1);
    });

    it('closes from No without deleting anything', async () => {
      const el = await mount({ form: KNOWN });
      await choose(el, 'deactivate');
      dialogOf(el).open = true;

      button(el, 'No').click();
      await el.updateComplete;

      expect(close()).toHaveBeenCalled();
      expect(deleteForm).not.toHaveBeenCalled();
    });

    it('closes from the header close button', async () => {
      const el = await mount({ form: KNOWN });
      await choose(el, 'deactivate');
      dialogOf(el).open = true;

      const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
      await header.updateComplete;
      header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;

      expect(close()).toHaveBeenCalled();
      expect(deleteForm).not.toHaveBeenCalled();
    });

    it('closes on Escape, which the React version left desynced', async () => {
      const el = await mount({ form: KNOWN });
      await choose(el, 'deactivate');
      dialogOf(el).open = true;

      // The original had no cancel handler: the browser closed the dialog and the flag
      // stayed set, so the menu could never reopen it.
      dialogOf(el).dispatchEvent(new Event('cancel'));
      await el.updateComplete;

      expect(close()).toHaveBeenCalled();
      expect(el.confirming).toBe(false);
    });
  });

  describe('confirming', () => {
    it('deactivates a known form, keeping it in the schema', async () => {
      const el = await mount({ form: KNOWN });
      await choose(el, 'deactivate');
      button(el, 'Yes').click();
      await el.updateComplete;

      expect(deleteForm).toHaveBeenCalledWith(SCHEMA, 'Contact', setSchemaData, false);
      // Optimistic: the row goes grey before the round trip finishes.
      expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Inactive');
    });

    it('deletes a custom form outright', async () => {
      const el = await mount({ form: CUSTOM });
      await choose(el, 'delete');
      button(el, 'Yes').click();
      await el.updateComplete;

      expect(deleteForm).toHaveBeenCalledWith(SCHEMA, 'Bespoke', setSchemaData, true);
    });

    it('closes without dispatching when it has no schema to rewrite', async () => {
      const el = await mount({ form: KNOWN, schemaData: undefined });
      await choose(el, 'deactivate');
      dialogOf(el).open = true;

      button(el, 'Yes').click();
      await el.updateComplete;

      expect(deleteForm).not.toHaveBeenCalled();
      expect(close()).toHaveBeenCalled();
    });
  });

  it('survives a form it was given nothing for', async () => {
    const el = await mount({});
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Inactive');
    expect(trigger(el).getAttribute('aria-label')).toBe('Form actions for ');
  });

  it('falls back to Inactive if the row’s form is taken away', async () => {
    const el = await mount({ form: KNOWN });
    el.form = undefined;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Inactive');
  });
});
