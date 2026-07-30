/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { loadAppIcons, resetAppIconsForTest } from '../../../src/services/app-icons';
import { updateSchema } from '../../../src/store/databases/action';
import '../../../src/components/keep-elements/keep-details-section';
import type DetailsSection from '../../../src/components/keep-elements/keep-details-section';

/**
 * The element test for what used to be `forms/DetailsSection.tsx`.
 *
 * That component had **no test of any kind** — no `@testing-library/react` suite, no
 * snapshot, nothing under `test/` naming it. So nothing is carried over here and everything
 * below is new cover for behaviour that shipped untested: the save payload, the
 * discard/reset flow, the two-stage dialog handover and the five configuration rows.
 *
 * Three of these assertions pin defects rather than intentions. They are marked where they
 * appear, and each says what the correct behaviour would be, so a future repair fails here
 * loudly instead of looking like a regression.
 */

vi.mock('../../../src/store/databases/action', () => ({
  updateSchema: vi.fn(() => ({ type: 'NOOP' }))
}));

/**
 * Stands in for the 221 KB of base64 behind the lazily loaded payload chunk (#772).
 *
 * Only `beach` is present, on purpose: the save path resolves the picked icon's bytes and
 * falls back to the schema's stored copy when the payload is missing, and a map with a hole
 * in it is the only way to reach that branch.
 */
vi.mock('../../../src/styles/app-icons', () => ({ default: { beach: 'QkVBQ0g=' } }));

const TAG = 'keep-details-section';

const shadow = (el: DetailsSection) => el.shadowRoot!;
const one = (el: DetailsSection, selector: string) => shadow(el).querySelector(selector);
const all = (el: DetailsSection, selector: string) => [...shadow(el).querySelectorAll(selector)];
const textOf = (el: DetailsSection, selector: string) => one(el, selector)?.textContent?.trim() ?? '';

const editDialog = (el: DetailsSection) => one(el, 'dialog.edit') as HTMLDialogElement;
const discardDialog = (el: DetailsSection) => one(el, 'dialog.discard') as HTMLDialogElement;
const pencil = (el: DetailsSection) => one(el, 'button.edit-icon') as HTMLButtonElement;
const expander = (el: DetailsSection) => one(el, 'button.expander') as HTMLButtonElement | null;
const rows = (el: DetailsSection) => all(el, '.config-line');
const toggles = (el: DetailsSection) =>
  all(el, 'wa-switch.config-toggle') as (HTMLElement & { checked: boolean })[];
const textarea = (el: DetailsSection) => one(el, '#schema-description') as HTMLTextAreaElement;
const formulaField = (el: DetailsSection) => one(el, '#dql-formula') as HTMLElement & { value: string };

/** The buttons of one dialog, in document order. */
const buttons = (dialog: HTMLDialogElement) =>
  [...dialog.querySelectorAll('keep-button')] as HTMLElement[];

const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const closeDialog = () => vi.mocked(HTMLDialogElement.prototype.close);

/** The label and glyph of one configuration row, as a reader sees them. */
const rowState = (row: Element) => ({
  label: row.querySelector('.config-label')!.textContent!.trim(),
  greyed: row.querySelector('.config-label')!.classList.contains('label-unchecked'),
  icon: row.querySelector('wa-icon')!.getAttribute('name'),
  iconLabel: row.querySelector('wa-icon')!.getAttribute('label')
});

const makeSchema = (overrides: Record<string, unknown> = {}): any => ({
  '@unid': 'unid-1',
  apiName: 'testapi',
  schemaName: 'testdb',
  description: 'A short description',
  nsfPath: 'test.nsf',
  icon: 'STORED_ICON_BYTES',
  iconName: 'beach',
  formulaEngine: 'domino',
  dqlFormula: { formulaType: 'domino', formula: '@All' },
  requireRevisionToUpdate: false,
  isActive: 'true',
  owners: ['owner-one', 'owner-two'],
  isModeFetch: false,
  modes: [],
  openAccess: true,
  allowCode: true,
  dqlAccess: true,
  allowDecryption: true,
  forms: [
    { formName: 'Configured', alias: [], formModes: [{ modeName: 'default' }] },
    { formName: 'Unconfigured', alias: [], formModes: [] }
  ],
  configuredForms: [],
  views: ['ViewA'],
  agents: ['AgentA'],
  ...overrides
});

