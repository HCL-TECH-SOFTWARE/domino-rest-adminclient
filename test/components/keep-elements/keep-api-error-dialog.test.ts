/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-api-error-dialog';
import type ApiErrorDialog from '../../../src/components/keep-elements/keep-api-error-dialog';

const TAG = 'keep-api-error-dialog';
const sr = (el: ApiErrorDialog) => el.shadowRoot!;

describe('keep-api-error-dialog', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('composes a dialog from header, content and actions', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG);
    expect(sr(el).querySelector('dialog')).toBeTruthy();
    expect(sr(el).querySelector('keep-dialog-header')).toBeTruthy();
    expect(sr(el).querySelector('keep-dialog-content')).toBeTruthy();
    expect(sr(el).querySelector('keep-dialog-actions')).toBeTruthy();
  });

  it('renders the errorMessage inside the dialog content', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG, { errorMessage: 'Boom happened' });
    expect(sr(el).querySelector('keep-dialog-content')!.textContent).toContain('Boom happened');
  });

  it('opens the native dialog when showDialog is true', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG, { showDialog: true });
    expect(sr(el).querySelector('dialog')!.hasAttribute('open')).toBe(true);
  });

  it('offers an OK confirm button', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG);
    const ok = sr(el).querySelector('keep-button');
    expect(ok).toBeTruthy();
    expect(ok!.textContent?.trim()).toBe('OK');
  });

  it('closes the dialog when the close button is clicked', async () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, 'close');
    const el = await mountLit<ApiErrorDialog>(TAG, { showDialog: true });
    (sr(el).querySelector('button.close') as HTMLButtonElement).click();
    expect(closeSpy).toHaveBeenCalled();
  });
});
