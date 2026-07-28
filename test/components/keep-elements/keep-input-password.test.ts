/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-input-password';
import type InputPassword from '../../../src/components/keep-elements/keep-input-password';

const TAG = 'keep-input-password';

const waInput = (el: InputPassword) => el.shadowRoot!.querySelector('wa-input')!;

describe('keep-input-password', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-input in the shadow root', async () => {
    const el = await mountLit<InputPassword>(TAG);
    expect(waInput(el)).toBeTruthy();
  });

  it('renders the wa-input as a password field', async () => {
    const el = await mountLit<InputPassword>(TAG);
    expect(waInput(el).getAttribute('type')).toBe('password');
  });

  it('enables the password toggle on the wa-input', async () => {
    const el = await mountLit<InputPassword>(TAG);
    expect(waInput(el).hasAttribute('password-toggle')).toBe(true);
  });

  it('reflects the label property onto wa-input', async () => {
    const el = await mountLit<InputPassword>(TAG, { label: 'Password' });
    expect(waInput(el).getAttribute('label')).toBe('Password');
  });

  it('reflects the placeholder property onto wa-input', async () => {
    const el = await mountLit<InputPassword>(TAG, { placeholder: 'Enter password' });
    expect(waInput(el).getAttribute('placeholder')).toBe('Enter password');
  });

  it('marks the wa-input required when required is true', async () => {
    const el = await mountLit<InputPassword>(TAG, { required: true });
    expect(waInput(el).hasAttribute('required')).toBe(true);
  });

  it('projects light-DOM children through a default slot', async () => {
    const el = document.createElement(TAG) as InputPassword;
    el.textContent = 'Password';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('passes the host style attribute through to wa-input', async () => {
    const el = document.createElement(TAG) as InputPassword;
    el.setAttribute('style', 'margin: 4px;');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(waInput(el).getAttribute('style')).toBe(el.getAttribute('style'));
  });
});
