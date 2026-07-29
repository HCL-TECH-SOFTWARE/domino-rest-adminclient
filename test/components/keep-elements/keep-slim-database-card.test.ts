/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
// The slice action, not the same-named thunk the action barrel re-exports over it - that
// one calls the API.
import { fetchKeepPermissions } from '../../../src/store/databases/reducer';
import { DEFAULT_APP_ICON_NAME, loadAppIcons } from '../../../src/services/app-icons';
import '../../../src/components/keep-elements/keep-slim-database-card';
import type SlimDatabaseCard from '../../../src/components/keep-elements/keep-slim-database-card';

const TAG = 'keep-slim-database-card';

const DB = {
  apiName: 'demoscope',
  schemaName: 'Demo',
  nsfPath: 'demo.nsf',
  iconName: 'not-a-known-icon',
};

describe('keep-slim-database-card', () => {
  beforeEach(() => {
    store.dispatch(fetchKeepPermissions({ createDbMapping: true, deleteDbMapping: true }));
  });

  afterEach(cleanupLit);

  const q = (el: SlimDatabaseCard, sel: string) => el.shadowRoot!.querySelector(sel);

  const header = (el: SlimDatabaseCard) => q(el, '.header') as HTMLElement;

  const listen = (el: SlimDatabaseCard, type: string) => {
    const seen: CustomEvent[] = [];
    el.addEventListener(type, (e) => seen.push(e as CustomEvent));
    return seen;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('shows the api name on the scopes list, with no nsf path and no delete control', async () => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB });
    expect(q(el, '.api-name')!.textContent).toContain('demoscope');
    expect(q(el, '.api-nsf')).toBeNull();
    expect(q(el, '.delete-button')).toBeNull();
  });

  it('shows the schema name, the nsf path and the delete control on the schemas list', async () => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB, isSchema: true });
    expect(q(el, '.api-name')!.textContent).toContain('Demo');
    expect(q(el, '.api-nsf')!.textContent).toContain('demo.nsf');
    expect(q(el, '.delete-button')).toBeTruthy();
  });

  it('emits card-open on click', async () => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB });
    const seen = listen(el, 'card-open');
    header(el).click();
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.database).toBe(el.database);
  });

  it.each(['Enter', ' '])('emits card-open on %s', async (key) => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB });
    const seen = listen(el, 'card-open');
    // The React version handled Enter only, on a div that announced itself as clickable
    // without being a button. Space is required of anything with role="button" (WCAG 2.1.1).
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    header(el).dispatchEvent(event);
    expect(seen).toHaveLength(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('announces the row as a button and puts it in document tab order', async () => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB });
    expect(header(el).getAttribute('role')).toBe('button');
    // tabindex="1" in the React version. A positive value jumps ahead of everything with 0
    // and breaks document order (WCAG 2.4.3).
    expect(header(el).getAttribute('tabindex')).toBe('0');
  });

  it('names the icon-only delete control', async () => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB, isSchema: true });
    expect(q(el, '.delete-button')!.getAttribute('aria-label')).toBe('Delete schema Demo');
  });

  it('emits card-delete when the user may delete', async () => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB, isSchema: true });
    const seen = listen(el, 'card-delete');
    (q(el, '.delete-button') as HTMLElement).click();
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.database).toBe(el.database);
  });

  it('raises an alert and emits nothing when the user may not delete', async () => {
    store.dispatch(fetchKeepPermissions({ createDbMapping: true, deleteDbMapping: false }));
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB, isSchema: true });
    const seen = listen(el, 'card-delete');
    (q(el, '.delete-button') as HTMLElement).click();
    expect(seen).toHaveLength(0);
    expect(store.getState().alert.message).toContain('permission to delete schema');
  });

  it('re-renders when the permission arrives after mount', async () => {
    store.dispatch(fetchKeepPermissions({ createDbMapping: false, deleteDbMapping: false }));
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB, isSchema: true });
    const seen = listen(el, 'card-delete');
    store.dispatch(fetchKeepPermissions({ createDbMapping: true, deleteDbMapping: true }));
    await el.updateComplete;
    (q(el, '.delete-button') as HTMLElement).click();
    expect(seen).toHaveLength(1);
  });

  it('falls back to a database glyph for an unknown icon name', async () => {
    const el = await mountLit<SlimDatabaseCard>(TAG, { database: DB });
    // An unknown name is permanent, so the fallback shows at once rather than a skeleton.
    expect(q(el, '.logo wa-icon')!.getAttribute('name')).toBe('database');
    expect(q(el, '.logo img')).toBeNull();
  });

  it('renders a known icon decoratively once the payload chunk lands', async () => {
    await loadAppIcons();
    const el = await mountLit<SlimDatabaseCard>(TAG, {
      database: { ...DB, iconName: DEFAULT_APP_ICON_NAME },
    });
    const img = q(el, '.logo img')!;
    // The React alt was the placeholder "db-icon"; the name beside it identifies the entry,
    // so the image carries no information of its own (WCAG 1.1.1).
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
});
