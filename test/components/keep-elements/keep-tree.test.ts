import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-tree';
import type Tree from '../../../src/components/keep-elements/keep-tree';
import type { KeepTreeNode, KeepTreeSelectDetail } from '../../../src/components/keep-elements/keep-tree';

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
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = function () {
    return [];
  };
}

const TAG = 'keep-tree';

const shadow = (el: Tree) => el.shadowRoot!;
const items = (el: Tree) => Array.from(shadow(el).querySelectorAll('wa-tree-item'));
const itemById = (el: Tree, id: string) =>
  shadow(el).querySelector(`wa-tree-item[data-id="${id}"]`) as HTMLElement;
/** The item's own label — nested items and their labels are descendants too. */
const labelOf = (item: HTMLElement) =>
  Array.from(item.children).find((child) => child.classList.contains('node-label'))!;

const NODES: KeepTreeNode[] = [
  {
    id: 'folder',
    label: 'folder',
    children: [
      { id: 'folder/leaf.nsf', label: 'leaf.nsf', icon: 'file', value: 'folder/leaf.nsf' }
    ]
  },
  { id: 'top.nsf', label: 'top.nsf', icon: 'file', value: 'top.nsf' }
];

/** Collect `item-select` details fired by the element. */
function captureSelections(el: Tree): KeepTreeSelectDetail[] {
  const seen: KeepTreeSelectDetail[] = [];
  el.addEventListener('item-select', (event) => {
    seen.push((event as CustomEvent<KeepTreeSelectDetail>).detail);
  });
  return seen;
}

describe('keep-tree', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a leaf-selection wa-tree with expand/collapse icons', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: NODES });
    const tree = shadow(el).querySelector('wa-tree')!;
    expect(tree.getAttribute('selection')).toBe('leaf');
    expect(tree.querySelector('wa-icon[slot="expand-icon"]')!.getAttribute('name')).toBe('square-plus');
    expect(tree.querySelector('wa-icon[slot="collapse-icon"]')!.getAttribute('name')).toBe('square-minus');
  });

  it('renders one wa-tree-item per node, including nested children', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: NODES });
    expect(items(el)).toHaveLength(3);
    expect(items(el).map((item) => item.getAttribute('data-id'))).toEqual([
      'folder',
      'folder/leaf.nsf',
      'top.nsf'
    ]);
  });

  it('nests child items inside their parent item', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: NODES });
    const parent = itemById(el, 'folder');
    const child = itemById(el, 'folder/leaf.nsf');
    expect(parent.contains(child)).toBe(true);
    expect(child.textContent).toContain('leaf.nsf');
  });

  it('renders an icon only for nodes that declare one', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: NODES });
    // Look at the node's own label only: nested items, and the expand/collapse
    // icons WebAwesome clones into every item, are descendants as well.
    expect(labelOf(itemById(el, 'folder')).querySelector('wa-icon')).toBeNull();
    const leafIcon = labelOf(itemById(el, 'top.nsf')).querySelector('wa-icon')!;
    expect(leafIcon.getAttribute('name')).toBe('file');
    expect(leafIcon.getAttribute('library')).toBe('fa');
  });

  it('emits item-select once with the node payload when a leaf is clicked', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: NODES });
    const seen = captureSelections(el);

    itemById(el, 'folder/leaf.nsf').click();

    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe('folder/leaf.nsf');
    expect(seen[0].label).toBe('leaf.nsf');
    expect(seen[0].value).toBe('folder/leaf.nsf');
    expect(seen[0].node).toBe(NODES[0].children![0]);
  });

  it('carries an arbitrary object payload through as the value', async () => {
    const value = { nsfpath: 'db.nsf', api: 'demo' };
    const el = await mountLit<Tree>(TAG, {
      nodes: [{ id: 'db', label: 'db', children: [{ id: 'db-api', label: 'demo', value }] }]
    });
    const seen = captureSelections(el);

    itemById(el, 'db-api').click();

    expect(seen).toHaveLength(1);
    expect(seen[0].value).toEqual(value);
  });

  it('does not emit when a branch item is clicked', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: NODES });
    const seen = captureSelections(el);

    itemById(el, 'folder').click();

    expect(seen).toHaveLength(0);
  });

  it('renders an empty tree for an empty node list', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: [] });
    expect(shadow(el).querySelector('wa-tree')).toBeTruthy();
    expect(items(el)).toHaveLength(0);
  });

  it('renders an empty tree when nodes is undefined', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: undefined });
    expect(shadow(el).querySelector('wa-tree')).toBeTruthy();
    expect(items(el)).toHaveLength(0);
  });

  it('re-renders when nodes are replaced', async () => {
    const el = await mountLit<Tree>(TAG, { nodes: NODES });
    el.nodes = [{ id: 'only', label: 'only' }];
    await el.updateComplete;
    expect(items(el)).toHaveLength(1);
    expect(itemById(el, 'only')).toBeTruthy();
  });
});
