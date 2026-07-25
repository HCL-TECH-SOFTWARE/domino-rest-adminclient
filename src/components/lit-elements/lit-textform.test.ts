import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import './lit-textform';
import type TextForm from './lit-textform';

const TAG = 'lit-textform';

describe('lit-textform', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders one row per data key', async () => {
    const el = await mountLit<TextForm>(TAG, { data: { formula: 'a', message: 'b' } });
    expect(el.shadowRoot!.querySelectorAll('.row').length).toBe(2);
  });

  it('maps known keys to friendly labels', async () => {
    const el = await mountLit<TextForm>(TAG, { data: { formula: 'a' } });
    expect(el.shadowRoot!.querySelector('.key')!.textContent!.trim()).toBe('Formula');
  });

  it('renders a text input for non-formula-type keys', async () => {
    const el = await mountLit<TextForm>(TAG, { data: { message: 'hello' } });
    const input = el.shadowRoot!.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('hello');
  });

  it('renders a lit-autocomplete for the formulaType key', async () => {
    const el = await mountLit<TextForm>(TAG, { data: { formulaType: 'domino' } });
    expect(el.shadowRoot!.querySelector('lit-autocomplete')).toBeTruthy();
  });

  it('emits data-changed with the updated data when a text input changes', async () => {
    const el = await mountLit<TextForm>(TAG, { data: { message: 'old' } });
    let detail: Record<string, unknown> | undefined;
    el.addEventListener('data-changed', (e) => {
      detail = (e as CustomEvent).detail;
    });

    const input = el.shadowRoot!.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'new';
    input.dispatchEvent(new Event('input'));

    expect(detail).toEqual({ message: 'new' });
  });
});
