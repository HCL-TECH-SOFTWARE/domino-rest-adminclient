/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import {
  DEFAULT_APP_ICON_NAME,
  appIconUri,
  loadAppIcons,
  resetAppIconsForTest,
} from '../../../src/services/app-icons';
import '../../../src/components/keep-elements/keep-nsf-card';
import type NsfCard from '../../../src/components/keep-elements/keep-nsf-card';

const TAG = 'keep-nsf-card';
const q = (el: NsfCard, sel: string) => el.shadowRoot!.querySelectorAll(sel);

const database = {
  fileName: 'orders.nsf',
  databases: [
    { schemaName: 'Alpha', apiName: 'AlphaApi', nsfPath: 'orders.nsf', iconName: 'beach' },
    { schemaName: 'Beta', apiName: 'BetaApi', nsfPath: 'orders.nsf', iconName: 'beach' },
  ],
};

describe('keep-nsf-card', () => {
  afterEach(() => {
    cleanupLit();
    // Each test decides for itself whether the payloads are loaded, so the module-level
    // cache must not leak the answer from the previous one.
    resetAppIconsForTest();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a card with a search input and the database file name', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    expect(el.shadowRoot!.querySelector('section')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('wa-input')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.nsf-filename')!.textContent).toContain('orders.nsf');
  });

  it('renders one keep-schema-status per database entry', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    expect(q(el, 'keep-schema-status').length).toBe(2);
  });

  it('filters the list from the search input', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const input = el.shadowRoot!.querySelector('wa-input') as HTMLElement & { value: string };
    input.value = 'AlphaApi';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(q(el, 'keep-schema-status').length).toBe(1);
  });

  /**
   * #772 put the icon payloads behind a dynamic `import()`, so this element resolves its
   * icon asynchronously — one `updateComplete` after mount is no longer enough. Awaiting
   * the loader is what the render actually waits on.
   */
  it('renders an icon in the card title once the payloads load', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    await loadAppIcons();
    await el.updateComplete;

    const icon = el.shadowRoot!.querySelector('.card-title wa-icon');
    expect(icon).toBeTruthy();
    expect(icon!.getAttribute('src')).toBe(appIconUri('beach'));
  });

  it('shows a skeleton in the icon slot before the payloads load', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    // Deliberately not awaiting `loadAppIcons()`: this is the pre-load frame.
    expect(el.shadowRoot!.querySelector('.card-title wa-icon')).toBeNull();
    expect(el.shadowRoot!.querySelector('.card-title .app-icon-skeleton')).toBeTruthy();
  });

  it('falls back to the default icon when iconName is unknown', async () => {
    const unknown = { fileName: 'x.nsf', databases: [{ schemaName: 'A', iconName: 'no-such-icon' }] };
    const el = await mountLit<NsfCard>(TAG, { database: unknown });
    await loadAppIcons();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.card-title wa-icon')!.getAttribute('src')).toBe(
      appIconUri(DEFAULT_APP_ICON_NAME),
    );
  });
});
