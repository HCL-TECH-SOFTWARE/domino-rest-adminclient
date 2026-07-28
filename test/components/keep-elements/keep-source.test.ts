/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-source';
import type SourceTree from '../../../src/components/keep-elements/keep-source';

// jsdom lacks layout/observer APIs that WebAwesome's <wa-tree>/<wa-tree-item>
// touch during upgrade. Provide no-op stubs (test-only; no component change).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
// WebAwesome's dropdown show/hide animation calls Element.getAnimations()
// inside a requestAnimationFrame callback; jsdom does not implement it.
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = function () {
    return [];
  };
}

const TAG = 'keep-source-tree';

const shadow = (el: SourceTree) => el.shadowRoot!;

/**
 * Mount with a `content` object. The component's `updated()` re-derives
 * `editedContent` from `content` and calls `requestUpdate()`, so a second
 * render is needed before the tree is populated — flush both.
 */
async function mountWithContent(content: Record<string, unknown>): Promise<SourceTree> {
  const el = await mountLit<SourceTree>(TAG, { content } as Partial<SourceTree>);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

describe('keep-source-tree (SourceTree)', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the <main> / <wa-tree> shell with no items for empty content', async () => {
    const el = await mountLit<SourceTree>(TAG);
    expect(shadow(el).querySelector('main')).toBeTruthy();
    expect(shadow(el).querySelector('wa-tree')).toBeTruthy();
    expect(shadow(el).querySelectorAll('wa-tree-item').length).toBe(0);
  });

  it('renders one top-level wa-tree-item per key in content', async () => {
    const el = await mountWithContent({ name: 'Widget', count: 3, tags: ['a', 'b'], meta: { x: 1 } });
    expect(shadow(el).querySelectorAll('wa-tree-item').length).toBe(4);
  });

  it('renders leaf values as <input class="tree"> carrying the value', async () => {
    const el = await mountWithContent({ name: 'Widget', count: 3 });
    const inputs = shadow(el).querySelectorAll('input.tree');
    expect(inputs.length).toBe(2);
    expect(shadow(el).querySelector('#input-name')!.getAttribute('value')).toBe('Widget');
    expect(shadow(el).querySelector('#input-count')!.getAttribute('value')).toBe('3');
  });

  it('renders objects and arrays as object-array-container with a count badge', async () => {
    const el = await mountWithContent({ tags: ['a', 'b'], meta: { x: 1 } });
    const texts = Array.from(shadow(el).querySelectorAll('.object-array-container')).map((c) =>
      (c.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(texts.some((t) => t.includes('tags') && t.includes('[2]'))).toBe(true);
    expect(texts.some((t) => t.includes('meta') && t.includes('{1}'))).toBe(true);
  });

  it('keeps editedContent as a deep clone of content (equal value, distinct reference)', async () => {
    const content = { a: 1, nested: { b: 2 } };
    const el = await mountWithContent(content);
    expect(el.editedContent).toEqual(content);
    expect(el.editedContent).not.toBe(content);
    expect(el.editedContent.nested).not.toBe(content.nested);
  });

  it('re-derives editedContent when the content property changes', async () => {
    const el = await mountWithContent({ a: 1 });
    el.content = { b: 2, c: 3 };
    await el.updateComplete;
    await el.updateComplete;
    expect(el.editedContent).toEqual({ b: 2, c: 3 });
    expect(shadow(el).querySelectorAll('wa-tree-item').length).toBe(2);
    expect(shadow(el).querySelector('#input-a')).toBeNull();
  });

  it('updates editedContent and currentInputValues on leaf input', async () => {
    const el = await mountWithContent({ count: 3 });
    const input = shadow(el).querySelector('#input-count') as HTMLInputElement;
    input.value = '42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.editedContent.count).toBe('42');
    expect(el.currentInputValues['count']).toBe('42');
  });

  it('removes a key via handleClickRemove and re-renders without it', async () => {
    const el = await mountWithContent({ name: 'Widget', count: 3 });
    el.handleClickRemove('count', el.editedContent, 'count');
    await el.updateComplete;
    expect('count' in el.editedContent).toBe(false);
    expect(shadow(el).querySelector('#input-count')).toBeNull();
    expect(shadow(el).querySelectorAll('wa-tree-item').length).toBe(1);
  });

  it('duplicates an object entry via handleClickDuplicate', async () => {
    const el = await mountWithContent({ meta: { x: 1 } });
    el.handleClickDuplicate(new Event('click'), 'meta', 'meta', el.editedContent.meta);
    await el.updateComplete;
    expect(el.editedContent.meta_copy).toEqual({ x: 1 });
    expect(shadow(el).querySelectorAll('wa-tree-item').length).toBe(2);
  });

  it('opens the add dialog and toggles the insert/edit buttons via handleClickAdd', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    const dialog = shadow(el).querySelector('dialog') as HTMLDialogElement;
    const insertButton = dialog.querySelector('#dialog-insert')!;
    const editButton = dialog.querySelector('#dialog-edit')!;
    const showModal = vi.spyOn(dialog, 'showModal');

    el.handleClickAdd({ target: dialog } as unknown as Event);

    // Toggled by class. These used to be `setAttribute('style', 'display:block')`, which the
    // production CSP blocks outright — so with the template's static `display: none` still
    // applying, neither button ever appeared. jsdom has no CSP, so this assertion passed
    // while the feature was dead in the browser (#685).
    expect(insertButton.classList.contains('hidden')).toBe(false);
    expect(editButton.classList.contains('hidden')).toBe(true);
    expect(insertButton.hasAttribute('style')).toBe(false);
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it('opens the context dropdown via handleRightClick and prevents the default menu', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    const dropdown = shadow(el).querySelector('wa-dropdown') as HTMLElement & { open: boolean };
    const preventDefault = vi.fn();

    el.handleRightClick({ target: dropdown, preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(dropdown.open).toBe(true);
  });

  it('coerces "true"/"false" and writes nested paths in updateEditedContent', async () => {
    const el = await mountWithContent({ flag: 'x', outer: { inner: 'y' } });
    el.updateEditedContent(new Event('input'), 'flag', el.editedContent, 'true', 'flag');
    el.updateEditedContent(new Event('input'), 'inner', el.editedContent, 'false', 'outer.inner');
    expect(el.editedContent.flag).toBe(true);
    expect(el.editedContent.outer.inner).toBe(false);
  });

  it('clears the dialog inputs and closes the dialog via handleClickCancel', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    const treeItem = shadow(el).querySelector('wa-tree-item')!;
    const dialog = treeItem.querySelector('dialog') as HTMLDialogElement;
    const newKey = treeItem.querySelector('#new-key') as HTMLElement & { value: string };
    const newValue = treeItem.querySelector('#new-value') as HTMLElement & { value: string };
    newKey.value = 'foo';
    newValue.value = 'bar';
    const close = vi.spyOn(dialog, 'close');

    el.handleClickCancel({ target: dialog } as unknown as Event);

    expect(newKey.value).toBe('');
    expect(newValue.value).toBe('');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
