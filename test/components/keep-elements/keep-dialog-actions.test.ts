/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-dialog-actions';
import type DialogActions from '../../../src/components/keep-elements/keep-dialog-actions';

const TAG = 'keep-dialog-actions';

describe('keep-dialog-actions', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a section in the shadow root', async () => {
    const el = await mountLit<DialogActions>(TAG);
    expect(el.shadowRoot!.querySelector('section')).toBeTruthy();
  });

  it('projects light-DOM children through a default slot inside the section', async () => {
    const el = await mountLit<DialogActions>(TAG);
    const slot = el.shadowRoot!.querySelector('section slot');
    expect(slot).toBeTruthy();
  });

  it('renders an hr before the section', async () => {
    const el = await mountLit<DialogActions>(TAG);
    const hr = el.shadowRoot!.querySelector('hr');
    const section = el.shadowRoot!.querySelector('section');
    expect(hr).toBeTruthy();
    expect(section).toBeTruthy();
    expect(hr!.compareDocumentPosition(section!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
