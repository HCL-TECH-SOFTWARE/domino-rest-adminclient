/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-input-text';
import type InputText from '../../../src/components/keep-elements/keep-input-text';

const TAG = 'keep-input-text';

const waInput = (el: InputText) => el.shadowRoot!.querySelector('wa-input')!;

describe('keep-input-text', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-input in the shadow root', async () => {
    const el = await mountLit<InputText>(TAG);
    expect(waInput(el)).toBeTruthy();
  });

  it('reflects the label property onto wa-input', async () => {
    const el = await mountLit<InputText>(TAG, { label: 'First name' });
    expect(waInput(el).getAttribute('label')).toBe('First name');
  });

  it('reflects the hint property onto wa-input', async () => {
    const el = await mountLit<InputText>(TAG, { hint: 'Enter your name' });
    expect(waInput(el).getAttribute('hint')).toBe('Enter your name');
  });

  it('reflects the placeholder property onto wa-input', async () => {
    const el = await mountLit<InputText>(TAG, { placeholder: 'e.g. Jane' });
    expect(waInput(el).getAttribute('placeholder')).toBe('e.g. Jane');
  });

  it('sets the required attribute on wa-input when required is true', async () => {
    const el = await mountLit<InputText>(TAG, { required: true });
    expect(waInput(el).hasAttribute('required')).toBe(true);
  });

  it('projects light-DOM children through a default slot', async () => {
    const el = await mountLit<InputText>(TAG);
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('passes the host style attribute through to wa-input', async () => {
    const el = document.createElement(TAG) as InputText;
    el.setAttribute('style', 'width: 300px;');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(waInput(el).getAttribute('style')).toBe(el.getAttribute('style'));
  });
});
