import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import './lit-api-error-dialog';
import type ApiErrorDialog from './lit-api-error-dialog';

const TAG = 'lit-api-error-dialog';
const sr = (el: ApiErrorDialog) => el.shadowRoot!;

describe('lit-api-error-dialog', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('composes a dialog from header, content and actions', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG);
    expect(sr(el).querySelector('dialog')).toBeTruthy();
    expect(sr(el).querySelector('lit-dialog-header')).toBeTruthy();
    expect(sr(el).querySelector('lit-dialog-content')).toBeTruthy();
    expect(sr(el).querySelector('lit-dialog-actions')).toBeTruthy();
  });

  it('renders the errorMessage inside the dialog content', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG, { errorMessage: 'Boom happened' });
    expect(sr(el).querySelector('lit-dialog-content')!.textContent).toContain('Boom happened');
  });

  it('opens the native dialog when showDialog is true', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG, { showDialog: true });
    expect(sr(el).querySelector('dialog')!.hasAttribute('open')).toBe(true);
  });

  it('offers an OK confirm button', async () => {
    const el = await mountLit<ApiErrorDialog>(TAG);
    const ok = sr(el).querySelector('lit-button-yes');
    expect(ok).toBeTruthy();
    expect(ok!.getAttribute('text')).toBe('OK');
  });

  it('closes the dialog when the close button is clicked', async () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, 'close');
    const el = await mountLit<ApiErrorDialog>(TAG, { showDialog: true });
    (sr(el).querySelector('button.close') as HTMLButtonElement).click();
    expect(closeSpy).toHaveBeenCalled();
  });
});
