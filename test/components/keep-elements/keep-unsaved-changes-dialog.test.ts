/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-unsaved-changes-dialog';
import type UnsavedChangesDialog from '../../../src/components/keep-elements/keep-unsaved-changes-dialog';

const TAG = 'keep-unsaved-changes-dialog';

const dialog = (el: UnsavedChangesDialog) =>
  el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

const action = (el: UnsavedChangesDialog, label: string) =>
  [...el.shadowRoot!.querySelectorAll('keep-button')].find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLElement;

/** Collect a bubbling, composed event as an ancestor would see it. */
const listen = (el: UnsavedChangesDialog, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
};

describe('keep-unsaved-changes-dialog', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // jsdom implements no <dialog> modal behaviour; setupTests.ts stubs showModal/close with
  // vi.fn(), so these assert the calls rather than the resulting `.open` state.
  const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
  const close = () => vi.mocked(HTMLDialogElement.prototype.close);

  it('stays closed by default', async () => {
    await mountLit<UnsavedChangesDialog>(TAG);
    expect(showModal()).not.toHaveBeenCalled();
  });

  it('opens modally when open is set', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG);
    el.open = true;
    await el.updateComplete;
    expect(showModal()).toHaveBeenCalledTimes(1);
  });

  it('closes again when open goes false', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    expect(showModal()).toHaveBeenCalledTimes(1);
    el.open = false;
    await el.updateComplete;
    expect(close()).toHaveBeenCalledTimes(1);
  });

  it('renders all three actions and the heading', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    expect(action(el, 'Yes')).toBeTruthy();
    expect(action(el, 'No')).toBeTruthy();
    expect(action(el, 'Cancel')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('keep-form-dialog-header')).toBeTruthy();
  });

  it('emits dialog-save from Yes', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    const seen = listen(el, 'dialog-save');
    action(el, 'Yes').click();
    expect(seen).toHaveLength(1);
  });

  it('emits dialog-discard from No', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    const seen = listen(el, 'dialog-discard');
    action(el, 'No').click();
    expect(seen).toHaveLength(1);
  });

  it('emits dialog-cancel from Cancel', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    const seen = listen(el, 'dialog-cancel');
    action(el, 'Cancel').click();
    expect(seen).toHaveLength(1);
  });

  it('emits dialog-cancel when the header close button is used', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    const seen = listen(el, 'dialog-cancel');
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(seen).toHaveLength(1);
  });

  it('forwards the native cancel event, so Escape does not desync the parent', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    const seen = listen(el, 'dialog-cancel');
    // Escape closes a modal <dialog> natively and fires `cancel`. The React version did not
    // forward it, so the parent kept `open` true with the dialog shut - navigation stayed
    // blocked and the dialog could not be reopened.
    dialog(el).dispatchEvent(new Event('cancel'));
    expect(seen).toHaveLength(1);
  });

  it('does not emit the native dialog event names', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    const cancels = listen(el, 'cancel');
    const closes = listen(el, 'close');
    const saves = listen(el, 'save');
    action(el, 'Cancel').click();
    action(el, 'Yes').click();
    expect(cancels).toHaveLength(0);
    expect(closes).toHaveLength(0);
    expect(saves).toHaveLength(0);
  });

  it('names the modal for assistive tech without an IDREF', async () => {
    const el = await mountLit<UnsavedChangesDialog>(TAG, { open: true });
    // The heading is in a nested shadow root, so aria-labelledby could not reach it (#713).
    expect(dialog(el).getAttribute('aria-label')).toBe('Unsaved Changes');
  });
});
