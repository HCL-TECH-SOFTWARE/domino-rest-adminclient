/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { toggleDeleteDialog } from '../../../src/store/dialog/action';
import { INIT_STATE } from '../../../src/store/dialog/types';
import '../../../src/components/keep-elements/keep-confirm-delete-dialog';
import type ConfirmDeleteDialog from '../../../src/components/keep-elements/keep-confirm-delete-dialog';

const TAG = 'keep-confirm-delete-dialog';

const PROPS = {
  heading: 'Delete Application',
  message: 'Are you sure you want to delete this Application?',
};

// jsdom implements no <dialog> modal behaviour; setupTests.ts stubs showModal/close with
// vi.fn(), so these assert the calls rather than the resulting `.open` state.
const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

const dialog = (el: ConfirmDeleteDialog) =>
  el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

const action = (el: ConfirmDeleteDialog, label: string) =>
  [...el.shadowRoot!.querySelectorAll('keep-button')].find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLElement;

/** Collect a bubbling, composed event as an ancestor would see it. */
const listen = (el: ConfirmDeleteDialog, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
};

/** Open it the way a delete control does — one action, both copies of the flag. */
const open = async (el: ConfirmDeleteDialog) => {
  store.dispatch(toggleDeleteDialog());
  await el.updateComplete;
};

describe('keep-confirm-delete-dialog', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('stays closed until the store flag is set, and takes no open property', async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    expect(showModal()).not.toHaveBeenCalled();
    // Neither parent selects the flag, so there is no parent copy to be handed back on
    // every render. Asserting the property is absent keeps a caller from adding one.
    expect('open' in el).toBe(false);
    await open(el);
    expect(showModal()).toHaveBeenCalledTimes(1);
  });

  it('reads the same flag the toggle sets on the dialog slice', async () => {
    // `dialog/toggleDeleteDialog` is picked up by applications/reducer as well, so the two
    // booleans move together. This element follows the apps one, as its predecessor did.
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    expect(store.getState().apps.deleteDialogOpen).toBe(true);
    expect(store.getState().dialog.deleteDialog).toBe(true);
  });

  it("shows the caller's title and question", async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header')!;
    expect(header.getAttribute('heading')).toBe('Delete Application');
    expect(el.shadowRoot!.textContent).toContain(
      'Are you sure you want to delete this Application?',
    );
  });

  it('names and describes the modal for assistive tech without an IDREF', async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    // The heading is in a nested shadow root, so aria-labelledby could not reach it (#713).
    expect(dialog(el).getAttribute('aria-label')).toBe('Delete Application');
    const describedBy = dialog(el).getAttribute('aria-describedby')!;
    expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain('Are you sure');
  });

  it('closes from No', async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    action(el, 'No').click();
    await el.updateComplete;
    expect(store.getState().apps.deleteDialogOpen).toBe(false);
    expect(close()).toHaveBeenCalledTimes(1);
  });

  it('closes from the header close button', async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(store.getState().apps.deleteDialogOpen).toBe(false);
  });

  it('closes on Escape', async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    dialog(el).dispatchEvent(new Event('cancel'));
    expect(store.getState().apps.deleteDialogOpen).toBe(false);
  });

  it('emits confirm-delete from Yes', async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    const seen = listen(el, 'confirm-delete');
    action(el, 'Yes').click();
    expect(seen).toHaveLength(1);
  });

  it('leaves the dialog open on Yes, because the delete thunk closes it', async () => {
    // Both thunks reached from here dispatch toggleDeleteDialog on success and on failure.
    // Closing here too would toggle twice and put the dialog back up over the result.
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    action(el, 'Yes').click();
    await el.updateComplete;
    expect(store.getState().apps.deleteDialogOpen).toBe(true);
    expect(close()).not.toHaveBeenCalled();
  });

  it('does not emit the native dialog event names', async () => {
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    const closes = listen(el, 'close');
    const cancels = listen(el, 'cancel');
    action(el, 'Yes').click();
    action(el, 'No').click();
    expect(closes).toHaveLength(0);
    expect(cancels).toHaveLength(0);
  });

  it('applies each change of the flag once', async () => {
    // The store is not a reactive property, so updated() runs on every render with nothing
    // to key off. Without the edge trigger, an unrelated re-render re-issues showModal() -
    // which throws InvalidStateError on an already-open dialog.
    const el = await mountLit<ConfirmDeleteDialog>(TAG, PROPS);
    await open(el);
    el.heading = 'Delete Mode';
    await el.updateComplete;
    expect(showModal()).toHaveBeenCalledTimes(1);
  });
});
