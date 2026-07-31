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

  it('right-click opens the one menu, and prevents the default context menu', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    const input = shadow(el).querySelector('#input-name') as HTMLElement;
    const preventDefault = vi.fn();

    el.handleRightClick({ target: input, preventDefault } as unknown as Event);
    await el.updateComplete;

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(menu(el).open).toBe(true);
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

  // ---- #925 · #940 ----------------------------------------------------------------------------

  /**
   * There is **one** menu for the whole tree, and it lives outside `wa-tree` (#940).
   *
   * A `wa-dropdown` per row could not be driven from the keyboard, and no binding fixed it:
   * `wa-tree` claims Enter, Space, the arrows, Home and End for anything focusable inside it —
   * and throws `Cannot read properties of undefined (reading 'disabled')` doing so, because it
   * looks the active item up with `:focus`, which matches nothing when focus is on a control
   * *within* a row. `wa-dropdown` listens for its own arrows on `document`, past the tree on
   * the bubble path, so containing the tree also starved the menu.
   *
   * Moving the menu out breaks that deadlock: its items are no longer descendants of the tree,
   * so their keydowns never reach it. Only Enter and Space on the row's opener need stopping,
   * and by the time the menu is open, focus is already outside.
   *
   * ⚠️ The keyboard journey itself is **not** asserted here and cannot be — jsdom runs no
   * focus or key handling of that kind. Measured in Chrome instead, end to end: focus the
   * opener, Enter, ArrowDown, Enter → `wa-select` fires with the right value, no page errors.
   * These pin the wiring that journey depends on.
   */
  const menu = (el: SourceTree) =>
    shadow(el).querySelector('#row-menu') as HTMLElement & { open: boolean };

  const openers = (el: SourceTree) =>
    Array.from(shadow(el).querySelectorAll<HTMLElement>('.menu-opener'));

  /** Open the one menu against a row, the way its opener does. */
  const openRow = async (el: SourceTree, row: number) => {
    openers(el)[row].click();
    await el.updateComplete;
  };

  /** What Web Awesome emits when an item is chosen, by pointer or by keyboard. */
  const choose = (el: SourceTree, value: string) =>
    menu(el).dispatchEvent(
      new CustomEvent('wa-select', {
        detail: { item: { value } },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

  it('renders one menu for the whole tree, not one per row', async () => {
    const el = await mountWithContent({ name: 'Widget', count: 3, meta: { x: 1 } });
    expect(shadow(el).querySelectorAll('wa-dropdown')).toHaveLength(1);
    expect(openers(el)).toHaveLength(3);
  });

  it('keeps that menu outside the tree, which is the whole point', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    expect(menu(el).closest('wa-tree'), 'the menu is back inside wa-tree').toBeNull();
  });

  it('gives every row a labelled opener, and the menu a slotted anchor', async () => {
    const el = await mountWithContent({ name: 'Widget', meta: { x: 1 } });
    for (const opener of openers(el)) {
      expect(opener.getAttribute('aria-haspopup')).toBe('menu');
      expect(opener.getAttribute('aria-label')).toMatch(/^Actions for /);
    }
    const anchor = menu(el).querySelector('[slot="trigger"]')!;
    expect(anchor.id).toBe('row-menu-anchor');
    // Never the affordance: the visible opener is. This only gives wa-dropdown something to
    // position against, since it has no anchor property.
    expect(anchor.getAttribute('tabindex')).toBe('-1');
    expect(anchor.getAttribute('aria-hidden')).toBe('true');
  });

  it('labels every menu entry with the value wa-select reports back', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    const values = Array.from(menu(el).querySelectorAll('wa-dropdown-item')).map((item) =>
      item.getAttribute('value'),
    );
    expect(values).toEqual(['add', 'edit', 'duplicate', 'remove']);
  });

  it('stops Enter and Space reaching wa-tree, and nothing else', async () => {
    // wa-tree throws on those two when focus is on a control within a row; the arrows are its
    // own row navigation and must still get through.
    const el = await mountWithContent({ name: 'Widget' });
    const stopped = (key: string) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      const spy = vi.spyOn(event, 'stopPropagation');
      el.handleOpenerKeydown(event);
      return spy.mock.calls.length > 0;
    };
    expect(stopped('Enter')).toBe(true);
    expect(stopped(' ')).toBe(true);
    expect(stopped('ArrowDown')).toBe(false);
    expect(stopped('ArrowUp')).toBe(false);
  });

  it('acts on the row whose opener was pressed, not the first one', async () => {
    const el = await mountWithContent({ name: 'Widget', count: 3 });
    await openRow(el, 1);
    choose(el, 'remove');
    await el.updateComplete;

    expect('count' in el.editedContent).toBe(false);
    expect(el.editedContent.name).toBe('Widget');
  });

  it('duplicates the row when Duplicate is selected', async () => {
    const el = await mountWithContent({ meta: { x: 1 } });
    await openRow(el, 0);
    choose(el, 'duplicate');
    await el.updateComplete;
    expect(el.editedContent).toHaveProperty('meta_copy');
  });

  it('opens the add dialog when Add is selected', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    const dialog = shadow(el).querySelector('dialog') as HTMLDialogElement;
    const showModal = vi.fn();
    dialog.showModal = showModal;

    await openRow(el, 0);
    choose(el, 'add');

    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it('disables Edit or Duplicate according to the row the menu was opened from', async () => {
    // One menu, so the states follow the active row rather than being fixed per instance.
    const el = await mountWithContent({ name: 'Widget', meta: { x: 1 } });
    const state = () =>
      Object.fromEntries(
        Array.from(menu(el).querySelectorAll('wa-dropdown-item')).map((item) => [
          item.getAttribute('value'),
          item.hasAttribute('disabled'),
        ]),
      );

    await openRow(el, 0); // a leaf
    expect(state()).toMatchObject({ edit: false, duplicate: true });

    await openRow(el, 1); // an object
    expect(state()).toMatchObject({ edit: true, duplicate: false });
  });

  it('does not let the composed wa-select escape into the host document', async () => {
    const el = await mountWithContent({ name: 'Widget' });
    const leaked = vi.fn();
    document.body.addEventListener('wa-select', leaked);

    await openRow(el, 0);
    choose(el, 'remove');

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('wa-select', leaked);
  });
});
