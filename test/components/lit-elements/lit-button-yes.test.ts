import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/lit-elements/lit-button-yes';
import type ButtonYes from '../../../src/components/lit-elements/lit-button-yes';

const TAG = 'lit-button-yes';

const innerButton = (el: ButtonYes) => el.shadowRoot!.querySelector('button')!;

describe('lit-button-yes', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders an inner button in the shadow root', async () => {
    const el = await mountLit<ButtonYes>(TAG);
    expect(innerButton(el)).toBeTruthy();
  });

  it('shows the text property as the button text content', async () => {
    const el = await mountLit<ButtonYes>(TAG, { text: 'Yes' });
    expect(innerButton(el).textContent).toBe('Yes');
  });

  it('reflects an updated text property', async () => {
    const el = await mountLit<ButtonYes>(TAG, { text: 'Yes' });
    el.text = 'X';
    await el.updateComplete;
    expect(innerButton(el).textContent).toBe('X');
  });

  it('passes the host style attribute through to the inner button', async () => {
    const el = document.createElement(TAG) as ButtonYes;
    el.setAttribute('style', 'color: red');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(innerButton(el).getAttribute('style')).toContain('color: red');
  });

  it('forwards a click on the inner button up to a host listener', async () => {
    const el = await mountLit<ButtonYes>(TAG);
    let clicks = 0;
    el.addEventListener('click', () => {
      clicks += 1;
    });
    innerButton(el).click();
    expect(clicks).toBe(1);
  });
});