/** A schema whose four access flags have not arrived yet. */
const pendingSchema = () =>
  makeSchema({ openAccess: null, dqlAccess: null, allowCode: null, allowDecryption: null });

const mount = (props: Partial<DetailsSection> = {}) =>
  mountLit<DetailsSection>(TAG, {
    dbName: 'testdb',
    schemaData: makeSchema(),
    scopes: [],
    ...props
  } as Partial<DetailsSection>);

/** Open the Edit Schema dialog through the control a user would press. */
const openEditor = async (el: DetailsSection) => {
  pencil(el).click();
  await el.updateComplete;
};

/** The payload the save handed to the update thunk. */
const savedPayload = () => vi.mocked(updateSchema).mock.calls[0][0] as Record<string, unknown>;

/** The callback the update thunk was given, which refreshes the consumer's copy. */
const savedCallback = () => vi.mocked(updateSchema).mock.calls[0][1] as (data: unknown) => void;

const emitted = (el: DetailsSection, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (event) => seen.push(event as CustomEvent));
  return seen;
};

describe('keep-details-section', () => {
  beforeEach(async () => {
    resetAppIconsForTest();
    // The request body carries the icon bytes next to the name, and they live behind a
    // dynamic import. Landing them up front is what `index.tsx` does at boot.
    await loadAppIcons();
  });

  afterEach(() => {
    cleanupLit();
    vi.clearAllMocks();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- the title block -----------------------------------------------------------------

  it('shows the schema name and its database path', async () => {
    const el = await mount();
    expect(textOf(el, '.api-schema')).toBe('testdb');
    expect(textOf(el, '.api-nsf')).toBe('test.nsf');
    expect(one(el, 'keep-app-icon')!.getAttribute('name')).toBe('beach');
  });

  it('reports a schema no scope points at', async () => {
    const el = await mount();
    const dot = one(el, '.status-dot')!;
    expect(dot.classList.contains('not-in-use')).toBe(true);
    // role="img" with a name, because the dot is the only indication of this state and a
    // tooltip is not an accessible name (WCAG 1.1.1). The original had neither.
    expect(dot.getAttribute('role')).toBe('img');
    expect(dot.getAttribute('aria-label')).toBe('Not used by Scopes');
    expect(one(el, 'keep-tooltip')!.getAttribute('content')).toBe('Not used by Scopes');
  });

  it('reports a schema a scope points at', async () => {
    const el = await mount({ scopes: [{ nsfPath: 'test.nsf', schemaName: 'testdb' }] });
    const dot = one(el, '.status-dot')!;
    expect(dot.classList.contains('in-use')).toBe(true);
    expect(dot.getAttribute('aria-label')).toBe('Used by Scopes');
  });

  it('matches a scope on the database and the schema together, not on either alone', async () => {
    const el = await mount({
      scopes: [
        { nsfPath: 'other.nsf', schemaName: 'testdb' },
        { nsfPath: 'test.nsf', schemaName: 'otherdb' }
      ]
    });
    expect(one(el, '.status-dot')!.classList.contains('not-in-use')).toBe(true);
  });

  it('opens the editor from a real button, so the pencil is reachable from the keyboard', async () => {
    // The original was a click-handling div: no role, no tabindex, no accessible name.
    const el = await mount();
    expect(pencil(el).tagName).toBe('BUTTON');
    expect(pencil(el).type).toBe('button');
    expect(pencil(el).getAttribute('aria-label')).toBe('Edit Schema');
  });

  // ---- the description -----------------------------------------------------------------

  it('shows a short description in full and offers no expander', async () => {
    const el = await mount();
    expect(textOf(el, '.description')).toBe('A short description');
    expect(expander(el)).toBeNull();
  });

  it('truncates a long description and expands it on request', async () => {
    const long = 'x'.repeat(400);
    const el = await mount({ schemaData: makeSchema({ description: long }) });

    expect(textOf(el, '.description')).toBe(`${'x'.repeat(180)}...`);
    expect(expander(el)!.textContent!.trim()).toContain('View More');
    expect(expander(el)!.getAttribute('aria-expanded')).toBe('false');
    expect(one(el, '.expander wa-icon')!.getAttribute('name')).toBe('chevron-down');

    expander(el)!.click();
    await el.updateComplete;

    expect(textOf(el, '.description')).toBe(long);
    expect(expander(el)!.textContent!.trim()).toContain('View Less');
    expect(expander(el)!.getAttribute('aria-expanded')).toBe('true');
    expect(one(el, '.expander wa-icon')!.getAttribute('name')).toBe('chevron-up');

    expander(el)!.click();
    await el.updateComplete;
    expect(textOf(el, '.description')).toBe(`${'x'.repeat(180)}...`);
  });

  // ---- the configuration summary -------------------------------------------------------

  it('waits on a spinner until the four access flags arrive', async () => {
    const el = await mount({ schemaData: pendingSchema() });
    expect(one(el, 'wa-spinner')).toBeTruthy();
    expect(one(el, '.list-config')).toBeNull();
  });

  it('re-seeds the edit buffer when the flags arrive after the first render', async () => {
    // The one staleness repair the original carried: a buffer seeded from a schema whose
    // flags were all null is replaced when a schema that has them takes its place.
    const el = await mount({ schemaData: pendingSchema() });
    el.schemaData = makeSchema();
    await el.updateComplete;

    expect(one(el, 'wa-spinner')).toBeNull();
    expect(rows(el)).toHaveLength(5);

    await openEditor(el);
    expect(toggles(el).map((toggle) => toggle.checked)).toEqual([true, true, true, false, true]);
  });

  it('renders one row per configuration flag, with the glyph naming its state', async () => {
    const el = await mount({
      schemaData: makeSchema({ dqlAccess: true, openAccess: false, allowCode: true })
    });
    const states = rows(el).map(rowState);

    expect(states.map((state) => state.label)).toEqual([
      'DQL Access',
      'In $DATA Scope',
      'Enable Code',
      'Require Revision',
      'Prevent Design Refresh'
    ]);
    expect(states.map((state) => state.icon)).toEqual([
      'circle-check',
      'ban',
      'circle-check',
      'ban',
      'circle-check'
    ]);
    // The glyphs were rendered aria-hidden, so each flag's state was conveyed by shape and
    // colour alone. Each carries its state as an accessible name now (WCAG 1.1.1).
    expect(states.map((state) => state.iconLabel)).toEqual([
      'Enabled',
      'Disabled',
      'Enabled',
      'Disabled',
      'Enabled'
    ]);
  });

  it('greys three captions from DQL Access rather than from their own flag', async () => {
    // A defect, pinned rather than repaired: "In $DATA Scope" and "Enable Code" take their
    // greyed-out styling from dqlAccess, so the caption and the glyph beside it can
    // disagree. Correct behaviour is for each caption to follow its own flag.
    const el = await mount({
      schemaData: makeSchema({ dqlAccess: false, openAccess: true, allowCode: true })
    });
    const states = rows(el).map(rowState);

    expect(states[1]).toMatchObject({ label: 'In $DATA Scope', icon: 'circle-check', greyed: true });
    expect(states[2]).toMatchObject({ label: 'Enable Code', icon: 'circle-check', greyed: true });
  });

  it.each([
    ['undefined', undefined, 'circle-check'],
    ['null', null, 'circle-check'],
    ['false', false, 'ban'],
    ['true', true, 'circle-check']
  ])('reads Prevent Design Refresh as %s', async (_name, value, glyph) => {
    const el = await mount({ schemaData: makeSchema({ prohibitRefresh: value }) });
    const state = rowState(rows(el)[4]);
    expect(state.icon).toBe(glyph);
    expect(state.greyed).toBe(glyph === 'ban');
  });

  it('falls back to the default formula when the schema carries none', async () => {
    const el = await mount({ schemaData: makeSchema({ dqlFormula: undefined }) });
    expect(textOf(el, '.formula-value')).toBe('@True');
  });

  it('shows the schema formula when there is one', async () => {
    const el = await mount();
    expect(textOf(el, '.formula-value')).toBe('@All');
  });

  it('shows the file path as its own section', async () => {
    const el = await mount();
    const headings = all(el, '.heading').map((node) => node.textContent!.trim());
    expect(headings).toEqual(['Description', 'File Path', 'Configuration']);
  });

  // ---- opening, cancelling and discarding ----------------------------------------------

  it('opens the editor modally and names it', async () => {
    const el = await mount();
    expect(showModal()).not.toHaveBeenCalled();

    await openEditor(el);

    expect(showModal()).toHaveBeenCalledTimes(1);
    // aria-label rather than aria-labelledby: the heading lives in the header element's own
    // shadow root and an IDREF cannot cross a shadow boundary (#713).
    expect(editDialog(el).getAttribute('aria-label')).toBe('Edit Schema');
    expect(one(el, 'keep-form-dialog-header')!.getAttribute('heading')).toBe('Edit Schema');
  });

  it('hands over to the discard dialog when Cancel is pressed', async () => {
    const el = await mount();
    await openEditor(el);

    const [cancel] = buttons(editDialog(el));
    expect(cancel.textContent!.trim()).toBe('Cancel');
    cancel.click();
    await el.updateComplete;

    // Two showModal calls: the editor's, then the discard dialog's. The discard dialog is
    // raised before the editor is closed so it is the last thing into the top layer.
    expect(showModal()).toHaveBeenCalledTimes(2);
    expect(closeDialog()).toHaveBeenCalled();
    expect(discardDialog(el).getAttribute('aria-label')).toBe('Discard Changes?');
  });

  it('hands over to the discard dialog from the header close button too', async () => {
    const el = await mount();
    await openEditor(el);

    const header = one(el, 'keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    await el.updateComplete;

    expect(showModal()).toHaveBeenCalledTimes(2);
  });

  it('keeps the edits when the discard dialog is answered No', async () => {
    const el = await mount();
    await openEditor(el);
    textarea(el).value = 'edited description';
    textarea(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    buttons(editDialog(el))[0].click();
    await el.updateComplete;

    const [no, yes] = buttons(discardDialog(el));
    expect([no.textContent!.trim(), yes.textContent!.trim()]).toEqual(['No', 'Yes']);
    const before = closeDialog().mock.calls.length;
    no.click();
    await el.updateComplete;

    expect(closeDialog().mock.calls.length).toBe(before + 1);
    expect(textarea(el).value).toBe('edited description');
  });

  it('throws the edits away when the discard dialog is answered Yes', async () => {
    const el = await mount();
    await openEditor(el);

    textarea(el).value = 'edited description';
    textarea(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    toggles(el)[0].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    one(el, 'keep-icon-dropdown')!.dispatchEvent(
      new CustomEvent('icon-select', {
        detail: { iconName: 'anchor' },
        bubbles: true,
        composed: true
      })
    );
    await el.updateComplete;

    buttons(editDialog(el))[0].click();
    await el.updateComplete;
    buttons(discardDialog(el))[1].click();
    await el.updateComplete;

    expect(textarea(el).value).toBe('A short description');
    expect(formulaField(el).value).toBe('@All');
    expect(one(el, 'keep-icon-dropdown')!.getAttribute('iconname')).toBeNull();
    expect((one(el, 'keep-icon-dropdown') as HTMLElement & { iconName: string }).iconName).toBe(
      'beach'
    );
    expect(toggles(el)[0].checked).toBe(true);
  });

  it('falls back to the default icon when the schema names one that does not exist', async () => {
    const el = await mount({ schemaData: makeSchema({ iconName: 'not-an-icon' }) });
    await openEditor(el);
    expect((one(el, 'keep-icon-dropdown') as HTMLElement & { iconName: string }).iconName).toBe(
      'beach'
    );
  });

  // ---- the form ------------------------------------------------------------------------

  it('gives the description field a real label, so the control has an accessible name', async () => {
    // The caption was a sibling `text` element, which names nothing (WCAG 3.3.2).
    const el = await mount();
    await openEditor(el);
    const label = one(el, 'label[for="schema-description"]')!;
    expect(label.textContent!.trim()).toBe('Description');
    expect(textarea(el).id).toBe('schema-description');
  });

  it('names each switch by its own caption', async () => {
    // The captions were siblings of the toggles, so none of the five controls had a name.
    const el = await mount();
    await openEditor(el);
    expect(toggles(el).map((toggle) => toggle.textContent!.trim())).toEqual([
      'DQL Access',
      'In $DATA Scope',
      'Enable Code',
      'Require Revision',
      'Prevent Design Refresh'
    ]);
  });

  it('seeds the form from the schema', async () => {
    const el = await mount();
    await openEditor(el);
    expect(textarea(el).value).toBe('A short description');
    expect(formulaField(el).value).toBe('@All');
    expect(toggles(el).map((toggle) => toggle.checked)).toEqual([true, true, true, false, true]);
  });

  it('keeps its control events to itself', async () => {
    const el = await mount();
    await openEditor(el);
    const escaped: Event[] = [];
    document.addEventListener('change', (event) => escaped.push(event));
    document.addEventListener('input', (event) => escaped.push(event));

    // Web Awesome's switch emits `input` beside `change`, and both compose out of its
    // shadow root; neither is part of this element's outbound contract.
    toggles(el)[0].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    toggles(el)[0].dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    textarea(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    formulaField(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(escaped).toEqual([]);
  });

  it('closes the discard dialog from its own header close button', async () => {
    const el = await mount();
    await openEditor(el);
    buttons(editDialog(el))[0].click();
    await el.updateComplete;

    const header = [...shadow(el).querySelectorAll('keep-form-dialog-header')][1] as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    expect(header.getAttribute('heading')).toBe('Discard Changes?');
    await header.updateComplete;

    const before = closeDialog().mock.calls.length;
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    await el.updateComplete;

    expect(closeDialog().mock.calls.length).toBe(before + 1);
    // Answering the header's X is not the same as answering Yes: the edits survive.
    expect(el.shadowRoot!.querySelector<HTMLTextAreaElement>('#schema-description')).toBeTruthy();
  });

  it('carries every switch into the saved payload', async () => {
    const el = await mount();
    await openEditor(el);
    toggles(el).forEach((toggle) =>
      toggle.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    );
    await el.updateComplete;

    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect(savedPayload()).toMatchObject({
      dqlAccess: false,
      openAccess: false,
      allowCode: false,
      requireRevisionToUpdate: true,
      prohibitRefresh: false
    });
  });

  it('leaves the summary alone while the dialog is open', async () => {
    // The read-only rows render the property, not the buffer, so a switch does not move a
    // checkmark until the save comes back.
    const el = await mount();
    await openEditor(el);
    toggles(el)[0].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(toggles(el)[0].checked).toBe(false);
    expect(rowState(rows(el)[0]).icon).toBe('circle-check');
  });

  // ---- saving --------------------------------------------------------------------------

  it('saves the schema with the edits the dialog collected', async () => {
    const el = await mount();
    await openEditor(el);

    textarea(el).value = 'edited description';
    textarea(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    formulaField(el).value = '@Contains(x)';
    formulaField(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    toggles(el)[1].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    toggles(el)[3].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;

    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect(updateSchema).toHaveBeenCalledTimes(1);
    expect(savedPayload()).toMatchObject({
      apiName: 'testapi',
      schemaName: 'testdb',
      nsfPath: 'test.nsf',
      description: 'edited description',
      dqlAccess: true,
      openAccess: false,
      allowCode: true,
      requireRevisionToUpdate: true,
      dqlFormula: { formulaType: 'domino', formula: '@Contains(x)' },
      agents: ['AgentA'],
      views: ['ViewA'],
      prohibitRefresh: true
    });
    expect(closeDialog()).toHaveBeenCalled();
  });

  it('keys the save by the schema name it was given, not by the one in the record', async () => {
    const el = await mount({ dbName: 'renamed', schemaData: makeSchema() });
    await openEditor(el);
    buttons(editDialog(el))[1].click();
    await el.updateComplete;
    expect(savedPayload().schemaName).toBe('renamed');
  });

  it('drops forms that have no modes from the saved payload', async () => {
    const el = await mount();
    await openEditor(el);
    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect((savedPayload().forms as { formName: string }[]).map((form) => form.formName)).toEqual([
      'Configured'
    ]);
  });

  it('saves an empty form list when the schema has none', async () => {
    const el = await mount({ schemaData: makeSchema({ forms: undefined }) });
    await openEditor(el);
    buttons(editDialog(el))[1].click();
    await el.updateComplete;
    expect(savedPayload().forms).toEqual([]);
  });

  it('sends the icon bytes for the name the picker last reported', async () => {
    const el = await mount();
    await openEditor(el);
    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect(savedPayload()).toMatchObject({ iconName: 'beach', icon: 'QkVBQ0g=' });
  });

  it('keeps the stored icon when the picked name has no payload', async () => {
    // The payload map loads lazily, so a name whose bytes are not in it must not blank the
    // schema's own copy.
    const el = await mount();
    await openEditor(el);
    one(el, 'keep-icon-dropdown')!.dispatchEvent(
      new CustomEvent('icon-select', {
        detail: { iconName: 'anchor' },
        bubbles: true,
        composed: true
      })
    );
    await el.updateComplete;
    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect(savedPayload()).toMatchObject({ iconName: 'anchor', icon: 'STORED_ICON_BYTES' });
  });

  it('blanks the owner list on every save', async () => {
    // A defect, pinned rather than repaired: `owners` and `excludedViews` come out of a
    // derived object that hardcodes them instead of out of the schema, so saving a
    // description edit also clears the application's owners. `keep-edit-view` carries the
    // same defect from the same shape. Correct behaviour is to send the schema's own values.
    const el = await mount();
    await openEditor(el);
    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect(savedPayload().owners).toEqual([]);
    expect(savedPayload().excludedViews).toBeUndefined();
  });

  it('reports the saved schema back to the consumer', async () => {
    const el = await mount();
    const seen = emitted(el, 'schema-change');
    await openEditor(el);
    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect(seen).toHaveLength(0);
    savedCallback()({ schemaName: 'echoed-back' });
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.schemaData).toEqual({ schemaName: 'echoed-back' });
  });

  // ---- Prevent Design Refresh, which does not wait for Save -----------------------------

  it('reports the design-refresh flag to the consumer without saving', async () => {
    const el = await mount();
    const seen = emitted(el, 'schema-change');
    await openEditor(el);

    toggles(el)[4].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(updateSchema).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.schemaData).toMatchObject({
      schemaName: 'testdb',
      prohibitRefresh: false
    });
    expect(toggles(el)[4].checked).toBe(false);
  });

  it('turns the design-refresh flag off first on a schema that never carried it', async () => {
    // The switch comes up on regardless, so the first press has to mean "off" whatever the
    // control shows; from then on the consumer's copy holds a boolean and it toggles.
    const el = await mount({ schemaData: makeSchema({ prohibitRefresh: undefined }) });
    const seen = emitted(el, 'schema-change');
    await openEditor(el);
    expect(toggles(el)[4].checked).toBe(true);

    toggles(el)[4].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(seen[0].detail.schemaData.prohibitRefresh).toBe(false);

    el.schemaData = makeSchema({ prohibitRefresh: false });
    await el.updateComplete;
    toggles(el)[4].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(seen[1].detail.schemaData.prohibitRefresh).toBe(true);
  });

  it('carries the design-refresh flag into the saved payload', async () => {
    const el = await mount();
    await openEditor(el);
    toggles(el)[4].dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await el.updateComplete;
    buttons(editDialog(el))[1].click();
    await el.updateComplete;

    expect(savedPayload().prohibitRefresh).toBe(false);
  });

  // ---- nothing to render ---------------------------------------------------------------

  it('fills in for a schema whose fields are all absent', async () => {
    // The record arrives from the backend and this component reads seventeen fields off it.
    // A sparse one must seed the form and build a payload rather than carry `undefined`
    // into either.
    const el = await mount({ schemaData: {} as any });
    expect(rows(el).map((row) => rowState(row).icon)).toEqual([
      'ban',
      'ban',
      'ban',
      'ban',
      'circle-check'
    ]);

    await openEditor(el);
    expect(textarea(el).value).toBe('');
    expect(formulaField(el).value).toBe('@True');

    // Discarding rebuilds every buffer from the same absent fields.
    buttons(editDialog(el))[0].click();
    await el.updateComplete;
    buttons(discardDialog(el))[1].click();
    await el.updateComplete;
    expect((one(el, 'keep-icon-dropdown') as HTMLElement & { iconName: string }).iconName).toBe(
      'beach'
    );

    await openEditor(el);
    buttons(editDialog(el))[1].click();
    await el.updateComplete;
    expect(savedPayload()).toMatchObject({
      apiName: '',
      schemaName: 'testdb',
      nsfPath: '',
      description: '',
      isActive: 'true',
      iconName: 'beach',
      forms: []
    });
  });

  it('renders without a schema rather than throwing', async () => {
    const el = await mountLit<DetailsSection>(TAG, { dbName: 'testdb' } as Partial<DetailsSection>);
    expect(textOf(el, '.api-schema')).toBe('testdb');
    expect(textOf(el, '.api-nsf')).toBe('');
    expect(one(el, '.status-dot')!.classList.contains('not-in-use')).toBe(true);
    // No schema means the four flags have not arrived, so the summary is still waiting.
    expect(one(el, 'wa-spinner')).toBeTruthy();
  });
});
