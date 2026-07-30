/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { setApiLoading } from '../../../src/store/dialog/action';
import { setFolders, setPullScope, setViews } from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-views-tab';
import ViewsTabClass from '../../../src/components/keep-elements/keep-views-tab';
import type ViewsTab from '../../../src/components/keep-elements/keep-views-tab';
import type { KeepViewsTabViewOpenDetail } from '../../../src/components/keep-elements/keep-views-tab';
import type { KeepViewsTableRow } from '../../../src/components/keep-elements/keep-views-table';

/**
 * The element test for what used to be `forms/TabViews.tsx`, which had no test of its own.
 *
 * The activation thunk is stubbed: the real `handleDatabaseViews` posts the whole schema
 * back to the API. `importOriginal` rather than a bare factory, so nothing else the element
 * or the nested table reaches for in that barrel is blanked out — `keep-views-table`
 * dispatches `toggleAlert` from the same graph.
 */
const handleDatabaseViews = vi.hoisted(() =>
  vi.fn((..._args: unknown[]) => ({ type: 'TEST_HANDLE_DATABASE_VIEWS' })),
);

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  handleDatabaseViews,
}));

const TAG = 'keep-views-tab';

/**
 * Two views, deliberately out of alphabetical order in the store, so "sorted by name" is
 * distinguishable from "in store order".
 */
const storeViews = [
  { viewName: 'Zulu', viewUnid: 'u-zulu', viewAlias: [], viewActive: true, viewUpdated: false },
  { viewName: 'Alpha', viewUnid: 'u-alpha', viewAlias: [], viewActive: false, viewUpdated: false },
];

/** One folder, which is merged into the same list the table renders. */
const storeFolders = [
  { viewName: 'Mike', viewUnid: 'u-mike', viewAlias: [], viewUpdated: false },
];

/**
 * The schema's own view list, in the shape the schema stores it — `name`/`alias`/`unid`,
 * not the `viewName`/`viewAlias`/`viewUnid` every consumer downstream reads. Zulu is active
 * and Mike is an active folder, so the Show Active filter has one of each to keep.
 */
const schemaData = {
  nsfPath: 'test.nsf',
  schemaName: 'testdb',
  views: [
    {
      name: 'Zulu',
      alias: ['z'],
      unid: 'u-zulu',
      viewUpdated: false,
      columns: [{ title: 'One' }],
      selectionFormula: 'SELECT @All',
    },
    {
      name: 'Mike',
      alias: [],
      unid: 'u-mike',
      viewUpdated: false,
      columns: [],
      selectionFormula: '',
    },
  ],
} as never;

/** What the element derives from `schemaData` and hands the thunk as its active list. */
const activeViews = [
  {
    viewActive: true,
    viewAlias: ['z'],
    viewName: 'Zulu',
    viewUnid: 'u-zulu',
    viewUpdated: false,
    viewColumns: [{ title: 'One' }],
    viewFolder: false,
    viewSelectionFormula: 'SELECT @All',
  },
  {
    viewActive: true,
    viewAlias: [],
    viewName: 'Mike',
    viewUnid: 'u-mike',
    viewUpdated: false,
    viewColumns: [],
    // Mike is in the folder list, so this is the flag that says a folder can be told apart
    // from a view once it is in the schema.
    viewFolder: true,
    viewSelectionFormula: '',
  },
];

