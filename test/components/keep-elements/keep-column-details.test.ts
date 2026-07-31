/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-column-details';
import type ColumnDetails from '../../../src/components/keep-elements/keep-column-details';
import type {
  KeepColumnDetailsColumn,
  KeepColumnEditDetail,
  KeepColumnRemoveDetail,
} from '../../../src/components/keep-elements/keep-column-details';
import ColumnDetailsClass from '../../../src/components/keep-elements/keep-column-details';

const TAG = 'keep-column-details';

const columns: KeepColumnDetailsColumn[] = [
  { name: 'FirstName', externalName: 'first_name' },
  { name: 'LastName', externalName: 'last_name' },
];

const mount = (chosen: KeepColumnDetailsColumn[] = columns) =>
  mountLit<ColumnDetails>(TAG, { columns: chosen });

/** Everything lives in the shadow root now, so every read starts there. */
const table = (el: ColumnDetails) => el.shadowRoot!.querySelector('table')!;

const headerLabels = (el: ColumnDetails) =>
  Array.from(el.shadowRoot!.querySelectorAll('thead th, thead td')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );

const bodyRows = (el: ColumnDetails) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr'));

const cellTexts = (row: HTMLTableRowElement) =>
  Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() ?? '');

const inputs = (el: ColumnDetails) =>
  Array.from(el.shadowRoot!.querySelectorAll('wa-input')) as Array<HTMLElement & { value: string }>;

const deleteButtons = (el: ColumnDetails) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.delete-button'));

/** The whole `static styles` group as text, for the rules the suite cannot compute. */
const styleText = (
  ColumnDetailsClass as unknown as { styles: Array<{ cssText: string }> }
).styles
  .map((sheet) => sheet.cssText)
  .join('\n');

/** Type into a field the way the element sees it: set the value, fire `input`. */
const type = (field: HTMLElement & { value: string }, value: string) => {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

describe('keep-column-details — structure', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('starts with no columns', async () => {
    const el = await mountLit<ColumnDetails>(TAG);
    expect(el.columns).toEqual([]);
    expect(bodyRows(el)).toHaveLength(0);
  });

  it('labels the columns', async () => {
    const el = await mount();
          // The control column's header is named rather than blank (#713). It was empty, so a
      // screen reader moving across the header row announced nothing for it and the cells
      // under it had no column name to be associated with. The name is visually hidden — the
      // column still looks unlabelled, which is the design.
expect(headerLabels(el)).toEqual(['Actions', 'Column Name', 'External Name']);
  });

  it('names the table for assistive tech', async () => {
    const el = await mount();
    expect(table(el).getAttribute('aria-label')).toBe('edit columns table');
  });

  it('renders one row per chosen column, in order', async () => {
    const el = await mount();
    const rows = bodyRows(el);
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0])[1]).toBe('FirstName');
    expect(cellTexts(rows[1])[1]).toBe('LastName');
  });

  it('renders no body rows when nothing is chosen', async () => {
    const el = await mount([]);
    expect(bodyRows(el)).toHaveLength(0);
  });

  it('shows the current external name as the field placeholder', async () => {
    const el = await mount();
    expect(inputs(el).map((field) => field.getAttribute('placeholder'))).toEqual([
      'first_name',
      'last_name',
    ]);
  });

  it('leaves the field uncontrolled, as the form control it replaces was', async () => {
    // Binding `.value` would let the React bridge overwrite half-typed input on every
    // parent render — it re-applies every property with no dirty check.
    const el = await mount();
    expect(inputs(el)).toHaveLength(2);
    expect(inputs(el).every((field) => !field.hasAttribute('value'))).toBe(true);
  });

  it('adopts the slotted-table sheet, which a document sheet cannot reach in here', () => {
    // `keep-data-table` styles its slotted table from a document-level sheet. The table is
    // now inside this element's shadow root, where that sheet does not apply.
    expect(styleText).toContain('keep-data-table td');
    expect(styleText).toContain('keep-data-table thead th');
  });
});

describe('keep-column-details — interaction', () => {
  afterEach(cleanupLit);

  it('reports an edited external name with its column', async () => {
    const el = await mount();
    const edits: KeepColumnEditDetail[] = [];
    el.addEventListener('column-edit', (event) =>
      edits.push((event as CustomEvent<KeepColumnEditDetail>).detail),
    );

    type(inputs(el)[0], 'given');

    expect(edits).toHaveLength(1);
    // By reference: the parent reads `.name` and `.title` off the object it handed down.
    expect(edits[0].column).toBe(columns[0]);
    expect(edits[0].externalName).toBe('given');
  });

  it('asks to remove the column whose delete control was activated', async () => {
    const el = await mount();
    const removed: KeepColumnRemoveDetail[] = [];
    el.addEventListener('column-remove', (event) =>
      removed.push((event as CustomEvent<KeepColumnRemoveDetail>).detail),
    );

    deleteButtons(el)[1].click();

    expect(removed).toEqual([{ name: 'LastName' }]);
  });

  it('bubbles both events out of the shadow root, so the React host can hear them', async () => {
    const el = await mount();
    const seen: string[] = [];
    document.addEventListener('column-remove', () => seen.push('column-remove'));
    document.addEventListener('column-edit', () => seen.push('column-edit'));

    deleteButtons(el)[0].click();
    type(inputs(el)[0], 'x');

    expect(seen).toEqual(['column-remove', 'column-edit']);
  });

  it('keeps a row field with its column when an earlier row is removed', async () => {
    // Rows are keyed on `column.name`. With positional reuse a half-typed external name
    // would stay put and end up attached to a different column.
    const el = await mount();
    const lastNameField = inputs(el)[1];
    lastNameField.value = 'half typed';

    el.columns = [columns[1]];
    await el.updateComplete;

    expect(inputs(el)).toHaveLength(1);
    expect(inputs(el)[0]).toBe(lastNameField);
    expect(inputs(el)[0].value).toBe('half typed');
  });
});

