import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-textform-array';
import type TextFormArray from '../../../src/components/keep-elements/keep-textform-array';

const TAG = 'keep-textform-array';
const q = (el: TextFormArray, sel: string) => el.shadowRoot!.querySelector(sel);
const qa = (el: TextFormArray, sel: string) => el.shadowRoot!.querySelectorAll(sel);

const rules = () => [
  { formula: 'F1', message: 'Msg1' },
  { formula: 'F2', message: 'Msg2' },
];

describe('keep-textform-array', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the add button and the add/delete dialogs', async () => {
    const el = await mountLit<TextFormArray>(TAG, { data: [], title: 'formula' });
    expect(q(el, 'button.add')).toBeTruthy();
    expect(q(el, 'dialog#delete')).toBeTruthy();
    expect(q(el, 'dialog#add')).toBeTruthy();
  });

  it('renders a wa-details with a keep-textform per data entry', async () => {
    const el = await mountLit<TextFormArray>(TAG, { data: rules(), title: 'formula' });
    expect(qa(el, 'wa-details').length).toBe(2);
    expect(qa(el, 'wa-details keep-textform').length).toBe(2);
  });

  it('opens the add dialog when Add Rule is clicked', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const el = await mountLit<TextFormArray>(TAG, { data: [], title: 'formula' });
    (q(el, 'button.add') as HTMLButtonElement).click();
    expect(showModal).toHaveBeenCalled();
  });

  it('opens the delete dialog and shows the rule message when Delete Rule is clicked', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const el = await mountLit<TextFormArray>(TAG, { data: rules(), title: 'formula' });
    (qa(el, 'button.delete')[0] as HTMLButtonElement).click();
    await el.updateComplete;
    expect(showModal).toHaveBeenCalled();
    expect(q(el, 'dialog#delete keep-dialog-content')!.textContent).toContain('Msg1');
  });

  it('pushes edits up through setData on data-changed', async () => {
    const setData = vi.fn();
    const el = await mountLit<TextFormArray>(TAG, { data: rules(), title: 'formula', setData });
    const firstForm = qa(el, 'wa-details keep-textform')[0];
    firstForm.dispatchEvent(new CustomEvent('data-changed', { detail: { formula: 'X', message: 'Msg1' } }));
    expect(setData).toHaveBeenCalledWith([
      { formula: 'X', message: 'Msg1' },
      { formula: 'F2', message: 'Msg2' },
    ]);
  });

  it('removes the selected rule and calls setData when delete is confirmed', async () => {
    const setData = vi.fn();
    const el = await mountLit<TextFormArray>(TAG, { data: rules(), title: 'formula', setData });
    (qa(el, 'button.delete')[0] as HTMLButtonElement).click(); // selects index 0, opens dialog
    (q(el, 'dialog#delete keep-button-yes') as HTMLElement).click(); // confirm
    expect(setData).toHaveBeenCalledWith([{ formula: 'F2', message: 'Msg2' }]);
  });
});
