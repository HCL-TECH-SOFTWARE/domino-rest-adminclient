/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { FormController } from '../../store/FormController';
import { FA_LIBRARY } from '../../services/icon-library';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { clearFormulaResults, testFormula } from '../../store/databases/action';
import { toggleAlert } from '../../store/alerts/action';
import { findScopeBySchema } from '../../store/databases/scripts';
import './keep-checkbox';
import type Checkbox from './keep-checkbox';
import './keep-button';

/**
 * The values this form owns: one switch per formula, plus the two identities the run is made
 * under. The formula **text** is not here — it is gathered from the page the drawer opens over
 * and arrives as a property, so nothing in this form can edit it.
 */
interface TestFormValues {
  readFormula: boolean;
  writeFormula: boolean;
  deleteFormula: boolean;
  loadFormula: boolean;
  saveFormula: boolean;
  userId: string;
  documentId: string;
}

const INITIAL_VALUES: TestFormValues = {
  readFormula: false,
  writeFormula: false,
  deleteFormula: false,
  loadFormula: false,
  saveFormula: false,
  userId: '',
  documentId: '',
};

/**
 * One row per formula, driving both panels and the submit loop.
 *
 * The React version spelled this out three times over — a checkbox block, a `switch` inside
 * a `for…in` over a string array, and five near-identical result blocks — and the three
 * drifted: the delete result was headed "DeleteFormula Results" while its four siblings read
 * "<name> Formula Results", two of the five had a trailing colon and three did not. One table
 * is what stops that happening again.
 */
interface FormulaTest {
  /** The switch in {@link TestFormValues} that turns this test on. */
  readonly flag: 'readFormula' | 'writeFormula' | 'deleteFormula' | 'loadFormula' | 'saveFormula';
  /** Label beside that switch. */
  readonly label: string;
  /** Property carrying the formula text gathered from the page. */
  readonly text:
    | 'readFormulaText'
    | 'writeFormulaText'
    | 'deleteFormulaText'
    | 'loadFormulaText'
    | 'saveFormulaText';
  /** Action type the result is dispatched under; the reducer keys its slice fields off it. */
  readonly resultAction: string;
  /** Slice flag saying this result has arrived. */
  readonly display:
    | 'displayReadResults'
    | 'displayWriteResults'
    | 'displayDeleteResults'
    | 'displayLoadResults'
    | 'displaySaveResults';
  /** Slice field holding the result text. */
  readonly result:
    | 'readFormulaResults'
    | 'writeFormulaResults'
    | 'deleteFormulaResults'
    | 'loadFormulaResults'
    | 'saveFormulaResults';
  /** Heading over that text. */
  readonly resultLabel: string;
}

const TESTS: readonly FormulaTest[] = [
  {
    flag: 'readFormula',
    label: 'Read Access Formula',
    text: 'readFormulaText',
    resultAction: 'SAVE_READ_RESULT',
    display: 'displayReadResults',
    result: 'readFormulaResults',
    resultLabel: 'Read Formula Results:',
  },
  {
    flag: 'writeFormula',
    label: 'Write Access Formula',
    text: 'writeFormulaText',
    resultAction: 'SAVE_WRITE_RESULT',
    display: 'displayWriteResults',
    result: 'writeFormulaResults',
    resultLabel: 'Write Formula Results:',
  },
  {
    flag: 'deleteFormula',
    label: 'Delete Access Formula',
    text: 'deleteFormulaText',
    resultAction: 'SAVE_DELETE_RESULT',
    display: 'displayDeleteResults',
    result: 'deleteFormulaResults',
    resultLabel: 'Delete Formula Results:',
  },
  {
    flag: 'loadFormula',
    label: 'On Load Formula',
    text: 'loadFormulaText',
    resultAction: 'SAVE_LOAD_RESULT',
    display: 'displayLoadResults',
    result: 'loadFormulaResults',
    resultLabel: 'Load Formula Results:',
  },
  {
    flag: 'saveFormula',
    label: 'On Save Formula',
    text: 'saveFormulaText',
    resultAction: 'SAVE_SAVE_RESULT',
    display: 'displaySaveResults',
    result: 'saveFormulaResults',
    resultLabel: 'Save Formula Results:',
  },
];

/**
 * Run the access formulas of the mode being edited against a real document, and show what
 * came back. Tag: `keep-test-form`.
 *
 * Replaces `components/access/TestForm.tsx`. Two panels in one element, exactly as before:
 * the picker until a result lands, the results afterwards. `displayTestResults` is set by the
 * reducer the moment the first result arrives, so the swap is store-driven and needs no local
 * flag.
 *
 * ### It owns its form, and it owns the submit
 *
 * The React leaf was handed a form object built by `TabsAccess`, five levels of prop away from
 * the values it rendered. That shape cannot cross a shadow boundary without keeping the
 * coupling alive through the property type, so — as with the Quick Config pair — the form
 * element owns its form: a `FormController` for the seven values, and the `testFormula`
 * dispatch that used to live in the container's submit handler.
 *
 * Two things the container really did own come in as properties instead, because they are
 * page facts rather than form values: the five formula texts, gathered from the mode being
 * edited, and the schema this page is showing.
 *
 * **The container's own submit handler is now dead code.** `TabsAccess` still builds one; it
 * is unreachable while this element is the only thing in the drawer, and it goes when that
 * file converts.
 *
 * ### One store subscription
 *
 * Eleven fields off `state.databases` — the ten result fields plus `scopes` — so the whole
 * slice rather than a projection, for the reason `keep-quick-config-form` gives at length
 * (#895): a projection allocates a fresh object on every store change and compares no fewer
 * references than `Object.is` on the slice does.
 */