describe('keep-column-details — validation', () => {
  afterEach(cleanupLit);

  it('explains a duplicate external name', async () => {
    const el = await mount([{ name: 'FirstName', externalName: 'dup', error: 'duplicate' }]);
    const field = inputs(el)[0];
    expect(field.getAttribute('hint')).toBe('Cannot have duplicate external names!');
    expect(field.getAttribute('aria-invalid')).toBe('true');
  });

  it('announces that message, rather than only painting it red', async () => {
    // `hint` is what wa-input points the inner control's aria-describedby at (#743), which
    // is why the message goes there and not in a sibling node.
    const el = await mount([{ name: 'FirstName', externalName: 'dup', error: 'duplicate' }]);
    // `inputs()` types its result by what this file reads off it, which does not include
    // Lit's update hook — wa-input is a Lit element, so widening goes through `unknown`.
    const field = inputs(el)[0] as unknown as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await field.updateComplete;
    const native = field.shadowRoot!.querySelector('input')!;
    const describedBy = native.getAttribute('aria-describedby')!;
    expect(field.shadowRoot!.getElementById(describedBy)?.textContent).toContain(
      'Cannot have duplicate external names!',
    );
  });

  it('shows no message for an unrecognised error code', async () => {
    const el = await mount([{ name: 'FirstName', externalName: 'x', error: 'something-else' }]);
    expect(inputs(el)[0].getAttribute('hint')).toBe('');
  });

  it('still marks an unrecognised error code as invalid, as the original did', async () => {
    // The replaced control took `error` from the truthiness of the code and the message
    // from a lookup, so an unknown code was red with no explanation. Kept deliberately.
    const el = await mount([{ name: 'FirstName', externalName: 'x', error: 'something-else' }]);
    expect(inputs(el)[0].getAttribute('aria-invalid')).toBe('true');
  });

  it('shows no message when the column is clean', async () => {
    const el = await mount();
    expect(inputs(el).map((field) => field.getAttribute('hint'))).toEqual(['', '']);
    expect(inputs(el).map((field) => field.getAttribute('aria-invalid'))).toEqual([
      'false',
      'false',
    ]);
    expect(el.shadowRoot!.textContent).not.toMatch(/duplicate/i);
  });

  it('clears the message when the parent clears the error', async () => {
    const el = await mount([{ name: 'FirstName', externalName: 'dup', error: 'duplicate' }]);
    expect(inputs(el)[0].getAttribute('aria-invalid')).toBe('true');

    el.columns = [{ name: 'FirstName', externalName: 'dup', error: null }];
    await el.updateComplete;

    expect(inputs(el)[0].getAttribute('hint')).toBe('');
    expect(inputs(el)[0].getAttribute('aria-invalid')).toBe('false');
  });

  it('carries the invalid styling that the document sheet cannot reach in here', () => {
    // keep-overrides.css has this rule globally; a document sheet stops at the boundary.
    expect(styleText).toContain("wa-input[aria-invalid='true']::part(base)");
  });
});

/**
 * The replaced file put an `onClick` on a bare icon: not focusable, not reachable by
 * keyboard, no accessible name (WCAG 2.1.1, 4.1.2). The field beside it had no label
 * either, so its only name was whatever a browser inferred from the placeholder.
 * #718 recorded both and left them; the conversion is where they get fixed.
 */
describe('keep-column-details — accessibility (#713)', () => {
  afterEach(cleanupLit);

  it('makes the delete affordance a real button', async () => {
    const el = await mount();
    const buttons = deleteButtons(el);
    expect(buttons).toHaveLength(2);
    expect(buttons.map((button) => button.tagName)).toEqual(['BUTTON', 'BUTTON']);
    // Without type="button" a button inside a form defaults to submit.
    expect(buttons.map((button) => button.type)).toEqual(['button', 'button']);
  });

  it('names each delete button after the column it removes', async () => {
    const el = await mount();
    expect(deleteButtons(el).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove column FirstName',
      'Remove column LastName',
    ]);
  });

  it('leaves the trash glyph decorative, so the name is not announced twice', async () => {
    const el = await mount();
    const icons = Array.from(el.shadowRoot!.querySelectorAll('wa-icon'));
    expect(icons).toHaveLength(2);
    // Web Awesome renders an icon aria-hidden unless it is given a label of its own.
    expect(icons.every((icon) => !icon.hasAttribute('label'))).toBe(true);
  });

  it('puts the delete button in the keyboard focus order', async () => {
    const el = await mount();
    const button = deleteButtons(el)[1];
    button.focus();
    expect(el.shadowRoot!.activeElement).toBe(button);
  });

  it('gives the external-name field a real label', async () => {
    const el = await mount();
    expect(inputs(el).map((field) => field.getAttribute('label'))).toEqual([
      'External name for FirstName',
      'External name for LastName',
    ]);
  });

  it('hides that label visually rather than removing it from the a11y tree', async () => {
    // display:none would take the label out of the accessibility tree with the pixels.
    expect(styleText).toContain('wa-input::part(label)');
    expect(styleText).not.toMatch(/wa-input::part\(label\)\s*\{[^}]*display:\s*none/);
  });

  it('marks the header cells as column headers', async () => {
    const el = await mount();
    expect(
      Array.from(el.shadowRoot!.querySelectorAll('thead th')).map((cell) =>
        cell.getAttribute('scope'),
      ),
    ).toEqual(['col', 'col', 'col']);
  });
});
