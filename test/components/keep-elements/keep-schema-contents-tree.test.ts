/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setPullDatabase } from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import type { AvailableDatabases } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-schema-contents-tree';
import type SchemaContentsTree from '../../../src/components/keep-elements/keep-schema-contents-tree';
import type { KeepSchemaSelectDetail } from '../../../src/components/keep-elements/keep-schema-contents-tree';
import type { KeepTreeNode } from '../../../src/components/keep-elements/keep-tree';

const TAG = 'keep-schema-contents-tree';

const db = (title: string, apinames: string[], nsfpath = title): AvailableDatabases => ({
  title,
  nsfpath,
  apinames,
});

describe('keep-schema-contents-tree', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  const mount = (contents: AvailableDatabases[]) =>
    mountLit<SchemaContentsTree>(TAG, { contents });

  const tree = (el: SchemaContentsTree) => el.shadowRoot!.querySelector('keep-tree')!;
  const nodes = (el: SchemaContentsTree) =>
    (tree(el) as unknown as { nodes: KeepTreeNode[] }).nodes;

  /** Fire what `keep-tree` fires, so the translation is exercised end to end. */
  const selectValue = (el: SchemaContentsTree, value: unknown) =>
    tree(el).dispatchEvent(
      new CustomEvent('item-select', {
        detail: { id: 'x', label: 'x', value },
        bubbles: true,
        composed: true,
      }),
    );

  const captureSelect = (el: SchemaContentsTree) => {
    const seen: KeepSchemaSelectDetail[] = [];
    el.addEventListener('schema-select', (e) =>
      seen.push((e as CustomEvent<KeepSchemaSelectDetail>).detail),
    );
    return seen;
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('makes each database a branch and each of its APIs a leaf', async () => {
    const el = await mount([db('hr.nsf', ['people', 'pay']), db('crm.nsf', ['leads'])]);
    const roots = nodes(el);

    expect(roots.map((n) => n.label)).toEqual(['hr.nsf', 'crm.nsf']);
    expect(roots[0].children!.map((n) => n.label)).toEqual(['people', 'pay']);
    expect(roots[1].children!.map((n) => n.label)).toEqual(['leads']);
  });

  it('gives databases a database glyph and schemas a document glyph', async () => {
    const el = await mount([db('hr.nsf', ['people'])]);
    const root = nodes(el)[0];

    expect(root.icon).toBe('database');
    expect(root.children![0].icon).toBe('file');
  });

  it('de-duplicates repeated API names', async () => {
    // The API list arrives from the server and can repeat; the React version wrapped it in a
    // Set for exactly this. Duplicates would also collide on the generated node id.
    const el = await mount([db('hr.nsf', ['people', 'people', 'pay'])]);

    expect(nodes(el)[0].children!.map((n) => n.label)).toEqual(['people', 'pay']);
  });

  it('builds the same index-based ids the React version did', async () => {
    // `keep-tree` keys expand/collapse state on the id, so the scheme is load-bearing.
    const el = await mount([db('hr.nsf', ['people']), db('crm.nsf', ['leads'])]);
    const [hr, crm] = nodes(el);

    expect(hr.id).toBe('db-0');
    expect(hr.children![0].id).toBe('db-0-people-0');
    expect(crm.id).toBe('db-1');
    expect(crm.children![0].id).toBe('db-1-leads-0');
  });

  it('carries the database path and the API name as the leaf value', async () => {
    // `title` and `nsfpath` differ in practice: the tree shows the title, the form needs the
    // path, and the React version read the payload off the node for that reason.
    const el = await mount([db('HR', ['people'], 'apps/hr.nsf')]);

    expect(nodes(el)[0].children![0].value).toEqual({ nsfpath: 'apps/hr.nsf', api: 'people' });
  });

  it('emits schema-select with both halves when a schema is chosen', async () => {
    const el = await mount([db('HR', ['people'], 'apps/hr.nsf')]);
    const seen = captureSelect(el);

    selectValue(el, { nsfpath: 'apps/hr.nsf', api: 'people' });

    expect(seen).toEqual([{ nsfPath: 'apps/hr.nsf', schemaName: 'people' }]);
  });

  it('ignores a selection with no payload, so an API-less database stays inert', async () => {
    // A database with no APIs has no children, which makes `keep-tree` treat it as a
    // selectable leaf. It carries no value and was not clickable before this conversion.
    const el = await mount([db('empty.nsf', [])]);
    const seen = captureSelect(el);

    expect(nodes(el)[0].children).toEqual([]);
    selectValue(el, undefined);

    expect(seen).toEqual([]);
  });

  it('rebuilds the nodes when contents change, and not otherwise', async () => {
    // The React version rebuilt the array in its render body, so the tree saw a new array on
    // every parent render. Same contents must mean the same array identity here.
    const el = await mount([db('hr.nsf', ['people'])]);
    const first = nodes(el);

    el.requestUpdate();
    await el.updateComplete;
    expect(nodes(el)).toBe(first);

    el.contents = [db('hr.nsf', ['people']), db('crm.nsf', ['leads'])];
    await el.updateComplete;
    expect(nodes(el)).not.toBe(first);
    expect(nodes(el).map((n) => n.label)).toEqual(['hr.nsf', 'crm.nsf']);
  });

  it('renders an empty tree rather than failing when there are no databases', async () => {
    const el = await mount([]);

    expect(nodes(el)).toEqual([]);
  });

  it('treats a null contents as empty rather than throwing', async () => {
    // The wrapper layer re-applies every property on every parent render, so a parent that
    // has not loaded its list yet can push through an absent value.
    const el = await mount([db('hr.nsf', ['people'])]);

    el.contents = null as unknown as AvailableDatabases[];
    await el.updateComplete;

    expect(nodes(el)).toEqual([]);
  });

  it('shows the loading state until databasePull is true', async () => {
    const el = await mount([]);
    expect(el.shadowRoot!.querySelector('.loading')).not.toBeNull();

    store.dispatch(setPullDatabase(true));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.loading')).toBeNull();
  });

  it('announces the loading state', async () => {
    // Replaces the Material spinner, which had no accessible name at all here (#713).
    const el = await mount([]);
    const loading = el.shadowRoot!.querySelector('.loading')!;

    expect(loading.getAttribute('role')).toBe('status');
    expect(loading.textContent).toContain('Schemas are loading');
    expect(loading.querySelector('wa-spinner')!.getAttribute('aria-hidden')).toBe('true');
  });
});
