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
import '../../../src/components/keep-elements/keep-file-contents-tree';
import type FileContentsTree from '../../../src/components/keep-elements/keep-file-contents-tree';
import type { KeepTreeNode } from '../../../src/components/keep-elements/keep-tree';

const TAG = 'keep-file-contents-tree';

const db = (title: string): AvailableDatabases => ({ title, nsfpath: title, apinames: [] });

describe('keep-file-contents-tree', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  const mount = (contents: AvailableDatabases[]) =>
    mountLit<FileContentsTree>(TAG, { contents });

  const tree = (el: FileContentsTree) => el.shadowRoot!.querySelector('keep-tree')!;
  const nodes = (el: FileContentsTree) => (tree(el) as unknown as { nodes: KeepTreeNode[] }).nodes;

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('folds slash-separated titles into nested nodes', async () => {
    const el = await mount([db('apps/hr/people.nsf'), db('apps/hr/pay.nsf'), db('top.nsf')]);
    const roots = nodes(el);
    expect(roots.map((n) => n.label)).toEqual(['apps', 'top.nsf']);

    const apps = roots[0];
    expect(apps.children!.map((n) => n.label)).toEqual(['hr']);
    expect(apps.children![0].children!.map((n) => n.label)).toEqual(['people.nsf', 'pay.nsf']);
  });

  it('gives branches a folder glyph and leaves a document glyph', async () => {
    const el = await mount([db('apps/hr/people.nsf')]);
    const apps = nodes(el)[0];
    expect(apps.icon).toBe('folder');
    expect(apps.children![0].icon).toBe('folder');
    expect(apps.children![0].children![0].icon).toBe('file');
  });

  it('ids are the path, so two leaves with the same name stay distinct', async () => {
    // The React version built ids the same way; this pins it, because `keep-tree` keys its
    // expand/collapse state on the id and duplicate ids collapse the wrong branch.
    const el = await mount([db('a/shared.nsf'), db('b/shared.nsf')]);
    const [a, b] = nodes(el);
    expect(a.children![0].id).toBe('a/shared.nsf');
    expect(b.children![0].id).toBe('b/shared.nsf');
  });

  it('carries the full path as the node value, on every level', async () => {
    // The value is what comes back on select, and a folder carries the path of whichever
    // title created it — which is why only leaves are selectable.
    const el = await mount([db('apps/hr/people.nsf')]);
    const apps = nodes(el)[0];
    expect(apps.children![0].children![0].value).toBe('apps/hr/people.nsf');
  });

  it('emits nsf-select with the chosen path when a leaf is selected', async () => {
    const el = await mount([db('apps/hr/people.nsf')]);
    let seen: string | undefined;
    el.addEventListener('nsf-select', (e) => {
      seen = (e as CustomEvent<{ nsfPath: string }>).detail.nsfPath;
    });
    tree(el).dispatchEvent(
      new CustomEvent('item-select', {
        detail: { id: 'apps/hr/people.nsf', value: 'apps/hr/people.nsf' },
        bubbles: true,
        composed: true,
      }),
    );
    expect(seen).toBe('apps/hr/people.nsf');
  });

  it('refolds when contents change, and not otherwise', async () => {
    // The React version memoised on [contents]. This is the same guarantee: the same array
    // identity must not produce a new node array, or `keep-tree` re-renders on every pass.
    const el = await mount([db('a.nsf')]);
    const first = nodes(el);
    el.requestUpdate();
    await el.updateComplete;
    expect(nodes(el)).toBe(first);

    el.contents = [db('a.nsf'), db('b.nsf')];
    await el.updateComplete;
    expect(nodes(el)).not.toBe(first);
    expect(nodes(el).map((n) => n.label)).toEqual(['a.nsf', 'b.nsf']);
  });

  it('shows the loading state until databasePull is true', async () => {
    const el = await mount([]);
    expect(el.shadowRoot!.querySelector('.loading')).not.toBeNull();

    store.dispatch(setPullDatabase(true));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.loading')).toBeNull();
  });

  it('the loading state is announced', async () => {
    // Replaces MUI CircularProgress, which had no accessible name at all here.
    const el = await mount([]);
    const loading = el.shadowRoot!.querySelector('.loading')!;
    expect(loading.getAttribute('role')).toBe('status');
    expect(loading.textContent).toContain('loading');
    expect(loading.querySelector('.spinner')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders an empty tree rather than failing when there are no databases', async () => {
    const el = await mount([]);
    expect(nodes(el)).toEqual([]);
  });
});
