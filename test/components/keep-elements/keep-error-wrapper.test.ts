/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-error-wrapper';
import type ErrorWrapper from '../../../src/components/keep-elements/keep-error-wrapper';

const TAG = 'keep-error-wrapper';

const panel = (el: ErrorWrapper) => el.shadowRoot!.querySelector('.error');
const message = (el: ErrorWrapper) => el.shadowRoot!.querySelector('.message');
const image = (el: ErrorWrapper) => el.shadowRoot!.querySelector('img.image');
const greeting = (el: ErrorWrapper) => el.shadowRoot!.querySelector('.greeting');

const mount = (status: number, statusText = 'the status text') =>
  mountLit<ErrorWrapper>(TAG, { errorStatus: { status, statusText } });

describe('keep-error-wrapper', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('passes content through on 200', async () => {
    const el = await mount(200);
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
    expect(panel(el)).toBeNull();
  });

  it('defaults to passing content through', async () => {
    const el = await mountLit<ErrorWrapper>(TAG);
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it.each([400, 403, 404, 500])('renders an error state for %i', async (status) => {
    const el = await mount(status);
    expect(panel(el)).toBeTruthy();
    expect(el.shadowRoot!.querySelector('slot')).toBeNull();
    expect(image(el)!.getAttribute('src')).toBeTruthy();
  });

  it('shows statusText for 404 and its own copy for 500', async () => {
    const notFound = await mount(404, 'Schema not found');
    expect(message(notFound)!.textContent).toContain('Schema not found');

    cleanupLit();
    const serverError = await mount(500, 'ignored');
    // 500's copy is fixed in the component, as it was in the React version.
    expect(message(serverError)!.textContent).toContain('unexpected condition');
  });

  it.each([
    [400, true],
    [404, true],
    [403, false],
    [500, false],
  ])('shows the Oops greeting for %i: %s', async (status, expected) => {
    const el = await mount(status as number);
    expect(greeting(el) !== null).toBe(expected);
  });

  it('treats the illustration as decorative', async () => {
    const el = await mount(404, 'Schema not found');
    // The React version reused statusText as the alt text, so it was announced twice
    // (WCAG 1.1.1) (#713).
    expect(image(el)!.getAttribute('alt')).toBe('');
    expect(image(el)!.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders nothing for a status it has no state for', async () => {
    const el = await mount(418);
    expect(panel(el)).toBeNull();
    expect(el.shadowRoot!.querySelector('slot')).toBeNull();
  });

  it('re-renders when the status changes', async () => {
    const el = await mount(404);
    expect(panel(el)).toBeTruthy();
    el.errorStatus = { status: 200, statusText: '' };
    await el.updateComplete;
    expect(panel(el)).toBeNull();
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });
});
