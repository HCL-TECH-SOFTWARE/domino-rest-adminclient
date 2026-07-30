/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-add-mode-dialog';
import type AddModeDialog from '../../../src/components/keep-elements/keep-add-mode-dialog';

const TAG = 'keep-add-mode-dialog';

type WaInput = HTMLElement & { value: string };

const dialog = (el: AddModeDialog) => el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

const field = (el: AddModeDialog) => el.shadowRoot!.querySelector('wa-input') as WaInput;

const action = (el: AddModeDialog, label: string) =>
  [...el.shadowRoot!.querySelectorAll('keep-button')].find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLElement;

/** Collect a bubbling, composed event as an ancestor would see it. */
const listen = (el: AddModeDialog, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
};

/** Type into the field the way the inner control does: set the value, then fire `input`. */
const type = async (el: AddModeDialog, text: string) => {
  const input = field(el);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await el.updateComplete;
};

// jsdom implements no <dialog> modal behaviour; setupTests.ts stubs showModal/close with
// vi.fn(), so these assert the calls rather than the resulting `.open` state.
const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

describe('keep-add-mode-dialog', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('stays closed by default', async () => {
    await mountLit<AddModeDialog>(TAG);
    expect(showModal()).not.toHaveBeenCalled();
  });

  it('opens modally when open is set', async () => {
    const el = await mountLit<AddModeDialog>(TAG);
    el.open = true;
    await el.updateComplete;
    expect(showModal()).toHaveBeenCalledTimes(1);
  });

  it('closes again when open goes false', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const before = close().mock.calls.length;
    el.open = false;
    await el.updateComplete;
    expect(close().mock.calls.length).toBe(before + 1);
  });

  it('heads the dialog "Add New Mode" when it is not a clone', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true, modeName: 'dql' });
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header')!;
    expect(header.getAttribute('heading')).toBe('Add New Mode');
    // aria-label, not aria-labelledby: the heading is inside the header's own shadow root
    // and an IDREF cannot cross a shadow boundary (#713).
    expect(dialog(el).getAttribute('aria-label')).toBe('Add New Mode');
  });

  it('names the source mode in the heading when cloning', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true, clone: true, modeName: 'dql' });
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header')!;
    expect(header.getAttribute('heading')).toBe('Clone dql');
    expect(dialog(el).getAttribute('aria-label')).toBe('Clone dql');
  });

  it('labels the field and keeps the example as its hint', async () => {
    // It had a placeholder and nothing else, so its accessible name disappeared as soon as
    // anything was typed; the example sat above it as a loose paragraph (#713).
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    expect(field(el).getAttribute('label')).toBe('Mode Name');
    expect(field(el).getAttribute('hint')).toBe('Example: dql, draft, archive');
  });

  it('reports every keystroke as mode-name-change', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const seen = listen(el, 'mode-name-change');
    await type(el, 'archive');
    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toBe('archive');
  });

  it('does not also let the raw input event out', async () => {
    // The inner control's native `input` is composed, so without stopPropagation a consumer
    // would see the same keystroke twice under two names.
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const raw = listen(el, 'input');
    await type(el, 'archive');
    expect(raw).toHaveLength(0);
  });

  it('takes no value property, so nothing can overwrite what is being typed', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    expect('value' in el).toBe(false);
  });

  it('shows a validation message as an alert', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    expect(el.shadowRoot!.querySelector('.error')).toBeNull();
    el.formError = 'Mode Already Exist.';
    await el.updateComplete;
    const error = el.shadowRoot!.querySelector('.error')!;
    expect(error.textContent).toContain('Mode Already Exist.');
    // Nothing else tells a screen-reader user that the save did not happen (WCAG 3.3.1).
    expect(error.getAttribute('role')).toBe('alert');
  });

  it('emits dialog-save from Save', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const seen = listen(el, 'dialog-save');
    action(el, 'Save').click();
    expect(seen).toHaveLength(1);
  });

  it('emits dialog-close from Cancel', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const seen = listen(el, 'dialog-close');
    action(el, 'Cancel').click();
    expect(seen).toHaveLength(1);
  });

  it('emits dialog-close from the header close button', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    const seen = listen(el, 'dialog-close');
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(seen).toHaveLength(1);
  });

  it('forwards the native cancel event, so Escape does not desync the parent', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const seen = listen(el, 'dialog-close');
    dialog(el).dispatchEvent(new Event('cancel'));
    expect(seen).toHaveLength(1);
  });

  it('does not emit the native dialog event names', async () => {
    const el = await mountLit<AddModeDialog>(TAG, { open: true });
    const closes = listen(el, 'close');
    const cancels = listen(el, 'cancel');
    const saves = listen(el, 'save');
    action(el, 'Cancel').click();
    action(el, 'Save').click();
    expect(closes).toHaveLength(0);
    expect(cancels).toHaveLength(0);
    expect(saves).toHaveLength(0);
  });

  it('clears the field when it reopens, and says so', async () => {
    // The markup this replaced was never unmounted, so the previous attempt was still in the
    // field the next time the dialog opened, while the parent had reset its own copy to
    // empty - Save then reported "Mode Name is Required." under a field with text in it.
    const el = await mountLit<AddModeDialog>(TAG);
    el.open = true;
    await el.updateComplete;
    await type(el, 'archive');
    el.open = false;
    await el.updateComplete;

    const seen = listen(el, 'mode-name-change');
    el.open = true;
    await el.updateComplete;

    expect(field(el).value).toBe('');
    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toBe('');
  });

  it('puts the caret in the field when it opens', async () => {
    const el = await mountLit<AddModeDialog>(TAG);
    const input = field(el) as WaInput & { updateComplete: Promise<unknown> };
    const focus = vi.spyOn(input, 'focus');
    el.open = true;
    await el.updateComplete;
    // The element waits for the field's own first render before focusing it, because
    // focus() on a wa-input that has not rendered reaches an inner control that does not
    // exist yet. Two hops: the field's update, then the continuation that focuses it.
    await input.updateComplete;
    await Promise.resolve();
    expect(focus).toHaveBeenCalled();
  });
});
