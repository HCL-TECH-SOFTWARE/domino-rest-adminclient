import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-input-date';
import type InputDate from '../../../src/components/keep-elements/keep-input-date';

const TAG = 'keep-input-date';
const waInput = (el: InputDate) => el.shadowRoot!.querySelector('wa-input')!;

describe('keep-input-date', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a native date input', async () => {
    const el = await mountLit<InputDate>(TAG);
    expect(waInput(el).getAttribute('type')).toBe('date');
  });

  it('passes the label and value through', async () => {
    const el = await mountLit<InputDate>(TAG, { label: 'Expires', value: '2026-07-27' });
    expect(waInput(el).getAttribute('label')).toBe('Expires');
    expect(waInput(el).value).toBe('2026-07-27');
  });

  it('emits date-change with the new ISO value', async () => {
    const el = await mountLit<InputDate>(TAG, { value: '2026-07-27' });
    const onChange = vi.fn();
    el.addEventListener('date-change', onChange as EventListener);

    const input = waInput(el);
    input.value = '2026-08-01';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as CustomEvent<{ value: string }>).detail.value).toBe('2026-08-01');
    expect(el.value).toBe('2026-08-01');
  });

  it('emits an event that escapes the shadow root', async () => {
    // The @lit/react wrapper in KeepElements.tsx binds onDateChange on the host, so an
    // event that does not compose out of the shadow root would never reach React.
    const el = await mountLit<InputDate>(TAG);
    const onParent = vi.fn();
    el.parentElement!.addEventListener('date-change', onParent as EventListener);

    const input = waInput(el);
    input.value = '2026-01-02';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(onParent).toHaveBeenCalledTimes(1);
  });
});