@customElement('keep-test-form')
export default class TestForm extends KeepElement {
  static styles = css`
    /* The document reset stops at this boundary, and the panels below are sized in
       percentages with padding on top, so it has to be restated. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* Was the FormContentContainer styled.div plus the full-width utility. */
    :host {
      display: block;
      padding: 0 20px;
      min-width: 55%;
      max-width: 100%;
      width: 100%;
      overflow-y: auto;
    }

    /* Was the TestsPanel and ResultsPanel styled.divs, which were the same four rules
       written out twice. */
    .panel {
      padding-left: 35px;
      margin: 0;
      width: 100%;
    }

    /*
     * A real button, not a glyph with a click handler.
     *
     * The original rendered an icon with onClick on it: not focusable, not announced, and
     * unreachable by keyboard. The chrome is stripped back to what the icon looked like so
     * nothing moves, and the accessible name is on the control that carries the behaviour.
     */
    .close-icon {
      float: right;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      color: inherit;
      font-size: var(--wa-font-size-xl);
      line-height: 1;
    }

    /* Was the PanelContent styled.form. */
    .panel-content {
      margin: 0;
      padding: 20px 0;
    }

    /*
     * Was the header-title class scoped inside FormContentContainer, combined with the
     * background-badge utility.
     *
     * The fill is the brand surface here, not the badge tint. The badge tint is the
     * lightest step of the brand ramp in light mode, and the rule pairs it with hardcoded
     * white 24px text — around 1.5 to 1, which is the heading being effectively invisible
     * rather than a subtle miss. Both other forms in this drawer family already paint
     * their heading on the brand surface, which is measured against white in
     * keep-theme.css and clears 4.5 in both modes.
     */
    .header-title {
      display: block;
      margin: 15px 0 0;
      color: var(--wa-color-brand-on-loud, #fff);
      background: var(--keep-surface-brand);
      font-size: 24px;
      /* A heading element now, so the weight and the UA margins are stated rather than
         inherited from the browser's h2 rule. Both panels name themselves; the drawer's own
         title is the only other heading in here. */
      font-weight: normal;
      padding: 20px;
      border-radius: var(--wa-border-radius-m);
    }

    /* Was the PageLegend styled.div wrapping a large-text span. */
    .page-legend {
      margin-top: 20px;
      font-size: 20px;
    }

    /* Was a FormGroup carrying the flex, p-16 and gap-5 utilities. */
    .checkboxes {
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 5px;
    }

    /* Was the InputContainer styled.div. */
    .input-container {
      padding: 5px 0;
    }

    .input-container.first {
      margin-top: 5px;
    }

    /* Was the AutoContainer styled.div: one result heading and its text. */
    .result {
      margin: 20px 0;
      display: flex;
      flex-direction: column;
    }

    /* The class this replaces is a hardcoded black with a separate dark-mode override, and
       neither reaches inside a shadow root. This token is mode-aware on its own. */
    .result span {
      color: var(--wa-color-text-normal);
    }

    .result-label {
      font-weight: bold;
    }

    /* Was the ActionButtonBar styled.div. */
    .actions {
      margin-top: 0;
      border-top: 2px solid var(--wa-color-brand-50);
      padding-top: 15px;
      padding-bottom: 15px;
      display: flex;
      flex-wrap: wrap;
      row-gap: 10px;
      gap: 10px;
    }

    /* Was the button-style class, whose float did nothing: it was applied to flex items. */
    .actions keep-button {
      width: 25%;
    }
  `;

  /** See the class docblock: one subscription for the whole slice, on purpose. */
  private readonly db = new StoreController(this, (state) => state.databases);

  private readonly form = new FormController<TestFormValues>(this, {
    initialValues: INITIAL_VALUES,
    onSubmit: (values) => this.runTests(values),
  });

  /** The database this page is showing, from the route. Half of the scope lookup. */
  @property({ type: String }) accessor nsfPath = '';

  /** The schema this page is showing, from the route. The other half. */
  @property({ type: String }) accessor schemaName = '';

  @property({ type: String }) accessor readFormulaText = '';
  @property({ type: String }) accessor writeFormulaText = '';
  @property({ type: String }) accessor deleteFormulaText = '';
  @property({ type: String }) accessor loadFormulaText = '';
  @property({ type: String }) accessor saveFormulaText = '';

