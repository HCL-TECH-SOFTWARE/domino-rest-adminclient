/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { fetchKeepScopes } from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-test-form';
import type TestForm from '../../../src/components/keep-elements/keep-test-form';

/**
 * Only `testFormula` is replaced — everything else in the action module stays real, because
 * the store and the other elements under test import from it too. The stub records the call
 * and returns a thunk-shaped no-op so `dispatch` is happy. Its arguments are the whole
 * contract of this form: which scope the run goes to, which formula text is sent, and which
 * result slot the answer lands in.
 */
const runs: Array<{ dataSource: string; formulaData: any; resultAction: string }> = [];
vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  testFormula: (dataSource: string, formulaData: any, resultAction: string) => {
    runs.push({ dataSource, formulaData, resultAction });
    return () => Promise.resolve();
  },
}));

const TAG = 'keep-test-form';

const NSF_PATH = 'orders.nsf';
const SCHEMA_NAME = 'Alpha';

/**
 * The five checkbox labels, in markup order. Carried from `TestForm.tsx` unchanged — the
 * result headings are **not** carried unchanged, see the results block below.
 */
const LABELS = [
  'Read Access Formula',
  'Write Access Formula',
  'Delete Access Formula',
  'On Load Formula',
  'On Save Formula',
];

describe('keep-test-form', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    runs.length = 0;
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
    vi.restoreAllMocks();
  });

  /** Mounted with the route facts the drawer's React host passes down. */
  const mount = (props: Partial<TestForm> = {}) =>
    mountLit<TestForm>(TAG, {
      nsfPath: NSF_PATH,
      schemaName: SCHEMA_NAME,
      ...props,
    } as Partial<TestForm>);

  /** Give the schema a scope, which is what makes a formula run legal. */
  const giveScope = (apiName = 'alpha-scope') => {
    store.dispatch(
      fetchKeepScopes([
        { apiName, schemaName: SCHEMA_NAME, nsfPath: NSF_PATH } as any,
      ]),
    );
  };

  const checkboxes = (el: TestForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('keep-checkbox')) as Array<
      HTMLElement & { checked: boolean }
    >;

  const inputs = (el: TestForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('wa-input')) as Array<
      HTMLElement & { value: string }
    >;

  const inputFor = (el: TestForm, label: string) =>
    inputs(el).find((i) => i.getAttribute('label') === label)!;

  const actionButtons = (el: TestForm) =>
    Array.from(el.shadowRoot!.querySelectorAll('.actions keep-button')) as Array<
      HTMLElement & { disabled: boolean }
    >;

  const closeIcon = (el: TestForm) => el.shadowRoot!.querySelector('.close-icon') as HTMLElement;

  /**
   * The submit runs through the controller, which validates before it calls `onSubmit`, and
   * validation is a promise even with no schema. Draining the microtask queue between renders
   * is what makes these assertions about the settled state.
   */
  const settle = async (el: TestForm) => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  /** Tick a checkbox the way the element sees it: flip the property, fire `change`. */
  const tick = async (el: TestForm, index: number) => {
    const box = checkboxes(el)[index];
    box.checked = true;
    box.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
    await el.updateComplete;
  };

  const type = async (el: TestForm, label: string, value: string) => {
    const input = inputFor(el, label);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
  };

  const runTest = async (el: TestForm) => {
    actionButtons(el)[1].click();
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  // ---- the picker panel ---------------------------------------------------------------------

  it('renders one checkbox per formula, labelled as before', async () => {
    const el = await mount();
    expect(checkboxes(el).map((b) => b.textContent!.trim())).toEqual(LABELS);
  });

  it('renders the two identity fields', async () => {
    const el = await mount();
    expect(inputs(el).map((i) => i.getAttribute('label'))).toEqual(['User Name', 'Document Id']);
  });

  it('starts with every formula switched off', async () => {
    const el = await mount();
    expect(checkboxes(el).every((b) => !b.checked)).toBe(true);
  });

  it('shows the picker, not the results, until a result arrives', async () => {
    const el = await mount();
    expect(el.shadowRoot!.textContent).toContain('Test Formulas');
    expect(el.shadowRoot!.textContent).not.toContain('Test Formula Results');
  });

  // ---- the scope guard ---------------------------------------------------------------------

  it('refuses the run and alerts when the schema has no scope', async () => {
    const el = await mount();
    await tick(el, 0);
    await runTest(el);

    expect(runs).toHaveLength(0);
    expect(store.getState().alert.message).toContain('Only schemas configured with scopes');
    expect(store.getState().alert.visible).toBe(true);
  });

  it('refuses the run when a scope exists for a different schema', async () => {
    store.dispatch(
      fetchKeepScopes([
        { apiName: 'other', schemaName: 'Beta', nsfPath: NSF_PATH } as any,
      ]),
    );
    const el = await mount();
    await tick(el, 0);
    await runTest(el);

    expect(runs).toHaveLength(0);
  });

  it('refuses the run when the scope belongs to a different database', async () => {
    store.dispatch(
      fetchKeepScopes([
        { apiName: 'other', schemaName: SCHEMA_NAME, nsfPath: 'somewhere-else.nsf' } as any,
      ]),
    );
    const el = await mount();
    await tick(el, 0);
    await runTest(el);

    expect(runs).toHaveLength(0);
  });

  // ---- running -----------------------------------------------------------------------------

  it('runs nothing when no formula is switched on', async () => {
    giveScope();
    const el = await mount();
    await runTest(el);
    expect(runs).toHaveLength(0);
  });

  it('runs only the formulas that are switched on, against the schema scope', async () => {
    giveScope('alpha-scope');
    const el = await mount({ readFormulaText: '@True', saveFormulaText: '@Save' });
    await tick(el, 0);
    await tick(el, 4);
    await runTest(el);

    expect(runs.map((r) => r.resultAction)).toEqual(['SAVE_READ_RESULT', 'SAVE_SAVE_RESULT']);
    expect(runs.every((r) => r.dataSource === 'alpha-scope')).toBe(true);
    expect(runs.map((r) => r.formulaData.formula)).toEqual(['@True', '@Save']);
  });

  it('sends the formula text it was given, not anything the user could type', async () => {
    giveScope();
    const el = await mount({ deleteFormulaText: '@False' });
    await tick(el, 2);
    await runTest(el);

    expect(runs).toHaveLength(1);
    expect(runs[0].formulaData).toMatchObject({
      formula: '@False',
      query: '',
      type: 'domino',
      save: false,
    });
  });

  it('sends the user name and document id from the form', async () => {
    giveScope();
    const el = await mount({ readFormulaText: '@True' });
    await tick(el, 0);
    await type(el, 'User Name', 'CN=Ada/O=Keep');
    await type(el, 'Document Id', 'ABC123');
    await runTest(el);

    expect(runs[0].formulaData).toMatchObject({ user: 'CN=Ada/O=Keep', unid: 'ABC123' });
  });

  /**
   * The two identity fields wire `@blur` like every converted form does. This form carries no
   * schema, so leaving a field marks it finished-with and finds nothing to say — which is the
   * behaviour worth pinning: neither field may start reporting itself.
   */
  it('says nothing when a field is left empty', async () => {
    giveScope();
    const el = await mount({ readFormulaText: '@True' });
    await type(el, 'User Name', 'CN=Ada/O=Keep');
    inputFor(el, 'User Name').dispatchEvent(new Event('blur', { bubbles: false }));
    inputFor(el, 'Document Id').dispatchEvent(new Event('blur', { bubbles: false }));
    await settle(el);

    expect(el.shadowRoot!.querySelectorAll('.field-error')).toHaveLength(0);
    expect(inputFor(el, 'User Name').value).toBe('CN=Ada/O=Keep');
  });

  it('submits on Enter in a field, through the form', async () => {
    giveScope();
    const el = await mount({ readFormulaText: '@True' });
    await tick(el, 0);

    const form = el.shadowRoot!.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(el);

    expect(runs).toHaveLength(1);
  });

  /**
   * #887. Two presses inside one in-flight submit are one run, because the controller returns
   * the first promise rather than running the body again. Without that, a double-clicked Run
   * Test sent every checked formula to the server twice.
   */
  it('runs once when Run Test is pressed twice in a row', async () => {
    giveScope();
    const el = await mount({ readFormulaText: '@True' });
    await tick(el, 0);

    const button = actionButtons(el)[1];
    button.click();
    button.click();
    await settle(el);

    expect(runs).toHaveLength(1);
  });

  // ---- closing -----------------------------------------------------------------------------

  it('the Close button toggles the drawer and drops the results', async () => {
    store.dispatch({ type: 'SAVE_READ_RESULT', payload: 'yes' });
    const el = await mount();
    await el.updateComplete;

    actionButtons(el)[0].click();
    await el.updateComplete;

    expect(store.getState().drawer.applicationDrawer).toBe(true);
    expect(store.getState().databases.displayTestResults).toBe(false);
    expect(store.getState().databases.readFormulaResults).toBe('');
  });

  /**
   * The React version hung the close behaviour on the glyph itself, so it was not focusable,
   * had no role and could not be reached from the keyboard. It is a real button here, and the
   * accessible name is on the control that carries the behaviour.
   */
  it('the close glyph is a real button with an accessible name', async () => {
    const el = await mount();
    const button = closeIcon(el);
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('aria-label')).toBe('Close');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('the close glyph closes the drawer', async () => {
    const el = await mount();
    closeIcon(el).click();
    await el.updateComplete;
    expect(store.getState().drawer.applicationDrawer).toBe(true);
  });

  it('heads each panel with a heading element', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('h2')!.textContent!.trim()).toBe('Test Formulas');

    store.dispatch({ type: 'SAVE_READ_RESULT', payload: 'x' });
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('h2')!.textContent!.trim()).toBe('Test Formula Results');
  });

  it('names a library on its icon, so nothing is fetched from a CDN', async () => {
    const el = await mount();
    const icon = el.shadowRoot!.querySelector('wa-icon')!;
    expect(icon.getAttribute('library')).toBe('fa');
    expect(icon.getAttribute('name')).toBe('xmark');
  });

  // ---- the results panel -------------------------------------------------------------------

  it('swaps to the results panel as soon as a result arrives', async () => {
    const el = await mount();
    store.dispatch({ type: 'SAVE_READ_RESULT', payload: 'read says yes' });
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('Test Formula Results');
    expect(checkboxes(el)).toHaveLength(0);
  });

  it('shows only the results that arrived', async () => {
    const el = await mount();
    store.dispatch({ type: 'SAVE_READ_RESULT', payload: 'read says yes' });
    store.dispatch({ type: 'SAVE_LOAD_RESULT', payload: 'load says no' });
    await el.updateComplete;

    const results = Array.from(el.shadowRoot!.querySelectorAll('.result')).map((r) =>
      r.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(results).toEqual([
      'Read Formula Results: read says yes',
      'Load Formula Results: load says no',
    ]);
  });

  /**
   * The five headings were written out one at a time and had drifted: the delete one read
   * "DeleteFormula Results" and three of the five had lost their colon. One table generates
   * all five here, so they cannot drift again.
   */
  it('heads every result the same way', async () => {
    const el = await mount();
    for (const type of [
      'SAVE_READ_RESULT',
      'SAVE_WRITE_RESULT',
      'SAVE_DELETE_RESULT',
      'SAVE_LOAD_RESULT',
      'SAVE_SAVE_RESULT',
    ]) {
      store.dispatch({ type, payload: 'x' });
    }
    await el.updateComplete;

    const labels = Array.from(el.shadowRoot!.querySelectorAll('.result-label')).map((n) =>
      n.textContent!.trim(),
    );
    expect(labels).toEqual([
      'Read Formula Results:',
      'Write Formula Results:',
      'Delete Formula Results:',
      'Load Formula Results:',
      'Save Formula Results:',
    ]);
  });

  it('offers only Close on the results panel', async () => {
    const el = await mount();
    store.dispatch({ type: 'SAVE_READ_RESULT', payload: 'x' });
    await el.updateComplete;

    const buttons = actionButtons(el);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent!.trim()).toBe('Close');
  });

  it('keeps the chosen formulas when the results are cleared', async () => {
    giveScope();
    const el = await mount({ readFormulaText: '@True' });
    await tick(el, 0);

    store.dispatch({ type: 'SAVE_READ_RESULT', payload: 'x' });
    await el.updateComplete;
    actionButtons(el)[0].click();
    await el.updateComplete;

    expect(checkboxes(el)[0].checked).toBe(true);
  });
});
