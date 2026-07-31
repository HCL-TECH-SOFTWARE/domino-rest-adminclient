/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import './keep-button';
import './keep-form-dialog-header';
import './keep-textform-array';
import './keep-tooltip';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { FA_LIBRARY } from '../../services/icon-library';

/** One saved formula, as the mode stores it. */
export interface KeepFormula {
  formulaType?: string;
  formula?: string;
}

/** One validation rule, as `keep-textform-array` edits it. */
export interface KeepValidationRule {
  formula: string;
  formulaType: string;
  message: string;
}

/** The mode's script settings — the object the Access tab keeps in `scripts`. */
export interface KeepScriptData {
  computeWithForm?: boolean;
  continueOnError?: boolean;
  sign?: boolean;
  readAccessFormula?: KeepFormula;
  writeAccessFormula?: KeepFormula;
  deleteAccessFormula?: KeepFormula;
  onLoad?: KeepFormula;
  onSave?: KeepFormula;
  [extra: string]: unknown;
}

/** `event.detail` of `scripts-change`. Carries the whole object, not a delta. */
export interface KeepScriptsChangeDetail {
  scripts: KeepScriptData;
}

/** `event.detail` of `validation-rules-change`. */
export interface KeepValidationRulesChangeDetail {
  rules: KeepValidationRule[];
}

/**
 * The five formulas, in display order, each paired with the key it is stored under.
 *
 * The original held the *title* in state and switched on it to recover the key, with an
 * empty-string fallback that would have written a `""` property into the mode. Keying off
 * the storage name instead removes both the reverse mapping and that fallback.
 */
const FORMULA_CARDS = [
  { key: 'readAccessFormula', title: 'Formula for Read Access' },
  { key: 'writeAccessFormula', title: 'Formula for Write Access' },
  { key: 'deleteAccessFormula', title: 'Formula for Delete Access' },
  { key: 'onLoad', title: 'On Load Formula' },
  { key: 'onSave', title: 'On Save Formula' },
] as const;

type FormulaKey = (typeof FORMULA_CARDS)[number]['key'];

const titleOf = (key: string): string =>
  FORMULA_CARDS.find((card) => card.key === key)?.title ?? '';

/**
 * Mode Settings and Validation Rules on the Access tab. Tag: `keep-script-editor`.
 *
 * Two collapsible panels. The first lists the mode's five formulas and opens a modal to
 * edit one; the second hosts `keep-textform-array` for the validation rules.
 *
 * ## Not built on `keep-monaco-editor`
 *
 * The obvious question, and the answer is no. The control this replaces is a five-row
 * plain text box for a **Domino @formula** — a language Monaco does not know, so it would
 * be highlighted as JavaScript, offered JavaScript completions, and (for
 * `language === 'javascript'`) reformatted by Prettier on blur. `keep-monaco-editor` also
 * pulls in several MB of editor plus a 309 kB stylesheet on first use, which is a large
 * price for a modal that holds one line of formula text. It stays a text box.
 *
 * ## Store access
 *
 * None. `TabsAccess` owns `scripts` and `validationRules` and passes both down through
 * `FieldDndContainer`, so they arrive as properties and every edit leaves as an event. A
 * `StoreController` here would fight the React bridge, which re-applies every property on
 * every parent render with no dirty check.
 *
 * ## A crash the original had
 *
 * Four of the five cards rendered their formula as
 * `{data.onSave?.formula !== "" && <p>{data.onSave.formula}</p>}`. When the key is absent
 * the guard is `undefined !== ""`, i.e. **true**, and the body then dereferences the same
 * missing object — so expanding Mode Settings on a mode that has never had an On Save (or
 * On Load, Delete Access, Write Access) formula threw. Only the read-access card used the
 * safe form. All five go through one helper here, which shows the placeholder for a
 * missing *or* empty formula.
 *
 * ## Accessibility (#713)
 *
 * The edit affordances were unlabelled icon buttons and the collapse controls carried
 * their state only in the direction of a chevron. Each is a real button with a name now,
 * each collapse control carries `aria-expanded`/`aria-controls`, the formula box has a
 * label (visually hidden, so the dense dialog is unchanged), and the two switches take
 * their label from their own slot rather than from a paragraph beside them.
 *
 * ## What the shadow boundary cost
 *
 * The eight `.script-editor-*` rules in `styles.css`, the `.dialog*` family, the twenty
 * utility classes layered on top of them, the `BlueSwitch` block in `styles/forms.tsx`,
 * the bare `dialog` rule in `dark-mode.css` and its `::backdrop`, and Web Awesome's
 * `wa-native` box-sizing reset. All restated below through the same tokens.
 *
 * @fires scripts-change - `CustomEvent<KeepScriptsChangeDetail>`
 * @fires validation-rules-change - `CustomEvent<KeepValidationRulesChangeDetail>`
 * @fires test-formulas - `CustomEvent<undefined>`
 */
