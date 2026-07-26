import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import './lit-button';
import type Button from './lit-button';

const TAG = 'lit-button';

const waButton = (el: Button) => el.shadowRoot!.querySelector('wa-button')!;

describe('lit-button', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-button with brand/accent defaults', async () => {
    const el = await mountLit<Button>(TAG);
    const btn = waButton(el);
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('variant')).toBe('brand');
    expect(btn.getAttribute('appearance')).toBe('accent');
    expect(btn.hasAttribute('disabled')).toBe(false);
    expect(btn.hasAttribute('pill')).toBe(false);
  });

  it('reflects the variant property onto wa-button', async () => {
    const el = await mountLit<Button>(TAG, { variant: 'danger' });
    expect(waButton(el).getAttribute('variant')).toBe('danger');
  });

  it('disables the wa-button when disabled is true', async () => {
    const el = await mountLit<Button>(TAG, { disabled: true });
    expect(waButton(el).hasAttribute('disabled')).toBe(true);
  });

  it('makes the wa-button a pill when pill is true', async () => {
    const el = await mountLit<Button>(TAG, { pill: true });
    expect(waButton(el).hasAttribute('pill')).toBe(true);
  });

  it('renders a wa-icon with the given src', async () => {
    const el = await mountLit<Button>(TAG, { src: '/icons/plus.svg' });
    const icon = el.shadowRoot!.querySelector('wa-icon');
    expect(icon).toBeTruthy();
    expect(icon!.getAttribute('src')).toBe('/icons/plus.svg');
  });

  it('renders no wa-icon when src is empty', async () => {
    const el = await mountLit<Button>(TAG);
    expect(el.shadowRoot!.querySelector('wa-icon')).toBeNull();
  });

  it('projects light-DOM children through a default slot', async () => {
    const el = document.createElement(TAG) as Button;
    el.textContent = 'Add column';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('forwards a click on the inner button up to a host listener', async () => {
    const el = await mountLit<Button>(TAG);
    let clicks = 0;
    el.addEventListener('click', () => {
      clicks += 1;
    });
    (waButton(el) as HTMLElement).click();
    expect(clicks).toBe(1);
  });
});