describe('keep-views-tab', () => {
  const reset = () => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch(setViews({ views: structuredClone(storeViews) }));
    store.dispatch(setFolders({ folders: structuredClone(storeFolders) }));
    store.dispatch(setPullScope(true));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  const mount = (props: Partial<ViewsTab> = {}) =>
    mountLit<ViewsTab>(TAG, { schemaData, dbName: 'testdb', ...props });

  const table = (el: ViewsTab) =>
    el.shadowRoot!.querySelector('keep-views-table') as HTMLElement & {
      views: KeepViewsTableRow[];
    };

  const rowNames = (el: ViewsTab) => table(el).views.map((row) => row.viewName);

  const bulkButton = (el: ViewsTab, className: string) =>
    el.shadowRoot!.querySelector<HTMLButtonElement>(`.bulk-button.${className}`)!;

  const dialogOf = (el: ViewsTab) => el.shadowRoot!.querySelector('dialog')!;

  const dialogButton = (el: ViewsTab, label: string) =>
    [...el.shadowRoot!.querySelectorAll('keep-button')].find(
      (button) => button.textContent?.trim() === label,
    ) as HTMLElement;

  const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);

  /** Type the given text into the search box, the way the element hears it. */
  const search = async (el: ViewsTab, value: string) => {
    el.shadowRoot!.querySelector('keep-search-input')!.dispatchEvent(
      new CustomEvent('search-change', { detail: { value }, bubbles: true, composed: true }),
    );
    await el.updateComplete;
  };

  /** Fire what `keep-views-table` emits from a row, composed as the real one is. */
  const fromTable = async (el: ViewsTab, type: string, detail: unknown) => {
    table(el).dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    await el.updateComplete;
  };

  /** The whole `static styles` group as text, for the rules the suite cannot compute. */
  const styleText = (ViewsTabClass as unknown as { styles: Array<{ cssText: string }> }).styles
    .map((sheet) => sheet.cssText)
    .join('\n');

  describe('structure', () => {
    it('registers the custom element', () => {
      expect(customElements.get(TAG)).toBeTruthy();
    });

    it('renders the search box, the bulk buttons, the filter and the table', async () => {
      const el = await mount();
      const root = el.shadowRoot!;
      expect(root.querySelector('keep-search-input')!.getAttribute('placeholder')).toBe(
        'Search Views',
      );
      expect(bulkButton(el, 'activate').textContent!.trim()).toBe('Activate All');
      expect(bulkButton(el, 'deactivate').textContent!.trim()).toBe('Deactivate All');
      expect(root.querySelector('keep-switch')!.textContent!.trim()).toBe('Show Active');
      expect(root.querySelector('keep-views-table')).toBeTruthy();
    });

    it('blocks the filter box while the list is still being pulled', async () => {
      store.dispatch(setPullScope(false));
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-search-input')!.hasAttribute('disabled')).toBe(
        true,
      );
    });

    it('leaves the filter box live once the pull has finished', async () => {
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-search-input')!.hasAttribute('disabled')).toBe(
        false,
      );
    });
  });

  describe('the list it hands the table', () => {
    it('merges the store views with the folders, sorted by name', async () => {
      const el = await mount();
      expect(rowNames(el)).toEqual(['Alpha', 'Mike', 'Zulu']);
    });

    it('marks a folder active when the schema already has it', async () => {
      const el = await mount();
      const rows = table(el).views;
      expect(rows.find((row) => row.viewName === 'Mike')!.viewActive).toBe(true);
    });

    it('leaves a folder the schema does not have inactive', async () => {
      const el = await mount({ schemaData: { ...(schemaData as object), views: [] } as never });
      const rows = table(el).views;
      expect(rows.find((row) => row.viewName === 'Mike')!.viewActive).toBe(false);
    });

    it('re-reads the list when the store changes', async () => {
      const el = await mount();
      store.dispatch(setViews({ views: [{ viewName: 'Bravo', viewUnid: 'u-bravo' }] }));
      await el.updateComplete;
      expect(rowNames(el)).toEqual(['Bravo', 'Mike']);
    });

    it('filters on the search key, case-insensitively', async () => {
      const el = await mount();
      await search(el, 'ZU');
      expect(rowNames(el)).toEqual(['Zulu']);
    });

    it('drops the filter when the box is cleared', async () => {
      const el = await mount();
      await search(el, 'zu');
      await search(el, '');
      expect(rowNames(el)).toEqual(['Alpha', 'Mike', 'Zulu']);
    });

    it('re-runs the filter against the current rows, not the ones captured at the keystroke', async () => {
      // The original computed the filtered list inside the search handler and never
      // recomputed it, so a row activated while a search was showing kept the pill it had
      // when the key was typed.
      const el = await mount();
      await search(el, 'a');
      expect(rowNames(el)).toEqual(['Alpha']);

      store.dispatch(setViews({ views: [{ viewName: 'Alpha2', viewUnid: 'u-alpha2' }] }));
      await el.updateComplete;

      expect(rowNames(el)).toEqual(['Alpha2']);
    });

    it('keeps only the schema’s own views when Show Active is on', async () => {
      const el = await mount();
      el.showActive = true;
      await el.updateComplete;
      // Alpha is in the store but not in the schema, so it is not active.
      expect(rowNames(el)).toEqual(['Mike', 'Zulu']);
    });

    it('applies the search key on top of Show Active', async () => {
      const el = await mount();
      el.showActive = true;
      await search(el, 'mi');
      expect(rowNames(el)).toEqual(['Mike']);
    });

    it('toggles Show Active from the switch', async () => {
      const el = await mount();
      const toggle = el.shadowRoot!.querySelector('keep-switch')!;
      expect(toggle.onToggle).toBeTypeOf('function');

      toggle.onToggle!(new Event('change'));
      await el.updateComplete;
      expect(el.showActive).toBe(true);

      toggle.onToggle!(new Event('change'));
      await el.updateComplete;
      expect(el.showActive).toBe(false);
    });

    it('tolerates a schema with no view list at all', async () => {
      // The original left the derived active list undefined here, and the activation thunk
      // iterates it unconditionally.
      const el = await mount({ schemaData: { nsfPath: 'x.nsf' } as never });
      expect(rowNames(el)).toEqual(['Alpha', 'Mike', 'Zulu']);
      bulkButton(el, 'activate').click();
      expect(handleDatabaseViews.mock.calls[0][1]).toEqual([]);
    });
  });

  describe('the bulk buttons', () => {
    it('activates every view in the store', async () => {
      const el = await mount();
      bulkButton(el, 'activate').click();

      expect(handleDatabaseViews).toHaveBeenCalledTimes(1);
      expect(handleDatabaseViews).toHaveBeenCalledWith(
        store.getState().databases.views,
        activeViews,
        'testdb',
        schemaData,
        true,
        expect.any(Function),
        ['Mike'],
      );
    });

    it('asks before deactivating everything, and dispatches nothing until it is answered', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      expect(el.resetAllViews).toBe(true);
      // jsdom has no modal top layer; setupTests stubs showModal, so assert on the stub.
      expect(showModal()).toHaveBeenCalledTimes(1);
      expect(handleDatabaseViews).not.toHaveBeenCalled();
    });

    it('deactivates every view once the reset is confirmed', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      dialogButton(el, 'Yes').click();
      await el.updateComplete;

      expect(handleDatabaseViews).toHaveBeenCalledWith(
        store.getState().databases.views,
        activeViews,
        'testdb',
        schemaData,
        false,
        expect.any(Function),
        ['Mike'],
      );
      expect(el.resetAllViews).toBe(false);
    });

    it('leaves the views alone when the reset is declined', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      dialogButton(el, 'No').click();
      await el.updateComplete;

      expect(handleDatabaseViews).not.toHaveBeenCalled();
      expect(el.resetAllViews).toBe(false);
    });

    it('closes the reset dialog from its header button', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      el.shadowRoot!.querySelector('keep-form-dialog-header')!.dispatchEvent(
        new CustomEvent('header-close', { bubbles: true, composed: true }),
      );
      await el.updateComplete;

      expect(el.resetAllViews).toBe(false);
      expect(handleDatabaseViews).not.toHaveBeenCalled();
    });

    it('can be asked again after Escape, which the React version could not', async () => {
      // The flag the original opened from was never cleared by Escape, and setting a true
      // flag to true is not a change — so the effect that called showModal() never ran
      // again and the confirmation could not be reopened for the life of the tab.
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;

      dialogOf(el).dispatchEvent(new Event('cancel'));
      await el.updateComplete;
      expect(el.resetAllViews).toBe(false);

      bulkButton(el, 'deactivate').click();
      await el.updateComplete;
      expect(el.resetAllViews).toBe(true);
      expect(showModal()).toHaveBeenCalledTimes(2);
    });

    it('does not reopen a dialog that is already open', async () => {
      const el = await mount();
      bulkButton(el, 'deactivate').click();
      await el.updateComplete;
      // jsdom's showModal() is a stub that leaves `open` alone. Setting it is what makes
      // the next render see an already-open dialog — showModal() on one throws
      // InvalidStateError in a browser.
      dialogOf(el).open = true;
      el.requestUpdate();
      await el.updateComplete;

      expect(showModal()).toHaveBeenCalledTimes(1);
    });

    it('is disabled while there is nothing to activate', async () => {
      store.dispatch(setViews({ views: [] }));
      const el = await mount();
      expect(bulkButton(el, 'activate').disabled).toBe(true);
      expect(bulkButton(el, 'deactivate').disabled).toBe(true);
    });

    it('is disabled while a save is in flight', async () => {
      const el = await mount();
      expect(bulkButton(el, 'activate').disabled).toBe(false);

      store.dispatch(setApiLoading(true));
      await el.updateComplete;

      expect(bulkButton(el, 'activate').disabled).toBe(true);
      expect(bulkButton(el, 'deactivate').disabled).toBe(true);
    });
  });

  describe('the table’s events', () => {
    it('activates one view from the row switch', async () => {
      const el = await mount();
      const view = { viewName: 'Alpha', viewUnid: 'u-alpha' };

      await fromTable(el, 'view-activate', { view });

      expect(handleDatabaseViews).toHaveBeenCalledWith(
        [view],
        activeViews,
        'testdb',
        schemaData,
        true,
        expect.any(Function),
        ['Mike'],
      );
    });

    it('deactivates one view from the row switch', async () => {
      const el = await mount();
      const view = { viewName: 'Zulu', viewUnid: 'u-zulu' };

      await fromTable(el, 'view-deactivate', { view });

      expect(handleDatabaseViews.mock.calls[0][0]).toEqual([view]);
      expect(handleDatabaseViews.mock.calls[0][4]).toBe(false);
    });

    it('consumes the toggle events rather than leaking them to its own consumer', async () => {
      // Both are composed, so without stopPropagation they would surface on this host too
      // and a parent would see an interaction this element has already handled.
      const el = await mount();
      const heard: string[] = [];
      for (const name of ['view-activate', 'view-deactivate']) {
        el.addEventListener(name, () => heard.push(name));
      }

      await fromTable(el, 'view-activate', { view: { viewName: 'Alpha' } });
      await fromTable(el, 'view-deactivate', { view: { viewName: 'Zulu' } });

      expect(heard).toEqual([]);
    });

    it('consumes the search event too', async () => {
      const el = await mount();
      const heard: string[] = [];
      el.addEventListener('search-change', () => heard.push('search-change'));

      await search(el, 'zu');

      expect(heard).toEqual([]);
    });

    it('re-emits view-open once, so the React host can hear it', async () => {
      const el = await mount();
      const seen: KeepViewsTabViewOpenDetail[] = [];
      document.addEventListener('view-open', (event) =>
        seen.push((event as CustomEvent<KeepViewsTabViewOpenDetail>).detail),
      );

      await fromTable(el, 'view-open', { viewName: 'Zulu', active: true });

      expect(seen).toEqual([{ viewName: 'Zulu', active: true }]);
    });

    it('passes an inactive view through unchanged, so the parent closes the panel', async () => {
      const el = await mount();
      const seen: KeepViewsTabViewOpenDetail[] = [];
      el.addEventListener('view-open', (event) =>
        seen.push((event as CustomEvent<KeepViewsTabViewOpenDetail>).detail),
      );

      await fromTable(el, 'view-open', { viewName: 'Alpha', active: false });

      expect(seen).toEqual([{ viewName: 'Alpha', active: false }]);
    });
  });

  describe('the schema sink', () => {
    it('re-emits what the save returns, rather than taking a setter prop', async () => {
      const el = await mount();
      const seen: unknown[] = [];
      el.addEventListener('schema-change', (event) =>
        seen.push((event as CustomEvent<{ schemaData: unknown }>).detail.schemaData),
      );

      bulkButton(el, 'activate').click();
      const sink = handleDatabaseViews.mock.calls[0][5] as (data: unknown) => void;
      sink({ schemaName: 'saved' });

      expect(seen).toEqual([{ schemaName: 'saved' }]);
    });
  });

  describe('accessibility (#713)', () => {
    it('makes both bulk affordances real buttons that cannot submit a form', async () => {
      const el = await mount();
      for (const name of ['activate', 'deactivate']) {
        expect(bulkButton(el, name).tagName).toBe('BUTTON');
        expect(bulkButton(el, name).type).toBe('button');
      }
    });

    it('puts the bulk buttons in the keyboard focus order', async () => {
      const el = await mount();
      const button = bulkButton(el, 'deactivate');
      button.focus();
      expect(el.shadowRoot!.activeElement).toBe(button);
    });

    it('hides the decorative rule between them', async () => {
      const el = await mount();
      expect(el.shadowRoot!.querySelector('.divider')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('names and describes the reset dialog', async () => {
      // The heading lives inside keep-form-dialog-header's shadow root, so an IDREF cannot
      // reach it and the name is spelt out on the dialog.
      const el = await mount();
      const dialog = dialogOf(el);
      expect(dialog.getAttribute('aria-label')).toBe('Reset ALL View Columns?');
      const describedBy = dialog.getAttribute('aria-describedby')!;
      expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain(
        'reset all columns',
      );
    });

    it('puts the dialog copy in a paragraph, not in an SVG tag', async () => {
      // The original used <text>, an SVG element in an HTML document, which the browser
      // treats as an unknown inline box.
      const el = await mount();
      expect(dialogOf(el).querySelector('p')).toBeTruthy();
      expect(dialogOf(el).querySelector('text')).toBeNull();
    });
  });

  describe('styling', () => {
    it('reads mode-aware tokens for the two bulk colours', () => {
      // Both literals were dark steps chosen against a white page: roughly 2.9:1 and 2.5:1
      // on the dark surface, so neither cleared AA in dark mode.
      expect(styleText).toMatch(/\.activate\s*\{[^}]*var\(--keep-color-success-text\)/);
      expect(styleText).toMatch(/\.deactivate\s*\{[^}]*var\(--keep-color-danger-text\)/);
      expect(styleText).not.toContain('087251');
      expect(styleText).not.toContain('aa1f51');
    });

    it('reads surface tokens for the views panel, which was a white literal', () => {
      expect(styleText).toMatch(
        /\.view-panel\s*\{[^}]*var\(--wa-color-surface-raised\)[^}]*var\(--wa-color-surface-border\)/,
      );
      expect(styleText).not.toContain('#FFFFFF');
      expect(styleText).not.toContain('#B9B9B9');
    });

    it('restates the dialog chrome and its backdrop, which no global sheet can reach', () => {
      // Background, colour and the backdrop all arrive through bare `dialog` selectors.
      expect(styleText).toContain('dialog::backdrop');
      expect(styleText).toMatch(/dialog\s*\{[^}]*var\(--wa-color-surface-raised\)/);
      expect(styleText).toMatch(/dialog\[open\]\s*\{[^}]*display:\s*flex/);
    });

    it('carries no light/dark literal, which #708 forbids in an element', () => {
      expect(styleText).not.toContain('light-dark(');
    });

    it('restates the box-sizing reset, which a universal selector cannot cross', () => {
      expect(styleText).toMatch(/box-sizing:\s*border-box/);
      expect(styleText).not.toMatch(/box-sizing:\s*inherit/);
    });
  });
});
