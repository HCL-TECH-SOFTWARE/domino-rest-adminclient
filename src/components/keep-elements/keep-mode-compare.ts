/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import './keep-button';
import './keep-form-dialog-header';
import './keep-search-input';
import './keep-tooltip';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { FA_LIBRARY } from '../../services/icon-library';
import { getFieldIndex, getFormModeIndex } from '../../store/databases/scripts';
import { isFieldEqual, isFormulaEqual, isKeyEqual } from '../access/mode-diff';
import type { Field, Mode } from '../../store/databases/types';
import type { KeepSearchChangeDetail } from './keep-search-input';

/** Close is a signal, not a payload. */
export type KeepModeCompareCloseDetail = undefined;

/** The five mode-level formulas the dialog compares, in display order. */
const FORMULAS = [
  'computeWithForm',
  'onLoad',
  'onSave',
  'readAccessFormula',
  'writeAccessFormula',
] as const;

/** Two keys are the row's identity rather than data, so they are never compared or shown. */
const IDENTITY_KEYS = ['name', 'externalName'];

/** One field value, rendered. Objects are shown as JSON, as they were before. */
function getValue(field: Field, key: string): string | null {
  if (IDENTITY_KEYS.includes(key)) return null;
  const value = field[key as keyof typeof field];
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** `readAccessFormula` reads as "Read Access Formula". */
function getProperKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Side-by-side comparison of a form's access modes, one column per mode, with every
 * differing field key and formula marked. Tag: `keep-mode-compare`. Exposed via
 * `KeepElements.tsx` as `KeepModeCompare`, because `access/AccessMode.tsx` is still React.
 *
 * Replaces `components/access/ModeCompare.tsx`.
 *
 * ## The mode list arrives as a property
 *
 * The component this replaces took the whole fetched schema and dug the modes out of it
 * with `forms[getFormIndex(forms, formName)].formModes` — a lookup that returns `undefined`
 * for a schema that does not contain the form, and then reads `.formModes` off it. The
 * parent already computes exactly that list for its own use, so it passes it in and the
 * lookup is gone. `formName` comes with it: the original read the route, which an element
 * has no business doing for a value its parent already holds.
 *
 * ## Selection state stays here
 *
 * Which modes are being compared, what is typed in the filter, and whether the
 * differences-only toggle is on are all local to the dialog — the parent never read any of
 * them. So they are internal state and nothing named `value` or `selected` is accepted as a
 * property: the bridge to the React parent re-applies every declared property on every
 * parent render with no dirty check, and a two-way value would overwrite the user's choice.
 *
 * ## Drag and drop
 *
 * The original put a `draggable` attribute on the *empty* mode card and on nothing else,
 * and no `dragstart`, `dragover` or `drop` handler exists anywhere in the file — column
 * reordering was started and never finished. The attribute is carried over so the
 * conversion changes nothing, but it does nothing today.
 *
 * If a drop target is ever added here, the dragged item's identity must travel in the
 * event's own `detail`. Drag events compose and cross a shadow boundary, but `event.target`
 * **retargets to the host**, so a listener outside this element reading `event.target`
 * would see `<keep-mode-compare>` rather than the card that was dragged.
 *
 * @fires dialog-close - `CustomEvent<undefined>` from the header button, Escape, or the
 *   backdrop-dismiss path. The original wired none of these to the parent, so Escape closed
 *   the native dialog while the parent still believed it was open — and it could not then
 *   be reopened.
 */
@customElement('keep-mode-compare')
export default class ModeCompare extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /*
       * The dialog carried both .dialog and .full-width. Those set width to 30% and 100%
       * respectively at equal specificity, and .full-width is declared later in the sheet,
       * so 100% is the width this dialog has always had.
       *
       * The border was a light-dark() pair of a transparent light edge and a dark hex; the
       * converted dialogs all use the surface border token instead, which also gives light
       * mode the hairline it never had.
       */
      dialog {
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        width: 100%;
        height: fit-content;
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
        flex-direction: column;
        gap: 30px;
        display: none;
        padding: 30px;
      }

      dialog[open] {
        display: flex;
      }

      /*
       * The document reset is Web Awesome's wa-native layer, which sets box-sizing through
       * a universal selector. A universal selector does not cross a shadow boundary, and
       * the cards below are sized with percentage widths against their own padding, so
       * without this every column overflows its row.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /* was .dialog-content */
      .content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      /* was the flex/flex-col/full-width/justify-between/items-center utility stack */
      .controls {
        display: flex;
        flex-direction: column;
        width: 100%;
        justify-content: space-between;
        align-items: center;
      }

      /* was flex/flex-row/pb-10 */
      .search-row {
        display: flex;
        flex-direction: row;
        width: 100%;
        padding-bottom: 10px;
      }

      /*
       * Was .mode-compare-search-bar wrapped around a bare input and a loose icon. The
       * shared search element already owns the icon, the placeholder-as-label fix and a
       * focus ring, so only the sizing that made this bar different is restated. Its border
       * literal of #9a9a9a becomes the surface token, which is what makes the bar visible
       * against a dark surface as well as a light one.
       */
      .search {
        width: 50%;
        margin-left: 25%;
      }

      /* .add-container has no rule in any stylesheet; the box is kept as the layout anchor
         that pushes the button to the end of the row. */
      .add-column {
        display: flex;
        align-items: center;
        margin-left: auto;
      }

      /*
       * The toggle row. Its only rule lived in dark-mode.css as
       * background-color: light-dark(inherit, …), which never applied at all: inherit is
       * not a valid component value inside that function, so the whole declaration is
       * dropped at parse time. Nothing is reproduced because nothing ever rendered.
       */
      .toggle {
        display: flex;
        align-items: center;
      }

      /* was the ModeCardsContainer Linaria block */
      .cards {
        padding: 0;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 75vh;
        gap: 0 10px;
        overflow-y: scroll;
      }

      @media (max-height: 500px) {
        .cards {
          height: 50vh;
        }
      }

      @media (min-height: 501px) and (max-height: 600px) {
        .cards {
          height: 60vh;
        }
      }

      @media (min-height: 601px) and (max-height: 900px) {
        .cards {
          height: 65vh;
        }
      }

      @media (min-height: 901px) and (max-height: 1200px) {
        .cards {
          height: 75vh;
        }
      }

      @media (min-height: 1201px) {
        .cards {
          height: 80vh;
        }
      }

      .row {
        display: flex;
        flex-direction: row;
        gap: 10px;
      }

      .card-top {
        border-radius: 10px 10px 0 0;
        margin-left: 4px;
        height: fit-content;
        box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
        min-width: 332px;
        width: calc(50% - 10px - 4px);
        padding: 0;
      }

      .summary-container {
        padding: 0 40px 24px 40px;
      }

      .mode-details {
        font-style: italic;
        padding-top: 15px;
        padding-bottom: 21px;
        gap: 9px;
      }

      /* the empty card's placeholder line, which was .mode-compare-normal-font */
      .mode-details.plain {
        font-style: normal;
      }

      .fields-summary {
        padding-top: 17px;
        display: flex;
      }

      /* was the literal #646464, a mid grey that all but vanishes on a dark surface */
      .total-fields {
        color: var(--wa-color-text-quiet);
        font-size: var(--wa-font-size-m);
      }

      .fields-number {
        font-size: 20px;
        padding-left: 5px;
      }

      .summary-content {
        display: flex;
        flex-direction: row;
        margin-left: auto;
        align-items: center;
      }

      .field-detail {
        padding: 20px 40px;
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        min-width: 332px;
        margin-left: 4px;
        box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
        width: calc(50% - 10px - 4px);
      }

      .field-row {
        display: flex;
        flex-direction: row;
        gap: 10px;
      }

      .hidden {
        display: none;
      }

      .field-name {
        color: var(--wa-color-text-normal);
        font-size: 16px;
        font-style: normal;
        font-weight: 700;
        line-height: normal;
        padding-left: 15px;
      }

      /*
       * The "these two differ" highlight. It was the literal #ffdeea, a pale pink, and the
       * text drawn on it is the mode-aware normal-text token — so in dark mode a light
       * label landed on a light pink panel and the differing rows became the only
       * unreadable ones on the screen. The danger quiet fill is the token pair Web Awesome
       * derives for exactly this "tinted surface, normal text" role, and it is defined on
       * both sides of the theme.
       */
      .diff {
        background: var(--wa-color-danger-fill-quiet);
      }

      /* was the literal #323a3d, i.e. the light-mode primary text colour written out */
      .key-text {
        color: var(--wa-color-text-normal);
        font-size: var(--wa-font-size-m);
        display: flex;
        flex-direction: row;
        padding-top: 12px;
        flex-wrap: wrap;
        gap: 4px 0;
      }

      .key-diff {
        font-weight: bold;
      }

      /* was .mode-compare-card-container */
      .card-header {
        display: flex;
        padding-top: 9px;
        padding-bottom: 20px;
      }

      /* was .mode-compare-delete-container */
      .delete-spacer {
        display: flex;
        width: calc(50% + 103px);
        justify-content: end;
      }

      /*
       * .mode-compare-delete-adjacent — a 103x7 pill whose background was #fff. On the
       * light surface it sat on it was invisible, which is evidently the point: it is a
       * spacer. On a dark surface the same literal drew a white streak across every card.
       * The raised-surface token keeps it invisible in both.
       */
      .delete-adjacent {
        width: 103px;
        height: 7px;
        border-radius: 50px;
        background: var(--wa-color-surface-raised);
      }

      /* was .empty-mode-card-container */
      .card-actions {
        display: flex;
        width: 42.5%;
        justify-content: end;
        padding-right: 20px;
        padding-top: 10px;
      }

      /*
       * The remove control was DeleteIcon: a 20px div painting one base64 trash SVG and
       * swapping to a second, filled one on hover, with a click handler and nothing else.
       * Not focusable, not in the accessibility tree, no accessible name. A registered Font
       * Awesome glyph draws the same can without 3 kB of data URI, and it is a real button
       * now (#713) — the same substitution keep-slim-database-card made.
       */
      .remove-mode {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        width: 20px;
        height: 20px;
        border: none;
        background: none;
        cursor: pointer;
        color: var(--wa-color-danger-60);
        font-size: 20px;
      }

      .remove-mode:focus-visible {
        border-radius: var(--wa-border-radius-s);
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /* .mode-compare-divider — the literal was #000, which is invisible in dark mode */
      .divider {
        height: 1px;
        background: var(--wa-color-surface-border);
      }

      /*
       * .mode-menu carried no rule in any stylesheet, so the select is sized here. The
       * label is real but visually hidden: Web Awesome needs it for the accessible name,
       * and showing it would push a caption above every column that the original layout
       * has no room for.
       */
      wa-select {
        width: 100%;
        margin: 10px 0;
      }

      wa-select::part(form-control-label) {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }

      /* was .mode-compare-formulas-container */
      .formula-block {
        display: flex;
        flex-direction: column;
        width: 100%;
        align-content: center;
      }

      /* was .mode-compare-formulas-content and .compare-filled-card-container, which were
         the same four declarations written out twice */
      .entry {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 8px 0;
      }

      /* was .diff-formulas-container and .mode-compare-indicators-container */
      .indicator {
        width: 15px;
      }

      .formula-name {
        width: calc(0.4 * (100% - 15px));
        overflow-wrap: break-word;
      }

      /* was .mode-compare-formula-name, a light-dark() pair of two greys */
      .formula-name span {
        color: var(--wa-color-text-quiet);
        font-size: 14px;
        line-height: normal;
      }

      .formula-value {
        width: calc(0.6 * (100% - 15px));
        overflow-wrap: break-word;
      }

      .formula-value span {
        line-height: normal;
      }

      /* .compare-diff-values-indicator. The pink is kept: it is a decorative marker rather
         than text, and it reads on both surfaces. */
      .diff-dot {
        width: 8px;
        height: 8px;
        color: #c3335f;
        display: block;
        margin: auto 0;
      }

      .stack {
        display: flex;
        flex-direction: column;
      }
    `,
  ];

  /** Drives `showModal()` / `close()` on the inner native dialog. */
  @property({ type: Boolean }) accessor open = false;

  /** Named in the dialog heading. The original read it back off the route. */
  @property({ type: String }) accessor formName = '';

  /** Every mode of the form being compared. The parent already has this list. */
  @property({ type: Array }) accessor modes: Array<Mode> = [];

  /** Which of {@link modes} the editor is on — the first column when the dialog opens. */
  @property({ type: Number }) accessor currentModeIndex = 0;

  /** One entry per column. An empty string is an added, not-yet-chosen column. */
  @state() accessor selectedModeNames: string[] = [];

  /** Field name → the keys that differ across the selected modes. */
  @state() accessor diffFields: Record<string, string[]> = {};

  /** Which of {@link FORMULAS} differ across the selected modes. */
  @state() accessor diffFormulas: string[] = [];

  /** Every field name present in any selected mode. */
  @state() accessor allFieldNames: string[] = [];

  @state() accessor showDiffOnly = false;

  @state() accessor searchInput = '';

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  /** A column can only be removed once there are more than the two being compared. */
  private get showRemove(): boolean {
    return this.selectedModeNames.length > 2;
  }

  private get filteredFields(): string[] {
    const key = this.searchInput.toLowerCase();
    if (key.length === 0) return this.allFieldNames;
    return this.allFieldNames.filter((name) => name.toLowerCase().indexOf(key) !== -1);
  }

  /**
   * The pair the dialog opens on: the mode being edited, plus one other to compare it with.
   *
   * The original read `allModes[1].modeName` unguarded whenever the current mode was the
   * first one, so a form with a single mode crashed the dialog. The parent disables the
   * button that opens it in that case, which is why it was never seen — but the parent
   * checks a different list than the one this reads. One column is the honest answer.
   */
  private initialSelection(): string[] {
    const current = this.modes[this.currentModeIndex];
    if (this.currentModeIndex < 0 || !current) return [];
    const other = this.currentModeIndex === 0 ? this.modes[1] : this.modes[0];
    return other ? [current.modeName, other.modeName] : [current.modeName];
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    // Reopening, or a change to the mode list behind it, resets the comparison — matching
    // the effect this replaces, which listed all three of these as dependencies.
    if (
      this.open &&
      (changed.has('open') || changed.has('modes') || changed.has('currentModeIndex'))
    ) {
      this.selectedModeNames = this.initialSelection();
    }
    // Reactive state written above lands in this same `changed` map, so the recomputation
    // below sees the new selection without a second update cycle.
    if (changed.has('selectedModeNames') || changed.has('modes')) {
      this.recomputeDiff();
    }
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    const dialog = this.nativeDialog;
    if (!dialog) return;
    if (this.open) {
      // showModal() on an already-open dialog throws InvalidStateError; close() on a closed
      // one is a no-op and needs no guard.
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }

  /**
   * Work out what differs between the selected modes.
   *
   * The four predicates live in `access/mode-diff.ts` — they were extracted from this
   * component's effect by #827 precisely so they would survive this conversion.
   */
  private recomputeDiff(): void {
    const selected = this.selectedModeNames;
    const modes = this.modes;
    if (selected.length < 2) return;
    // Every predicate indexes `modes` by the *first* selected name without checking the
    // result, so a first column that names no mode took the dialog down. Reachable: an
    // added column starts empty, and removing the columns in front of it leaves it first.
    if (getFormModeIndex(modes, selected[0]) < 0) return;

    const chosen = modes.filter((mode) => selected.includes(mode.modeName));

    const fieldNames = Array.from(
      new Set(chosen.flatMap((mode) => mode.fields.map((field: Field) => field.name))),
    );
    this.allFieldNames = fieldNames;

    // Deliberately every key of every field in every selected mode, not just this field's:
    // that is what the original collected, and `isKeyEqual` is what narrows it back down.
    const allKeys = Array.from(
      new Set(chosen.flatMap((mode) => mode.fields.flatMap((field: Field) => Object.keys(field)))),
    );

    const diffFields: Record<string, string[]> = {};
    fieldNames.forEach((fieldName) => {
      if (isFieldEqual(modes, selected, fieldName)) return;
      diffFields[fieldName] = allKeys.filter(
        (key) => !IDENTITY_KEYS.includes(key) && !isKeyEqual(modes, selected, fieldName, key),
      );
    });
    this.diffFields = diffFields;

    this.diffFormulas = FORMULAS.filter((formula) => !isFormulaEqual(modes, selected, formula));
  }

  private handleClose(): void {
    this.emit<KeepModeCompareCloseDetail>('dialog-close');
  }

  private handleModeChange(event: Event, index: number): void {
    // The inner control's change event composes, so a consumer would otherwise see this
    // column change as a change of the dialog itself.
    event.stopPropagation();
    const newMode = (event.target as HTMLInputElement).value;
    this.selectedModeNames = this.selectedModeNames.map((mode, idx) =>
      idx === index ? newMode : mode,
    );
  }

  private handleShowDiff(event: Event): void {
    event.stopPropagation();
    this.showDiffOnly = (event.target as HTMLInputElement).checked;
  }

  private handleSearchField(event: CustomEvent<KeepSearchChangeDetail>): void {
    event.stopPropagation();
    this.searchInput = event.detail.value;
  }

  private handleAddColumn(): void {
    this.selectedModeNames = [...this.selectedModeNames, ''];
  }

  private handleRemoveMode(index: number): void {
    this.selectedModeNames = this.selectedModeNames.filter((_mode, idx) => idx !== index);
  }

  /** The pink dot that marks a differing key or formula. */
  private renderDot(differs: boolean) {
    if (!differs) return nothing;
    return html`
      <svg
        width="9"
        height="8"
        viewBox="0 0 9 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="diff-dot"
        aria-hidden="true"
      >
        <circle cx="4.07712" cy="4" r="4" fill="currentColor"></circle>
      </svg>
    `;
  }

  /** One "Key: value" line, with its difference marker. */
  private renderEntry(label: string, value: unknown, differs: boolean) {
    return html`
      <div class="entry">
        <div class="indicator">${this.renderDot(differs)}</div>
        <div class="formula-name"><span>${getProperKey(label)}:</span></div>
        <div class="formula-value">
          <span class=${differs ? 'key-diff' : ''}>${value}</span>
        </div>
      </div>
    `;
  }

  private renderRemove(index: number, label: string) {
    if (!this.showRemove) return html`<div class="card-actions"></div>`;
    return html`
      <div class="card-actions">
        <keep-tooltip content=${label}>
          <button
            type="button"
            class="remove-mode"
            aria-label=${label}
            @click=${() => this.handleRemoveMode(index)}
          >
            <wa-icon library=${FA_LIBRARY} name="trash"></wa-icon>
          </button>
        </keep-tooltip>
      </div>
    `;
  }

  private renderModeSelect(modeName: string, index: number) {
    return html`
      <wa-select
        label="Mode"
        appearance="outlined"
        .value=${live(modeName)}
        @change=${(event: Event) => this.handleModeChange(event, index)}
      >
        ${this.modes.map(
          (mode) => html`<wa-option value=${mode.modeName}>${mode.modeName}</wa-option>`,
        )}
      </wa-select>
    `;
  }

  /** A column header: the mode picker, the field count, and the remove control. */
  private renderModeCard(modeName: string, index: number) {
    const empty = modeName === '';
    const mode = empty ? undefined : this.modes[getFormModeIndex(this.modes, modeName)];
    const count = mode?.fields.length;
    // `.draggable`, not a `draggable` attribute: draggable is an enumerated attribute whose
    // invalid-value default is `auto`, so an interpolated empty string would silently mean
    // "not draggable". The IDL property writes the right literal either way.
    return html`
      <div class="card-top" .draggable=${empty}>
        <div class="card-header">
          <div class="delete-spacer"><div class="delete-adjacent"></div></div>
          ${this.renderRemove(
            index,
            empty ? 'Delete empty mode card' : 'Remove mode from comparison',
          )}
        </div>
        <div class="summary-container">
          ${this.renderModeSelect(modeName, index)}
          <div class="mode-details ${empty ? 'plain' : ''}">
            ${empty ? 'Select a mode to compare.' : `${count ?? 0} form field/s`}
          </div>
          <div class="divider"></div>
          <div class="fields-summary">
            <div class="summary-content">
              <span class="total-fields">Total Fields:</span>
              <span class="fields-number">${empty ? 'N/A' : (count ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /** The formulas row: one cell per column, each listing all five. */
  private renderFormulaRow() {
    const anyDiff = this.diffFormulas.length > 0;
    const hidden = this.showDiffOnly && !anyDiff ? 'hidden' : '';
    return html`
      <div class="field-row ${hidden}">
        ${this.selectedModeNames.map((modeName) => {
          if (modeName === '') return html`<div class="field-detail"></div>`;
          const mode = this.modes[getFormModeIndex(this.modes, modeName)];
          return html`
            <div class="field-detail ${anyDiff ? 'diff' : ''}">
              <div class="field-name">Formulas</div>
              ${FORMULAS.map((formula) =>
                this.renderEntry(
                  formula,
                  JSON.stringify(mode?.[formula as keyof Mode]),
                  this.diffFormulas.includes(formula),
                ),
              )}
            </div>
          `;
        })}
      </div>
    `;
  }

  /** One field's row: its value in each selected mode, or a "not here" marker. */
  private renderFieldRow(fieldName: string) {
    const diffKeys = this.diffFields[fieldName];
    const differs = diffKeys !== undefined;
    const hidden = this.showDiffOnly && !differs ? 'hidden' : '';
    return html`
      <div class="field-row ${hidden}">
        ${this.selectedModeNames.map((modeName) => {
          if (modeName === '') return html`<div class="field-detail"></div>`;
          const mode = this.modes[getFormModeIndex(this.modes, modeName)];
          const field = mode ? mode.fields[getFieldIndex(mode.fields, fieldName)] : undefined;
          return html`
            <div class="field-detail ${differs ? 'diff' : ''}">
              ${field
                ? html`
                    <div class="stack">
                      <div class="field-name">${fieldName}</div>
                      <div class="key-text">
                        ${Object.keys(field)
                          .filter((key) => !IDENTITY_KEYS.includes(key))
                          .map((key) =>
                            this.renderEntry(
                              key,
                              getValue(field, key),
                              (diffKeys ?? []).includes(key),
                            ),
                          )}
                      </div>
                    </div>
                  `
                : html`
                    <div class="diff">
                      <span class="field-name">*Field not existing</span>
                    </div>
                  `}
            </div>
          `;
        })}
      </div>
    `;
  }

  render(): TemplateResult {
    const heading = `Mode Compare - ${this.formName} Form`;
    // Accessibility (#713):
    //  - aria-label rather than aria-labelledby: the heading lives in the header element's
    //    own shadow root and an IDREF cannot cross a shadow boundary.
    //  - the cancel event is forwarded, so Escape tells the parent the dialog closed. It
    //    did not before, and the parent's flag stayed true, so the dialog never reopened.
    //  - the toggle's caption is the switch's own label rather than loose text beside it.
    return html`
      <dialog aria-label=${heading} @cancel=${this.handleClose}>
        <keep-form-dialog-header
          heading=${heading}
          @header-close=${this.handleClose}
        ></keep-form-dialog-header>
        <div class="content">
          <div class="controls">
            <div class="search-row">
              <keep-search-input
                class="search"
                placeholder="Search Field"
                label="Search Field"
                @search-change=${this.handleSearchField}
              ></keep-search-input>
              <div class="add-column">
                <keep-button icon="plus" @click=${this.handleAddColumn}>
                  Add New Column
                </keep-button>
              </div>
            </div>
            <div class="toggle">
              <wa-switch
                size="s"
                .checked=${this.showDiffOnly}
                @change=${this.handleShowDiff}
              >
                Show only fields and formulas with differences
              </wa-switch>
            </div>
          </div>
          <div class="cards">
            <div class="row">
              ${this.selectedModeNames.map((modeName, index) =>
                this.renderModeCard(modeName, index),
              )}
            </div>
            ${this.renderFormulaRow()}
            ${this.filteredFields.map((fieldName) => this.renderFieldRow(fieldName))}
          </div>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-mode-compare': ModeCompare;
  }
}