@customElement('keep-script-editor')
export default class ScriptEditor extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /*
       * The page's border-box reset is Web Awesome's wa-native layer, applied through a
       * universal selector, which does not cross a shadow boundary.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * The original returned two sibling panels into the parent's flex column, so the
       * 20px gap between them came from that column's gap-20 utility. There is one host in
       * their place now, so the host reproduces the gap itself.
       */
      :host {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        color: var(--wa-color-text-normal);
      }

      /* was .script-editor-container */
      .panel {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        border-radius: 5px;
        border: 1px solid var(--wa-color-surface-border);
        padding: 5px 20px;
        gap: 16px;
        background-color: var(--wa-color-surface-default);
      }

      /* was .script-editor-settings-header */
      .panel-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0;
      }

      /* was .script-editor-settings-text.m-0 */
      .panel-title {
        font-size: 14px;
        font-weight: 700;
        padding: 0;
        margin: 0;
      }

      /* was .flex.flex-row.items-center */
      .panel-actions {
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      /*
       * The user-agent button reset the Material buttons used to hide. Without the font
       * shorthand a button does not inherit the page font, and without the background
       * and border reset it renders as a system push button.
       */
      button {
        font: inherit;
        color: inherit;
        background: none;
        border: none;
        margin: 0;
        padding: 6px 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        border-radius: var(--wa-border-radius-m);
      }

      button:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * Material's ButtonBase marks a disabled control with pointer-events: none and
       * nothing else, so the five edit pencils looked identical whether or not there was
       * a formula to edit. They are dimmed now.
       */
      button:disabled {
        cursor: default;
        opacity: 0.5;
      }

      .icon-button {
        padding: 6px;
      }

      /*
       * was .script-editor-action-icon. wa-icon has no size property — the size='xl' at
       * the old call site was Web Awesome's .wa-size-xl utility, which lives in a
       * document layer and does not reach in here, so it is a font-size.
       */
      .action-icon {
        color: var(--wa-color-text-normal);
        font-size: var(--wa-font-size-xl);
      }

      .chevron {
        font-size: var(--wa-font-size-xl);
      }

      /* was .color-text-primary.m-0.small-text on the Test Formulas label */
      .action-label {
        font-size: 14px;
        margin: 0;
        color: var(--wa-color-text-normal);
      }

      /* was .script-editor-formulas-container */
      .formula-row {
        display: flex;
        width: 100%;
        justify-content: space-between;
        margin-bottom: 16px;
      }

      /* was .script-editor-access-container.p-16.flex.flex-col.gap-10 */
      .formula-card {
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        width: 45%;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      /* was .p-0.justify-between.flex.items-center */
      .formula-card-header {
        padding: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      /* was .small-text.weight-500.m-0 */
      .formula-label {
        font-size: 14px;
        font-weight: 500;
        margin: 0;
      }

      /* was .tiny-text.weight-400.m-0 */
      .formula-text {
        font-size: 12px;
        font-weight: 400;
        margin: 0;
      }

      /*
       * was .weight-300.color-text-disabled.tiny-text — and deliberately no margin rule,
       * because the original carried no m-0 and so kept the user-agent paragraph margin.
       * --text-color-disabled is a custom property, so it still inherits in here.
       */
      .formula-placeholder {
        font-size: 12px;
        font-weight: 300;
        color: var(--text-color-disabled);
      }

      /* was .flex.justify-between around the write-access formula and its note */
      .formula-line {
        display: flex;
        justify-content: space-between;
      }

      /* was .tiny-text.weight-400.text-italic.color-text-disabled.m-0 */
      .computed-note {
        font-size: 12px;
        font-weight: 400;
        font-style: italic;
        color: var(--text-color-disabled);
        margin: 0;
      }

      /* was .w-45.small-text */
      .sign {
        width: 45%;
        font-size: 14px;
      }

      /* was .flex.full-width */
      .sign-row {
        display: flex;
        width: 100%;
      }

      /* was .color-text-disabled.tiny-text.m-0.p-0 */
      .sign-note {
        color: var(--text-color-disabled);
        font-size: 12px;
        margin: 0;
        padding: 0;
      }

      /* was .script-editor-help-icon. A single colour in both modes, as it was. */
      .help-icon {
        color: #2d91e3;
        font-size: var(--wa-font-size-xl);
      }

      /*
       * The switches used to be Material switches with a paragraph beside them and no
       * label of their own. The text is the switch's own label now — Web Awesome renders
       * it inside the <label> that wraps the role="switch" input, which is what names it
       * — and the order property puts the words back on the left where they were.
       */
      wa-switch::part(control) {
        order: 2;
      }

      wa-switch::part(label) {
        order: 1;
        margin-inline-start: 0;
        margin-inline-end: 0.5em;
      }

      /* was .dialog.half-width.pr-0.pl-0, plus the bare dialog element rule in dark-mode.css
         that a document sheet can no longer deliver. */
      dialog {
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        width: 50%;
        height: fit-content;
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
        flex-direction: column;
        gap: 30px;
        padding-left: 0;
        padding-right: 0;
        display: none;
      }

      dialog[open] {
        display: flex;
      }

      /* was .pr-30.pl-30.full-width around the dialog header */
      .dialog-head {
        width: 100%;
        padding: 0 30px;
      }

      /*
       * was .divider. #cbcbcb is kept rather than tokenized: the rule has never had a
       * dark variant, so swapping in --wa-color-surface-border would take the line from
       * clearly visible to nearly invisible on the dark dialog surface. That is a design
       * decision, not a conversion one.
       */
      .divider {
        height: 1px;
        width: 100%;
        background: #cbcbcb;
        padding: 0;
        margin: 0;
      }

      /* was .dialog-content.pl-30.pr-30.gap-20 */
      .dialog-content {
        width: 100%;
        padding: 0 30px;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* was .dialog-actions.pl-30.pr-30.gap-20 */
      .dialog-actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 20px;
        padding: 0 30px;
      }

      /* was .script-editor-formula-line.flex.half-width.m-0.p-0 */
      .compute-line {
        display: flex;
        width: 50%;
        padding: 5px 0;
        margin: 0;
      }

      /* The label used to be a .half-width span beside the switch, so it keeps half the
         line to itself now that it is the switch's own label. */
      .compute-line wa-switch {
        display: flex;
        width: 100%;
      }

      .compute-line wa-switch::part(label) {
        flex: 0 0 50%;
      }

      /* was .script-editor-compute-text */
      .compute-line.compute wa-switch::part(label) {
        font-size: 15px;
      }

      /* was the .small-text on the continue-on-error label */
      .compute-line.continue wa-switch::part(label) {
        font-size: 14px;
      }

      /* was the conditional .color-text-disabled on the same label */
      .compute-line.continue.disabled wa-switch::part(label) {
        color: var(--text-color-disabled);
      }

      /*
       * The formula box had no label at all — Material's hiddenLabel, so the only name it
       * had was whatever a browser inferred from the placeholder. It has a real label
       * now, clipped rather than display:none so it stays in the accessibility tree while
       * the dialog looks the same.
       */
      wa-textarea::part(label) {
        block-size: 1px;
        border: 0;
        clip-path: inset(50%);
        inline-size: 1px;
        margin: 0;
        overflow: hidden;
        padding: 0;
        position: absolute;
        white-space: nowrap;
      }
    `,
  ];

  /** The mode's script settings. Owned by the Access tab. */
  @property({ attribute: false }) accessor data: KeepScriptData = {};

  /** The mode's validation rules. Owned by the Access tab. */
  @property({ attribute: false }) accessor validationRules: KeepValidationRule[] = [];

  @state() private accessor expanded = false;

  @state() private accessor validationExpanded = false;

  /** Which formula the modal is editing, `''` when it is closed. */
  @state() private accessor formulaKey = '';

  @state() private accessor formula = '';

  @state() private accessor formComputed = false;

  @state() private accessor continueOnError = false;

  private get dialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  /** Mirrors the original's effect on `[data]`: both toggles re-seed from the property. */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('data')) {
      this.formComputed = Boolean(this.data.computeWithForm);
      this.continueOnError = Boolean(this.data.continueOnError);
    }
  }

  // `PropertyValues` without a type argument, because `formulaKey` is a private state
  // field and `PropertyValues<this>` only admits the public ones.
  protected updated(changed: PropertyValues): void {
    if (!changed.has('formulaKey')) return;
    const dialog = this.dialog;
    if (!dialog) return;
    // Guarded on the opening side only: showModal() on an open dialog throws
    // InvalidStateError, close() on a closed one is a no-op.
    if (this.formulaKey) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }

  private emitScripts(scripts: KeepScriptData): void {
    this.emit<KeepScriptsChangeDetail>('scripts-change', { scripts });
  }

  /** Kept as a stable reference so Lit does not re-set the property on every render. */
  private readonly handleRulesChange = (rules: KeepValidationRule[]): void => {
    this.emit<KeepValidationRulesChangeDetail>('validation-rules-change', { rules });
  };

  private handleTest(): void {
    this.emit('test-formulas');
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private toggleValidationExpanded(): void {
    this.validationExpanded = !this.validationExpanded;
  }

  private openDialog(key: FormulaKey): void {
    this.formula = (this.data[key] as KeepFormula | undefined)?.formula ?? '';
    this.formulaKey = key;
  }

  /**
   * The dialog's own `close`, which Escape also produces. Without this the key stayed set
   * behind a shut dialog, and since `updated()` only acts on a *change* the same formula
   * could never be reopened.
   */
  private handleDialogClose(): void {
    this.formulaKey = '';
  }

  private handleTypeFormula(event: Event): void {
    event.stopPropagation();
    this.formula = (event.target as HTMLTextAreaElement).value;
  }

  private handleToggleCompute(event: Event): void {
    event.stopPropagation();
    this.formComputed = (event.target as HTMLInputElement).checked;
  }

  private handleToggleContinue(event: Event): void {
    event.stopPropagation();
    this.continueOnError = (event.target as HTMLInputElement).checked;
  }

  private handleToggleSign(event: Event): void {
    event.stopPropagation();
    this.emitScripts({ ...this.data, sign: (event.target as HTMLInputElement).checked });
  }

  private handleClickSave(): void {
    // The dialog stays in the template while the panel is open, so Save is reachable with
    // nothing being edited. The original wrote a `""` property into the mode in that case.
    if (!this.formulaKey) return;

    this.emitScripts({
      ...this.data,
      [this.formulaKey]: { formulaType: 'domino', formula: this.formula },
      computeWithForm: this.formComputed,
      continueOnError: this.continueOnError,
    });
    this.formula = '';
    this.formulaKey = '';
  }

  private handleClickCancel(): void {
    this.formula = '';
    this.formulaKey = '';
    this.formComputed = Boolean(this.data.computeWithForm);
    this.continueOnError = Boolean(this.data.continueOnError);
  }

  private renderCardHeader(key: FormulaKey, title: string): TemplateResult {
    const stored = this.data[key] as KeepFormula | undefined;
    return html`
      <div class="formula-card-header">
        <p class="formula-label">${title}</p>
        <button
          type="button"
          class="icon-button"
          aria-label="Edit ${title}"
          ?disabled=${!stored}
          @click=${() => this.openDialog(key)}
        >
          <wa-icon library=${FA_LIBRARY} name="pencil"></wa-icon>
        </button>
      </div>
    `;
  }

  /** One paragraph: the formula, or the placeholder when there is nothing stored. */
  private renderCardText(key: FormulaKey): TemplateResult {
    const formula = (this.data[key] as KeepFormula | undefined)?.formula ?? '';
    return formula
      ? html`<p class="formula-text">${formula}</p>`
      : html`<p class="formula-placeholder">Enter Formula...</p>`;
  }

  private renderCard(key: FormulaKey): TemplateResult {
    return html`
      <div class="formula-card">
        ${this.renderCardHeader(key, titleOf(key))} ${this.renderCardText(key)}
      </div>
    `;
  }

  /** Write access is the only card that also reports whether the form computes it. */
  private renderWriteAccessCard(): TemplateResult {
    return html`
      <div class="formula-card">
        ${this.renderCardHeader('writeAccessFormula', titleOf('writeAccessFormula'))}
        <div class="formula-line">
          ${this.renderCardText('writeAccessFormula')}
          <p class="computed-note">
            Computed with Form - ${this.data.computeWithForm ? 'enabled' : 'disabled'}
          </p>
        </div>
      </div>
    `;
  }

  private renderSign(): TemplateResult {
    return html`
      <div class="sign">
        <section class="sign-row">
          <wa-switch
            id="sign"
            size="s"
            .checked=${live(Boolean(this.data.sign))}
            @change=${this.handleToggleSign}
          >
            Sign Document
            <keep-tooltip
              content="Please understand this option before enabling, see the documentation on enabling encryption."
              @click=${this.stopLabelActivation}
            >
              <wa-icon class="help-icon" library=${FA_LIBRARY} name="circle-question"></wa-icon>
            </keep-tooltip>
          </wa-switch>
        </section>
        <p class="sign-note">Please understand this option before enabling</p>
      </div>
    `;
  }

  private renderDialog(): TemplateResult {
    const isWriteAccess = this.formulaKey === 'writeAccessFormula';
    return html`
      <dialog aria-label=${titleOf(this.formulaKey)} @close=${this.handleDialogClose}>
        <div class="dialog-head">
          <keep-form-dialog-header
            heading=${titleOf(this.formulaKey)}
            @header-close=${this.handleDialogClose}
          ></keep-form-dialog-header>
        </div>
        <hr class="divider" />
        <div class="dialog-content">
          <div>
            ${isWriteAccess
              ? html`
                  <div class="compute-line compute">
                    <wa-switch
                      id="compute-with-form"
                      size="s"
                      .checked=${live(this.formComputed)}
                      @change=${this.handleToggleCompute}
                      >Compute with Form</wa-switch
                    >
                  </div>
                  <div class="compute-line continue ${this.formComputed ? '' : 'disabled'}">
                    <wa-switch
                      id="continue-on-error"
                      size="s"
                      .checked=${live(this.continueOnError)}
                      ?disabled=${!this.formComputed}
                      @change=${this.handleToggleContinue}
                      >Continue on Error</wa-switch
                    >
                  </div>
                `
              : nothing}
          </div>
          <wa-textarea
            id="formula"
            label="Formula"
            rows="5"
            placeholder="Enter Formula..."
            .value=${live(this.formula)}
            @input=${this.handleTypeFormula}
          ></wa-textarea>
        </div>
        <hr class="divider" />
        <div class="dialog-actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.handleClickCancel}
            >Cancel</keep-button
          >
          <keep-button @click=${this.handleClickSave}>Save</keep-button>
        </div>
      </dialog>
    `;
  }

  render() {
    return html`
      <div class="panel">
        <div class="panel-header">
          <p class="panel-title">Mode Settings</p>
          <div class="panel-actions">
            <button type="button" @click=${this.handleTest}>
              <wa-icon class="action-icon" library=${FA_LIBRARY} name="play"></wa-icon>
              <p class="action-label">Test Formulas</p>
            </button>
            <button
              type="button"
              class="icon-button"
              aria-expanded=${this.expanded ? 'true' : 'false'}
              aria-controls="mode-settings"
              aria-label=${this.expanded ? 'Collapse Mode Settings' : 'Expand Mode Settings'}
              @click=${this.toggleExpanded}
            >
              <wa-icon
                class="chevron"
                library=${FA_LIBRARY}
                name=${this.expanded ? 'chevron-up' : 'chevron-down'}
              ></wa-icon>
            </button>
          </div>
        </div>
        <div id="mode-settings">
          ${this.expanded
            ? html`
                <div class="formula-row">
                  ${this.renderCard('readAccessFormula')} ${this.renderWriteAccessCard()}
                </div>
                <div class="formula-row">
                  ${this.renderCard('deleteAccessFormula')} ${this.renderCard('onLoad')}
                </div>
                <div class="formula-row">${this.renderCard('onSave')} ${this.renderSign()}</div>
                ${this.renderDialog()}
              `
            : nothing}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <p class="panel-title">Validation Rules</p>
          <div class="panel-actions">
            <button
              type="button"
              class="icon-button"
              aria-expanded=${this.validationExpanded ? 'true' : 'false'}
              aria-controls="validation-rules"
              aria-label=${this.validationExpanded
                ? 'Collapse Validation Rules'
                : 'Expand Validation Rules'}
              @click=${this.toggleValidationExpanded}
            >
              <wa-icon
                class="chevron"
                library=${FA_LIBRARY}
                name=${this.validationExpanded ? 'chevron-up' : 'chevron-down'}
              ></wa-icon>
            </button>
          </div>
        </div>
        <div id="validation-rules">
          ${this.validationExpanded
            ? html`<keep-textform-array
                .data=${this.validationRules}
                .setData=${this.handleRulesChange}
                title="message"
              ></keep-textform-array>`
            : nothing}
        </div>
      </div>
    `;
  }

  /**
   * The sign-document help glyph sits inside the switch's label slot, which is the only
   * place it can sit and keep both the original left-to-right order and a real label on
   * the switch. A click anywhere in a `<label>` activates its control, so without this
   * the glyph would toggle signing — which it never did when it was a sibling.
   */
  private stopLabelActivation(event: Event): void {
    event.stopPropagation();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-script-editor': ScriptEditor;
  }
}