  /**
   * Close the drawer and drop the results, so the next open starts on the picker.
   *
   * The switches themselves survive a close, which is what the React version did — its form
   * object lived in the container and was never reset — and it is the useful behaviour: the
   * same formulas usually get run again after an edit.
   */
  private close(): void {
    this.db.dispatch(toggleApplicationDrawer());
    this.db.dispatch(clearFormulaResults());
  }

  /**
   * Dispatch one `testFormula` per switch that is on.
   *
   * The scope guard is the container's, moved here whole: only a schema with a scope can run
   * a formula, and without one the run is refused with an alert rather than five failing
   * requests. It stayed a guard rather than becoming a schema rule because it is a fact about
   * the page, not about a field — there is no control the message could hang off.
   */
  private runTests(values: TestFormValues): void {
    const scopeIndex = findScopeBySchema(this.db.value.scopes, this.schemaName, this.nsfPath);
    if (scopeIndex < 0) {
      this.db.dispatch(
        toggleAlert(
          'Only schemas configured with scopes support this feature. Please configure this schema with a scope first.',
        ),
      );
      return;
    }
    const scope = this.db.value.scopes[scopeIndex];

    for (const test of TESTS) {
      if (!values[test.flag]) continue;
      this.db.dispatch(
        testFormula(
          scope.apiName,
          {
            formula: this[test.text],
            query: '',
            type: 'domino',
            save: false,
            unid: values.documentId,
            user: values.userId,
          },
          test.resultAction,
        ),
      );
    }
  }

  /**
   * Implicit submission — Enter in either text field.
   *
   * `preventDefault` because a native submit would navigate; the values live in the
   * controller rather than in the form's elements collection, so there is nothing for the
   * browser to send.
   */
  private handleSubmitEvent(event: Event): void {
    event.preventDefault();
    void this.form.submit();
  }

  /**
   * `keep-checkbox` re-emits its own composed `change` with no detail, having stopped the
   * inner event, so the state is on the element and `target` is the `keep-checkbox` itself.
   */
  private checkedOf(event: Event): boolean {
    return (event.target as Checkbox).checked;
  }

  private renderCloseButton() {
    return html`
      <button class="close-icon" type="button" aria-label="Close" @click=${() => this.close()}>
        <wa-icon library=${FA_LIBRARY} name="xmark" canvas="auto"></wa-icon>
      </button>
    `;
  }

  private renderTests() {
    const { values } = this.form;
    return html`
      <div class="panel">
        ${this.renderCloseButton()}
        <form class="panel-content" @submit=${(e: Event) => this.handleSubmitEvent(e)}>
          <h2 class="header-title">Test Formulas</h2>
          <div class="page-legend">Select the formulas you would like to test</div>
          <div class="checkboxes">
            ${TESTS.map(
              (test) => html`
                <keep-checkbox
                  ?checked=${values[test.flag]}
                  @change=${(e: Event) => this.form.setValue(test.flag, this.checkedOf(e))}
                >
                  ${test.label}
                </keep-checkbox>
              `,
            )}
          </div>
          <div class="input-container first">
            <wa-input
              label="User Name"
              autocomplete="off"
              .value=${values.userId}
              @input=${(e: Event) => this.form.setValue('userId', (e.target as HTMLInputElement).value)}
              @blur=${() => void this.form.handleBlur('userId')}
            ></wa-input>
          </div>
          <div class="input-container">
            <wa-input
              label="Document Id"
              autocomplete="off"
              .value=${values.documentId}
              @input=${(e: Event) =>
                this.form.setValue('documentId', (e.target as HTMLInputElement).value)}
              @blur=${() => void this.form.handleBlur('documentId')}
            ></wa-input>
          </div>

          <!-- The form's only submitter, so Enter in a field reaches the submit handler.
               Neither keep-button nor its inner Web Awesome button is form-associated, and
               the input's implicit submission walks the form's elements collection looking
               for an enabled submit control - with none, Enter did nothing at all. -->
          <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
        </form>
        <div class="actions">
          <keep-button @click=${() => this.close()}>Close</keep-button>
          <keep-button ?disabled=${this.form.submitting} @click=${() => void this.form.submit()}>
            Run Test
          </keep-button>
        </div>
      </div>
    `;
  }

  private renderResults() {
    const slice = this.db.value;
    return html`
      <div class="panel">
        ${this.renderCloseButton()}
        <div class="panel-content">
          <h2 class="header-title">Test Formula Results</h2>
          <div class="page-legend">The test results for the selected Formulas</div>
          ${TESTS.map((test) =>
            slice[test.display]
              ? html`
                  <div class="result">
                    <span class="result-label">${test.resultLabel}</span>
                    <span>${slice[test.result]}</span>
                  </div>
                `
              : nothing,
          )}
        </div>
        <div class="actions">
          <keep-button @click=${() => this.close()}>Close</keep-button>
        </div>
      </div>
    `;
  }

  render() {
    return this.db.value.displayTestResults ? this.renderResults() : this.renderTests();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-test-form': TestForm;
  }
}
