import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/lit-elements/lit-checkbox';
import type Checkbox from '../../../src/components/lit-elements/lit-checkbox';

const TAG = 'lit-checkbox';
const waCheckbox = (el: Checkbox) =>
  el.shadowRoot!.querySelector('wa-checkbox') as HTMLElement & { checked: boolean };

describe('lit-checkbox', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-checkbox with a default slot', async () => {
    const el = await mountLit<Checkbox>(TAG);
    expect(waCheckbox(el)).toBeTruthy();
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('reflects the checked property onto the wa-checkbox attribute', async () => {
    const checkedOn = await mountLit<Checkbox>(TAG, { checked: true });
    expect(waCheckbox(checkedOn).hasAttribute('checked')).toBe(true);

    const checkedOff = await mountLit<Checkbox>(TAG, { checked: false });
    expect(waCheckbox(checkedOff).hasAttribute('checked')).toBe(false);
  });

  it('defaults size to "s" and reflects a custom size', async () => {
    const def = await mountLit<Checkbox>(TAG);
    expect(waCheckbox(def).getAttribute('size')).toBe('s');

    const md = await mountLit<Checkbox>(TAG, { size: 'm' });
    expect(waCheckbox(md).getAttribute('size')).toBe('m');
  });

  it('reflects the disabled property', async () => {
    const el = await mountLit<Checkbox>(TAG, { disabled: true });
    expect(waCheckbox(el).hasAttribute('disabled')).toBe(true);
  });

  it('re-emits a single change event when the inner checkbox toggles, updating checked', async () => {
    const el = await mountLit<Checkbox>(TAG, { checked: false });
    const inner = waCheckbox(el);

    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });

    // Simulate a user toggle: the inner control flips, then fires its change.
    inner.checked = true;
    inner.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(el.checked).toBe(true);
    expect(changes).toBe(1);
  });

  it('does not re-emit change when the inner value is unchanged', async () => {
    const el = await mountLit<Checkbox>(TAG, { checked: false });
    const inner = waCheckbox(el);

    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });

    // Inner stays false -> no state change -> no re-emit.
    inner.checked = false;
    inner.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    expect(changes).toBe(0);
  });
});
