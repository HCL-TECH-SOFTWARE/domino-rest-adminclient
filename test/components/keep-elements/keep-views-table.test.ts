/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { closeSnackbar } from '../../../src/store/alerts/action';
import { setApiLoading } from '../../../src/store/dialog/action';
import { setFolders } from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-views-table';
import ViewsTableClass from '../../../src/components/keep-elements/keep-views-table';
import type ViewsTable from '../../../src/components/keep-elements/keep-views-table';
import type {
  KeepViewOpenDetail,
  KeepViewsTableRow,
  KeepViewsTableToggleDetail,
} from '../../../src/components/keep-elements/keep-views-table';

const TAG = 'keep-views-table';

/**
 * The element test for what used to be `forms/ViewsTable.tsx`.
 *
 * Every assertion its `@testing-library/react` suite made has a home here, read out of the
 * shadow root instead of the document. Two things it could only reach indirectly are
 * asserted directly now: the alert for an inactive view lands in the store rather than in a
 * mocked action creator, and the activation events are watched on the host rather than
 * inferred from a callback prop.
 */
const views: KeepViewsTableRow[] = [
  { viewName: 'ActiveView', viewAlias: ['av', 'av2'], viewActive: true, viewUpdated: false },
  { viewName: 'InactiveView', viewAlias: [], viewActive: false, viewUpdated: false },
];

