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

  it('performs case-insensitive search filtering', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const input = el.shadowRoot!.querySelector('wa-input') as HTMLElement & { value: string };
    input.value = 'ALPHA';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(q(el, 'keep-schema-status').length).toBe(1);
  });

  it('clears the filter when search is empty', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const input = el.shadowRoot!.querySelector('wa-input') as HTMLElement & { value: string };
    input.value = 'Alpha';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(q(el, 'keep-schema-status').length).toBe(1);

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(q(el, 'keep-schema-status').length).toBe(2);
  });

  it('shows no results when search has no matches', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const input = el.shadowRoot!.querySelector('wa-input') as HTMLElement & { value: string };
    input.value = 'Nonexistent';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(q(el, 'keep-schema-status').length).toBe(0);
  });

  it('passes schemasWithScopes to each keep-schema-status', async () => {
    const scopes = ['scope1', 'scope2'];
    const el = await mountLit<NsfCard>(TAG, { database, schemasWithScopes: scopes });
    await el.updateComplete;
    const status = q(el, 'keep-schema-status')[0] as any;
    expect(status.schemasWithScopes).toEqual(scopes);
  });

  it('calls the delete callback when onDelete is triggered', async () => {
    let deletedItem = null;
    const deleteFn = (item: any) => {
      deletedItem = item;
    };
    const el = await mountLit<NsfCard>(TAG, { database, deleteFn });
    await el.updateComplete;
    
    const status = q(el, 'keep-schema-status')[0] as any;
    status.onDelete();
    
    expect(deletedItem).toEqual(database.databases[0]);
  });

  it('calls the open callback when onClickOpen is triggered', async () => {
    let openedItem = null;
    const open = (item: any) => {
      openedItem = item;
    };
    const el = await mountLit<NsfCard>(TAG, { database, open });
    await el.updateComplete;
    
    const status = q(el, 'keep-schema-status')[0] as any;
    status.onClickOpen();
    
    expect(openedItem).toEqual(database.databases[0]);
  });

  it('updates items and iconName when database property changes', async () => {
    const db1 = {
      fileName: 'db1.nsf',
      databases: [{ schemaName: 'Schema1', apiName: 'Api1', nsfPath: 'db1.nsf', iconName: 'icon1' }],
    };
    const db2 = {
      fileName: 'db2.nsf',
      databases: [
        { schemaName: 'Schema2', apiName: 'Api2', nsfPath: 'db2.nsf', iconName: 'icon2' },
        { schemaName: 'Schema3', apiName: 'Api3', nsfPath: 'db2.nsf', iconName: 'icon2' },
      ],
    };
    
    const el = await mountLit<NsfCard>(TAG, { database: db1 });
    expect(q(el, 'keep-schema-status').length).toBe(1);
    
    el.database = db2;
    el.requestUpdate();
    await el.updateComplete;
    expect(q(el, 'keep-schema-status').length).toBe(2);
  });

  it('handles empty database gracefully', async () => {
    const emptyDb = { fileName: 'empty.nsf' };
    const el = await mountLit<NsfCard>(TAG, { database: emptyDb });
    expect(q(el, 'keep-schema-status').length).toBe(0);
    expect(el.shadowRoot!.querySelector('.nsf-filename')!.textContent).toContain('empty.nsf');
  });

  it('sets default iconName when databases are empty', async () => {
    const emptyDb = { fileName: 'empty.nsf', databases: [] };
    const el = await mountLit<NsfCard>(TAG, { database: emptyDb });
    expect((el as any).iconName).toBe('beach');
  });

  it('preserves search value across updates', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const input = el.shadowRoot!.querySelector('wa-input') as HTMLElement & { value: string };
    input.value = 'Alpha';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    
    expect((el as any).searchItem).toBe('Alpha');
    expect(input.value).toBe('Alpha');
  });

  it('has accessibility label for the search input', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const label = el.shadowRoot!.querySelector('wa-input span[slot="label"]');
    expect(label).toBeTruthy();
    expect(label!.textContent).toContain('Search schemas in orders.nsf');
    expect(label!.classList.contains('visually-hidden')).toBe(true);
  });

  it('has magnifying glass icon in search input prefix', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const icon = el.shadowRoot!.querySelector('wa-input wa-icon[slot="prefix"]');
    expect(icon).toBeTruthy();
    expect(icon!.getAttribute('name')).toBe('magnifying-glass');
  });
});
