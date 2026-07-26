import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-button-no';
import type ButtonNo from '../../../src/components/keep-elements/keep-button-no';

const TAG = 'keep-button-no';

const innerButton = (el: ButtonNo) => el.shadowRoot!.querySelector('button')!;

describe('keep-button-no', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders an inner button in the shadow root', async () => {
    const el = await mountLit<ButtonNo>(TAG);
    expect(innerButton(el)).toBeTruthy();
  });

  it('shows the text property as the button text content', async () => {
    const el = await mountLit<ButtonNo>(TAG, { text: 'No' });
    expect(innerButton(el).textContent).toBe('No');
  });

  it('reflects an updated text property after updateComplete', async () => {
    const el = await mountLit<ButtonNo>(TAG, { text: 'No' });
    el.text = 'X';
    await el.updateComplete;
    expect(innerButton(el).textContent).toBe('X');
  });

  it('passes the host style attribute through to the inner button', async () => {
    const el = document.createElement(TAG) as ButtonNo;
    el.setAttribute('style', 'background-color: teal;');
    document.body.appendChild(el);
    await el.updateComplete;
    const btn = innerButton(el);
    expect(btn.getAttribute('style')).toBe(el.getAttribute('style'));
    expect(btn.getAttribute('style')).toContain('teal');
  });

  it('forwards a click on the inner button up to a host listener', async () => {
    const el = await mountLit<ButtonNo>(TAG);
    let clicks = 0;
    el.addEventListener('click', () => {
      clicks += 1;
    });
    innerButton(el).click();
    expect(clicks).toBe(1);
  });
});
