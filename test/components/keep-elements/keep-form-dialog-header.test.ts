/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-form-dialog-header';
import type FormDialogHeader from '../../../src/components/keep-elements/keep-form-dialog-header';

const TAG = 'keep-form-dialog-header';

const heading = (el: FormDialogHeader) => el.shadowRoot!.querySelector('.heading')!;
const closeButton = (el: FormDialogHeader) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!;

describe('keep-form-dialog-header', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the heading as a real h2', async () => {
    const el = await mountLit<FormDialogHeader>(TAG, { heading: 'Delete schema?' });
    // A heading in the structure, not just heading-shaped text (#713, WCAG 1.3.1).
    expect(heading(el).tagName).toBe('H2');
    expect(heading(el).textContent).toContain('Delete schema?');
  });

  it('emits header-close, not close, when the button is clicked', async () => {
    const el = await mountLit<FormDialogHeader>(TAG, { heading: 'x' });
    const closes: Event[] = [];
    const natives: Event[] = [];
    el.addEventListener('header-close', (e) => closes.push(e));
    el.addEventListener('close', (e) => natives.push(e));

    closeButton(el).click();

    // `close` is the native <dialog> event and most consumers sit inside one, so emitting it
    // from here would be indistinguishable from the dialog itself closing.
    expect(closes).toHaveLength(1);
    expect(natives).toHaveLength(0);
  });

  it('emits an event that crosses the shadow boundary', async () => {
    const el = await mountLit<FormDialogHeader>(TAG, { heading: 'x' });
    const seen: CustomEvent[] = [];
    document.body.addEventListener('header-close', (e) => seen.push(e as CustomEvent));
    closeButton(el).click();
    expect(seen).toHaveLength(1);
    expect(seen[0].bubbles).toBe(true);
    expect(seen[0].composed).toBe(true);
  });

  it('gives the icon-only close button an accessible name', async () => {
    const el = await mountLit<FormDialogHeader>(TAG, { heading: 'x' });
    // Its only content is an SVG, so without this it had no name at all (WCAG 4.1.2).
    expect(closeButton(el).getAttribute('aria-label')).toBe('Close');
    expect(closeButton(el).querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('types the close button so it cannot submit a surrounding form', async () => {
    const el = await mountLit<FormDialogHeader>(TAG, { heading: 'x' });
    expect(closeButton(el).type).toBe('button');
  });

  it('does not shadow the native title property', async () => {
    const el = await mountLit<FormDialogHeader>(TAG, { heading: 'the heading' });
    // The property is `heading` precisely so `title` stays HTMLElement's.
    expect(el.title).toBe('');
    expect(el.heading).toBe('the heading');
  });

  it('updates when the heading changes', async () => {
    const el = await mountLit<FormDialogHeader>(TAG, { heading: 'first' });
    el.heading = 'second';
    await el.updateComplete;
    expect(heading(el).textContent).toContain('second');
    expect(heading(el).textContent).not.toContain('first');
  });
});