describe('keep-views-table', () => {
  const reset = () => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch(closeSnackbar());
  };

  beforeEach(reset);

  afterEach(() => {
    cleanupLit();
    reset();
  });

  const mount = (list: KeepViewsTableRow[] = views) => mountLit<ViewsTable>(TAG, { views: list });

  const headerCells = (el: ViewsTable) =>
    Array.from(el.shadowRoot!.querySelectorAll('thead th, thead td'));

  const headerLabels = (el: ViewsTable) =>
    headerCells(el).map((cell) => cell.textContent?.trim() ?? '');

  const bodyRows = (el: ViewsTable) =>
    Array.from(el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr'));

  const cellTexts = (row: HTMLTableRowElement) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() ?? '');

  const editButtons = (el: ViewsTable) =>
    Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.edit-button'));

  /** Every tooltip's live `content`. It is not reflected, so the attribute is never set. */
  const tipTexts = (el: ViewsTable) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-tooltip')).map(
      (tip) => (tip as unknown as { content?: string }).content ?? '',
    );

  /** Records `view-open`, so "emitted nothing" is assertable rather than assumed. */
  const listenOpen = (el: ViewsTable) => {
    const calls: KeepViewOpenDetail[] = [];
    el.addEventListener('view-open', (event) =>
      calls.push((event as CustomEvent<KeepViewOpenDetail>).detail),
    );
    return calls;
  };

  /** The whole `static styles` group as text, for the rules the suite cannot compute. */
  const styleText = (ViewsTableClass as unknown as { styles: Array<{ cssText: string }> }).styles
    .map((sheet) => sheet.cssText)
    .join('\n');

  describe('structure', () => {
    it('registers the custom element', () => {
      expect(customElements.get(TAG)).toBeTruthy();
    });

    it('starts with no views', async () => {
      const el = await mountLit<ViewsTable>(TAG);
      expect(el.views).toEqual([]);
      expect(bodyRows(el)).toHaveLength(0);
    });

    it('labels the columns, including a hidden name above the edit buttons', async () => {
      const el = await mount();
      // The control column's header is named rather than blank (#713). It was empty, so a
      // screen reader moving across the header row announced nothing for it and the cells
      // under it had no column name to be associated with. The name is visually hidden — the
      // column still looks unlabelled, which is the design.
      expect(headerLabels(el)).toEqual(['Actions', 'View Name', 'Alias', 'Status']);
    });

    it('marks the header cells as column headers', async () => {
      const el = await mount();
      expect(headerCells(el).map((cell) => cell.getAttribute('scope'))).toEqual([
        'col',
        'col',
        'col',
        'col',
      ]);
    });

    it('names the table for assistive tech', async () => {
      // Was "views and agents table" — the same string on all three tables, naming none of
      // them. Each says what it is now.
      const el = await mount();
      expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-label')).toBe(
        'views table',
      );
    });

    it('renders one row per view, in order', async () => {
      const el = await mount();
      const rows = bodyRows(el);
      expect(rows).toHaveLength(2);
      expect(cellTexts(rows[0])[1]).toBe('ActiveView');
      expect(cellTexts(rows[1])[1]).toBe('InactiveView');
    });

    it('explains the Status column', async () => {
      const el = await mount([]);
      expect(tipTexts(el)).toEqual([
        'Activate the Views that should be accessible\nvia rest API',
      ]);
    });
  });

  describe('the alias column', () => {
    it('shows the first alias only', async () => {
      // ActiveView has two aliases; the cell must show only the first — a fixture with a
      // single alias could not tell "first" apart from "all, joined".
      const el = await mount();
      expect(cellTexts(bodyRows(el)[0])[2]).toBe('av');
    });

    it('lists every alias in the tooltip', async () => {
      const el = await mount([views[0]]);
      expect(tipTexts(el)).toContain('av\nav2');
    });

    it('shows no alias for a view with an empty list', async () => {
      const el = await mount();
      const row = bodyRows(el)[1];
      // Pin the length guard on InactiveView's own cell, not by checking that ActiveView's
      // alias failed to leak into this row — which is true regardless.
      expect(cellTexts(row)[2]).toBe('');
      expect(row.querySelectorAll('td')[1].querySelector('keep-tooltip')).toBeNull();
    });

    it('shows no alias when the field is absent', async () => {
      const el = await mount([{ viewName: 'NoAlias', viewActive: true }]);
      expect(cellTexts(bodyRows(el)[0])[2]).toBe('');
    });

    it('treats a bare-string alias as one alias, not as its first letter', async () => {
      // The original indexed `viewAlias[0]` without checking the type, so a scalar alias
      // rendered as a single character while its tooltip showed the whole string. The
      // fetchers normalise to an array, so this branch never fired in production — it is
      // fixed rather than preserved because preserving it means keeping a bug nothing
      // depends on.
      const el = await mount([{ viewName: 'Scalar', viewAlias: 'solo', viewActive: true }]);
      expect(cellTexts(bodyRows(el)[0])[2]).toBe('solo');
      expect(tipTexts(el)).toContain('solo');
    });
  });

  describe('a view that changed while active', () => {
    it('bolds the name and marks it', async () => {
      const el = await mount([{ ...views[0], viewUpdated: true }]);
      expect(bodyRows(el)[0].querySelector('b')?.textContent).toBe('ActiveView');
      expect(tipTexts(el)).toContain('A change was made in this view.');
    });

    it('does not bold a view that changed while inactive', async () => {
      const el = await mount([{ ...views[1], viewUpdated: true }]);
      expect(bodyRows(el)[0].querySelector('b')).toBeNull();
      expect(tipTexts(el)).not.toContain('A change was made in this view.');
    });
  });

  describe('opening a view', () => {
    it('opens an active view by name', async () => {
      const el = await mount();
      const calls = listenOpen(el);

      editButtons(el)[0].click();

      expect(calls).toEqual([{ viewName: 'ActiveView', active: true }]);
      expect(store.getState().alert.visible).toBe(false);
    });

    it('refuses to open an inactive view and says why', async () => {
      const el = await mount();
      const calls = listenOpen(el);

      editButtons(el)[1].click();

      expect(calls).toEqual([{ viewName: 'InactiveView', active: false }]);
      expect(store.getState().alert).toMatchObject({
        visible: true,
        message: 'Please activate this view before editing it!',
      });
    });

    it('bubbles the event out of the shadow root, so the React host can hear it', async () => {
      const el = await mount();
      const seen: KeepViewOpenDetail[] = [];
      document.addEventListener('view-open', (event) =>
        seen.push((event as CustomEvent<KeepViewOpenDetail>).detail),
      );

      editButtons(el)[0].click();

      expect(seen).toHaveLength(1);
    });

    it('disables the edit buttons while a save is in flight', async () => {
      const el = await mount();
      expect(editButtons(el).map((button) => button.disabled)).toEqual([false, false]);

      store.dispatch(setApiLoading(true));
      await el.updateComplete;

      expect(editButtons(el).map((button) => button.disabled)).toEqual([true, true]);
    });
  });

  describe('folders', () => {
    it('marks a view that is really a folder', async () => {
      store.dispatch(setFolders({ folders: [{ viewName: 'ActiveView' }] }));
      const el = await mount();
      expect(tipTexts(el)).toContain('ActiveView is a folder.');
    });

    it('leaves an ordinary view unmarked', async () => {
      const el = await mount();
      expect(tipTexts(el).join(' ')).not.toContain('is a folder');
    });

    it('re-reads the folder list when the store changes', async () => {
      const el = await mount();
      expect(tipTexts(el).join(' ')).not.toContain('is a folder');

      store.dispatch(setFolders({ folders: [{ viewName: 'InactiveView' }] }));
      await el.updateComplete;

      expect(tipTexts(el)).toContain('InactiveView is a folder.');
    });
  });

  describe('activation', () => {
    const switchIn = async (el: ViewsTable, index: number) => {
      const control = bodyRows(el)[index].querySelector('keep-activate-switch') as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
      await control.updateComplete;
      return control;
    };

    it('hands each row record to its own switch', async () => {
      const el = await mount();
      const control = (await switchIn(el, 0)) as unknown as { view: KeepViewsTableRow };
      expect(control.view).toBe(views[0]);
    });

    it('re-emits the switch toggle as its own event, carrying the row record', async () => {
      const el = await mount();
      const calls: Array<{ type: string; detail: KeepViewsTableToggleDetail }> = [];
      for (const name of ['view-activate', 'view-deactivate']) {
        el.addEventListener(name, (event) =>
          calls.push({
            type: name,
            detail: (event as CustomEvent<KeepViewsTableToggleDetail>).detail,
          }),
        );
      }

      const control = await switchIn(el, 1);
      control.shadowRoot!.querySelector<HTMLButtonElement>('button.toggle-container')!.click();

      expect(calls).toHaveLength(1);
      expect(calls[0].type).toBe('view-activate');
      expect(calls[0].detail.view).toBe(views[1]);
    });

    it('stops the switch event, so a consumer hears one toggle and not two', async () => {
      // The switch emits composed, so without stopPropagation the original would surface on
      // this host alongside the re-emitted one. Deleting the stopPropagation fails this.
      const el = await mount();
      const heard: string[] = [];
      for (const name of ['toggle-active', 'toggle-inactive', 'view-activate']) {
        el.addEventListener(name, () => heard.push(name));
      }

      const control = await switchIn(el, 1);
      control.shadowRoot!.querySelector<HTMLButtonElement>('button.toggle-container')!.click();

      expect(heard).toEqual(['view-activate']);
    });

    it('keeps a row with its view when the list is re-sorted', async () => {
      // Rows are keyed on the view name. The switch seeds its pill once and never re-reads
      // the record, so positional reuse would leave an "Active" pill sitting on a row that
      // now belongs to a different, inactive view.
      const el = await mount();
      const first = await switchIn(el, 0);

      el.views = [views[1], views[0]];
      await el.updateComplete;

      expect(bodyRows(el)[1].querySelector('keep-activate-switch')).toBe(first);
    });
  });

  describe('styling', () => {
    it('adopts the slotted-table sheet, which a document sheet cannot reach in here', () => {
      // `keep-data-table` styles its slotted table from a document-level sheet. The table
      // is inside this element's shadow root, where that sheet does not apply.
      expect(styleText).toContain('keep-data-table td');
      expect(styleText).toContain('keep-data-table thead th');
      expect(styleText).toContain('keep-data-table[zebra] tbody tr:nth-of-type(odd)');
    });

    it('stripes the rows, as the table it replaces did', async () => {
      const el = await mount();
      expect(el.shadowRoot!.querySelector('keep-data-table')!.hasAttribute('zebra')).toBe(true);
    });

    it('colours the changed marker from a token, not a hardcoded pair', () => {
      // The global rule this replaces was a blue/light, green/dark literal — the dark half
      // sat near 3.4:1 on the dark surface. A class cannot cross the boundary anyway.
      expect(styleText).toMatch(/\.changed-marker\s*\{[^}]*var\(--keep-text-brand\)/);
    });

    it('puts the header trigger on one line, which the original rule never did', () => {
      // It was written as a descendant combinator that could not match: the inner node's
      // parent is the tooltip element, not the div the selector expected.
      expect(styleText).toMatch(/\.status-trigger\s*\{[^}]*display:\s*inline-flex/);
    });
  });

  describe('accessibility (#713)', () => {
    it('makes the edit affordance a real button', async () => {
      const el = await mount();
      const buttons = editButtons(el);
      expect(buttons).toHaveLength(2);
      expect(buttons.map((button) => button.tagName)).toEqual(['BUTTON', 'BUTTON']);
      // Without type="button" a button inside a form defaults to submit.
      expect(buttons.map((button) => button.type)).toEqual(['button', 'button']);
    });

    it('names each edit button after what it does, not only after the view', async () => {
      const el = await mount();
      expect(editButtons(el).map((button) => button.getAttribute('aria-label'))).toEqual([
        'Edit view ActiveView',
        'Edit view InactiveView',
      ]);
    });

    it('keeps the view name as the hover title, as before', async () => {
      const el = await mount();
      expect(editButtons(el).map((button) => button.getAttribute('title'))).toEqual([
        'ActiveView',
        'InactiveView',
      ]);
    });

    it('leaves the pencil decorative, so the name is not announced twice', async () => {
      const el = await mount();
      const pencils = Array.from(el.shadowRoot!.querySelectorAll('wa-icon.edit-icon'));
      expect(pencils).toHaveLength(2);
      // Web Awesome renders an icon aria-hidden unless it is given a label of its own.
      expect(pencils.every((icon) => !icon.hasAttribute('label'))).toBe(true);
    });

    it('puts the edit button in the keyboard focus order', async () => {
      const el = await mount();
      const button = editButtons(el)[1];
      button.focus();
      expect(el.shadowRoot!.activeElement).toBe(button);
    });

    it('marks the edit cell as a row header, as the markup it replaces did', async () => {
      const el = await mount();
      expect(bodyRows(el)[0].querySelector('th')!.getAttribute('scope')).toBe('row');
    });

    it('resolves every glyph through the registered library, never the CDN', async () => {
      const el = await mount([{ ...views[0], viewUpdated: true }]);
      const icons = Array.from(el.shadowRoot!.querySelectorAll('wa-icon'));
      expect(icons.length).toBeGreaterThan(2);
      expect(icons.every((icon) => icon.getAttribute('library') === 'fa')).toBe(true);
    });
  });
});
