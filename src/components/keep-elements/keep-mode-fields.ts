/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import './keep-button';
import './keep-checkbox';
import './keep-field-container';
import './keep-form-dialog-header';
import './keep-script-editor';
import './keep-tooltip';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { FA_LIBRARY } from '../../services/icon-library';
import { capitalizeFirst, insertCharacter } from '../../utils/common';
import { store } from '../../store/store';
import { toggleAlert } from '../../store/alerts/action';
import type { KeepFieldItem } from './keep-field-container';
import type { KeepScriptData, KeepValidationRule } from './keep-script-editor';

/**
 * The mode's field lists, keyed by "droppable" id. Only the first key is ever read for
 * the panel's own decisions; the row loop still walks every key, as the original did.
 */
export type KeepModeFieldState = Record<string, KeepFieldItem[]>;

/** `event.detail` of `fields-remove`. The whole batch, not a delta. */
export interface KeepFieldsRemoveDetail {
  /** Every field the user ticked, in the order they were ticked. */
  fields: KeepFieldItem[];
}

/** `event.detail` of `field-index-change`. */
export interface KeepFieldIndexChangeDetail {
  /** Position of the newly selected field inside the mode's list. */
  fieldIndex: number;
}

/** The shape a custom field is created with. Matches what the original literal built. */
const newField = (name: string): KeepFieldItem => ({
  content: name,
  externalName: name,
  type: 'string',
  format: 'string',
  isMultiValue: false,
  name,
  fieldAccess: 'RW',
  fieldGroup: '',
});

/** Two fields are the same row when both their storage name and their content match. */
const sameField = (a: KeepFieldItem, b: KeepFieldItem): boolean =>
  a.content === b.content && a.name === b.name;

/**
 * The `R / W` badge. An explicit `fieldAccess` wins; otherwise it is derived from the
 * read-only / write-only pair, which is how older schemas record the same thing.
 */
const accessFlag = (item: KeepFieldItem): string => {
  const fieldAccess = item.fieldAccess;
  if (fieldAccess != null && fieldAccess.trim() !== '') {
    return insertCharacter(fieldAccess, 1, ' / ');
  }
  if (item.readOnly && !item.writeOnly) return 'R / O';
  if (!item.readOnly && item.writeOnly) return 'W / O';
  return 'R / W';
};

/** A single-value field carries its format directly; an array carries it under `items`. */
const displayFormat = (item: KeepFieldItem): string =>
  (item.isMultiValue ? (item.items ? item.items.format : item.format) : item.format) ?? '';

/**
 * The Access tab's field panel. Tag: `keep-mode-fields`.
 *
 * Left: the current mode's fields, with an add box and a batch-delete mode. Right: the
 * selected field's settings (`keep-field-container`) over the mode's scripts and
 * validation rules (`keep-script-editor`).
 *
 * ## The name
 *
 * This was `access/FieldDndContainer.tsx`, and the name was a fossil: there is no
 * drag-and-drop here and there is no drag-and-drop library in the tree. Selecting a field
 * is a plain click on a row. The element is named for what it is.
 *
 * ## Store access
 *
 * It selects nothing. `TabsAccess` above it owns the mode list, the `required` array, the
 * scripts and the validation rules, so all four arrive as properties and every edit leaves
 * as an event — a `StoreController` here would fight the React bridge, which re-applies
 * every property on every parent render with no dirty check.
 *
 * The one store interaction is the success alert after a batch delete, which only
 * dispatches. That goes straight through the imported `store`: a controller with no
 * selector would add a subscription that can never fire.
 *
 * **That alert never appeared before.** The original called the action creator and threw
 * the action away — `toggleAlert(...)` with no dispatch around it, which `createSlice`
 * makes a silent no-op rather than an error (#710 turned it from a thunk into a plain
 * creator). It is dispatched now.
 *
 * ## Why `addField` is a function property and nothing else is
 *
 * It **returns** the outcome: an empty string on success, `The name already exists.` when
 * the mode already has that field, and that string is what the inline error renders. An
 * event cannot carry a synchronous answer back, and the alternative — emit, then have
 * `TabsAccess` push an error property back down — would add state to a component that is
 * staying as it is. Everything else that leaves this element is a one-way notification, so
 * everything else is an event.
 *
 * ## Events from the two nested elements pass straight through
 *
 * `field-update`, `required-change`, `scripts-change`, `validation-rules-change` and
 * `test-formulas` are emitted by `keep-field-container` and `keep-script-editor`. Every
 * `emit()` from `KeepElement` is composed and bubbling, so they cross this element's
 * shadow boundary and reach a listener on the host unchanged. They are deliberately *not*
 * re-emitted here: a re-emit on top of a bubbling original delivers each edit twice, and
 * the second copy of a `scripts-change` would overwrite the mode with a stale object.
 *
 * ## Accessibility (#713)
 *
 * - A field row was a `div` with a click handler: no role, no focus, unreachable from the
 *   keyboard. The selectable part is a real button now, with `aria-current` marking the
 *   selected row. The batch checkbox stays a sibling of that button rather than a child,
 *   so there is no nested interactive control.
 * - The add box had `hiddenLabel`, so its only name was whatever a browser inferred from
 *   the placeholder. It has a real label, clipped so the row looks the same.
 * - The add button was an icon with a `title`, and both batch checkboxes had no name at
 *   all. All three are named now.
 * - The inline "name already exists" message is a live region, so it is announced rather
 *   than only appearing.
 *
 * ## What the shadow boundary cost
 *
 * The eighteen `.field-*` / `.selected-fields-*` / `.batch-delete-*` rules in `styles.css`,
 * the `.dialog` family, the thirty-odd utility classes layered on top of them, and the
 * universal box-sizing reset — which arrives through Web Awesome's `wa-native` layer and
 * so stops at the boundary like every selector that is not a custom property. All restated
 * below. The `--text-color-*` custom properties are read rather than copied, because those
 * do cross and stay mode-aware.
 *
 * @fires fields-remove - `CustomEvent<KeepFieldsRemoveDetail>`
 * @fires field-index-change - `CustomEvent<KeepFieldIndexChangeDetail>`
 * @fires field-update - `CustomEvent<KeepFieldUpdateDetail>`, from `keep-field-container`
 * @fires required-change - `CustomEvent<KeepRequiredChangeDetail>`, from `keep-field-container`
 * @fires scripts-change - `CustomEvent<KeepScriptsChangeDetail>`, from `keep-script-editor`
 * @fires validation-rules-change - `CustomEvent<KeepValidationRulesChangeDetail>`, from `keep-script-editor`
 * @fires test-formulas - `CustomEvent<undefined>`, from `keep-script-editor`
 */
@customElement('keep-mode-fields')
export default class ModeFields extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /*
       * The page's border-box reset is Web Awesome's wa-native layer, applied through a
       * universal selector — which does not cross a shadow boundary. Without this the
       * percentage widths below stop covering their own padding and the two columns
       * overflow the tab.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * was the root div: full-height flex gap-16. overflow-x is new: below the panel's
       * min-width plus the editor's own minimum, the row no longer fits the tab's width,
       * and a scrollbar here reads better than the add-field row silently overlapping the
       * delete button did.
       */
      :host {
        display: flex;
        gap: 16px;
        height: 100%;
        overflow-x: auto;
      }

      /*
       * was .selected-fields-container.flex.flex-col.gap-10.full-height.quarter-width.
       * 25% is fluid on a wide window, which is all the original ever had to be; min-width
       * is new — below it the add-field input and its button no longer both fit the row,
       * so the panel holds this floor and the tab scrolls horizontally instead.
       */
      .field-list-panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 25%;
        min-width: 220px;
        height: 100%;
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 5px;
        background: var(--wa-color-surface-default);
      }

      /* was .flex.items-center.pl-20.pt-5.m-0 */
      .add-row {
        display: flex;
        align-items: center;
        padding-left: 20px;
        padding-top: 5px;
        margin: 0;
      }

      /*
       * min-width: 0 overrides the flex default of auto, which sizes a flex item to its
       * content's intrinsic minimum — a wa-input does not shrink past that on its own, so
       * without this the box held its width regardless of the panel around it and only
       * looked responsive once the window was wide enough to never test the shrink.
       */
      .add-input {
        flex: 1;
        min-width: 0;
      }

      /*
       * The add box carried hiddenLabel, so it had no accessible name. Clipped rather
       * than removed, so the row is unchanged and the name still reaches assistive tech.
       */
      wa-input::part(label) {
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

      /* was .field-list-icon-button */
      .add-button {
        flex-shrink: 0;
        border: 0;
        background: none;
        user-select: none;
        cursor: pointer;
        color: var(--wa-color-text-normal);
      }

      /* was .add-icon. wa-icon takes its box from the font size, and xl is what an
         unsized Material glyph became everywhere else in this pass. */
      .add-icon {
        margin: 0 5px;
        font-size: var(--wa-font-size-xl);
      }

      /* was .color-text-danger.small-text */
      .error-text {
        color: var(--text-color-danger);
        font-size: 14px;
      }

      /*
       * was hr.divider. The literal grey was #cbcbcb with no dark override, so the line
       * stayed light on the dark surface; the border token is the mode-aware equivalent.
       * The user-agent border is cleared because it is still drawn inside a shadow root,
       * and on top of a 1px box it read as a two-tone rule rather than a hairline.
       */
      hr {
        height: 1px;
        width: 100%;
        padding: 0;
        margin: 0;
        border: 0;
        background: var(--wa-color-surface-border);
      }

      /* was .flex.justify-end.field-batch-delete-container */
      .batch-bar {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        max-width: 100%;
        padding: 0 11px;
      }

      /* was .flex.justify-between.full-width.p-0.items-center */
      .batch-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0;
      }

      .batch-buttons {
        display: flex;
        flex-wrap: wrap;
      }

      /* was .field-batch-delete-button, on a Material Button */
      .text-button {
        display: flex;
        justify-content: end;
        align-items: end;
        width: fit-content;
        padding: 10px;
        border: 0;
        background-color: transparent;
        cursor: pointer;
      }

      .text-button:disabled {
        cursor: default;
      }

      /*
       * was .field-batch-delete-text, whose pair was #aa1f51 light / #e06385 dark. The
       * danger-text token is the measured, mode-aware equivalent — see keep-theme.css,
       * where it is pinned to the ramp step that clears AA on each surface.
       */
      .danger-text {
        text-transform: none;
        font-size: 12px;
        font-weight: 400;
        color: var(--text-color-danger);
        text-overflow: ellipsis;
        margin: 0;
        padding: 0;
      }

      /*
       * The disabled halves. In the document sheet these never rendered: .color-text-disabled
       * is declared ~570 lines before .field-batch-delete-text, so at equal specificity the
       * red won, and the dark-mode pair repeated the inversion. Both buttons therefore looked
       * live while being unclickable. Scoping the rule to the shadow root puts the grey back.
       */
      .text-button:disabled .danger-text,
      .danger-text.disabled {
        color: var(--text-color-disabled);
      }

      /* was .batch-delete-cancel-button.m-0.p-0.tiny-text */
      .cancel-text {
        text-transform: none;
        font-size: 12px;
        font-weight: 400;
        color: var(--wa-color-text-normal);
        text-overflow: ellipsis;
        margin: 0;
        padding: 0;
      }

      /* was .field-list-container.p-0.pb-10.m-0 */
      .field-list {
        overflow-y: auto;
        overflow-x: clip;
        padding: 0 0 10px 0;
        margin: 0;
      }

      /* was .field-list-custom-item.flex.items-center.full-width.small-text */
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 10px 20px;
        font-size: 14px;
      }

      /*
       * The hover pair was #d7e0f3 light / #353548 dark. --keep-surface-highlight is the
       * app's own token for exactly that role and resolves to #e6ebf5 / #3a3a5a.
       */
      .row:hover {
        background: var(--keep-surface-highlight);
      }

      /*
       * was .field-list-field-info, on a div inside a div with the click handler. A button
       * now, so the row is reachable from the keyboard; the reset undoes the control
       * appearance the row never had.
       */
      .row-select {
        display: block;
        width: 60%;
        padding: 0;
        border: 0;
        background: none;
        font: inherit;
        text-align: left;
        text-overflow: ellipsis;
        cursor: pointer;
      }

      /* was .field-list-field-name */
      .row-name {
        display: block;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--wa-color-text-normal);
      }

      /* was .field-list-field-metadata */
      .row-meta {
        display: block;
        font-size: 12px;
        white-space: nowrap;
        text-align: left;
        color: var(--wa-color-text-normal);
      }

      /* was .please-add-fields-text.small-text.text-italic.p-20.m-0 */
      .empty-text {
        font-size: 14px;
        font-style: italic;
        font-weight: 400;
        padding: 20px;
        margin: 0;
        color: var(--wa-color-text-normal);
      }

      /* was .flex.flex-col.full-width.full-height.gap-20 */
      .editor-panel {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        height: 100%;
      }

      /* was .field-config-field-container.p-0.full-width */
      .no-field {
        width: 100%;
        height: 45%;
        padding: 0;
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 5px;
        background: var(--wa-color-surface-default);
      }

      /* was .field-config-field-setting */
      .no-field-title {
        width: 100%;
        height: 15%;
        padding: 10px 20px 0 20px;
        font-size: 16px;
        font-weight: 700;
        color: var(--wa-color-text-normal);
      }

      /* was .field-select-message-container */
      .no-field-message {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 85%;
        color: var(--wa-color-text-normal);
      }

      /*
       * was the dialog class pair in styles.css, plus the half of Web Awesome's wa-native
       * layer the class never overrode. That layer reaches a dialog through a bare element
       * selector, so none of it crosses the boundary: without the padding and the shadow
       * the modal renders as an unpadded flat box.
       */
      dialog {
        display: none;
        width: 30%;
        max-width: calc(100% - var(--wa-space-l));
        height: fit-content;
        padding: var(--wa-space-l);
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        box-shadow: var(--wa-shadow-l);
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
        flex-direction: column;
        align-items: start;
        gap: 30px;
      }

      dialog[open] {
        display: flex;
      }

      /* was .flex.justify-between.full-width wrapping .flex.gap-16.items-center.full-width */
      .dialog-head {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
      }

      .dialog-head-body {
        width: 100%;
      }

      /*
       * was .remove-field-warning-icon.p-0.flex.items-center.
       *
       * The glyph used to be inline "because the bundled icon set has no exclamation mark".
       * It has one now — circle-exclamation was registered in #951 — so the 35x35 of path
       * data is gone and the hardcoded #d6466f with it. wa-icon takes its box from font-size
       * rather than width, so the size sits on the icon and this keeps only the centring.
       */
      .warning-icon {
        display: flex;
        align-items: center;
        padding: 0;
        color: var(--keep-color-danger-text);
      }
      .warning-icon wa-icon {
        /* 35px, the size the replaced graphic was drawn at. canvas="auto" because Web
           Awesome's default is "fixed", a 1.25em x 1em canvas — measured 38x30 for this
           glyph, where the original was square. #946 */
        font-size: 35px;
      }

      /* was .dialog-content.gap-10 — the utility is declared later than the gap: 40px in
         .dialog-content, so 10px is the gap this actually rendered at. */
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        padding: 0;
        margin: 0;
      }

      /* was .dialog-content-text */
      .dialog-text {
        color: var(--text-color-primary);
      }

      /* was .dialog-content-text.small-text.text-bold */
      .dialog-field-name {
        font-size: 14px;
        font-weight: bold;
        color: var(--text-color-primary);
      }

      /* was .dialog-actions */
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        align-content: center;
        align-items: center;
        gap: 10px;
        width: 100%;
      }

      /* Named for assistive tech, never shown. */
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
    `,
  ];

  /** The mode's field lists, keyed by droppable id. Owned by the Access tab. */
  @property({ attribute: false }) accessor state: KeepModeFieldState = {};

  /** The mode's script settings, passed straight through to `keep-script-editor`. */
  @property({ attribute: false }) accessor scripts: KeepScriptData = {};

  /** The mode's validation rules, passed straight through to `keep-script-editor`. */
  @property({ attribute: false }) accessor validationRules: KeepValidationRule[] = [];

  /** Names of the mode's required fields. Owned by the Access tab. */
  @property({ type: Array }) accessor required: string[] = [];

  /** Which field is selected. Owned by the Access tab, echoed back as an event. */
  @property({ type: Number }) accessor fieldIndex = 0;

  /**
   * Adds a custom field to the mode and returns the reason it could not, or an empty
   * string. See the class note on why this is a property rather than an event.
   */
  @property({ attribute: false }) accessor addField: (from: string, item: KeepFieldItem) => string =
    () => '';

  /** Text in the add box. Local: the parent never sees a half-typed field name. */
  @state() private accessor fieldText = '';

  /** The rejection from the last add attempt, shown under the box. */
  @state() private accessor customFieldError = '';

  /** The field whose settings the right-hand pane shows. */
  @state() private accessor editField: KeepFieldItem | null = null;

  /** Whether the list is in batch-delete mode, i.e. showing a checkbox on every row. */
  @state() private accessor batchDelete = false;

  /** The ticked rows. Cleared on entering batch mode, kept on leaving it — as before. */
  @state() private accessor deleteFields: KeepFieldItem[] = [];

  @query('dialog') private accessor removeDialog!: HTMLDialogElement | null;

  /** Mirrors the dialog's open state, which `updated()` pushes into the element. */
  @state() private accessor removeOpen = false;

  /** The list the panel acts on. Every decision in the original read the first key. */
  private get fields(): KeepFieldItem[] {
    return this.state[this.droppableIndex] ?? [];
  }

  /** The first droppable key, echoed back in `field-update` so the parent can index it. */
  private get droppableIndex(): string {
    return Object.keys(this.state)[0] ?? '';
  }

  /**
   * Re-seeds the selection whenever the list or the index changes — the effect the
   * original ran on `[state, fieldIndex]`. `changedProperties` compares with `Object.is`,
   * the same comparison a dependency array uses, so the React bridge re-applying the same
   * object reference on every parent render does nothing here.
   */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('state') || changed.has('fieldIndex')) {
      const fields = this.fields;
      this.editField =
        fields.length > 0 ? fields[this.fieldIndex < fields.length ? this.fieldIndex : 0] : null;
    }
  }

  protected updated(): void {
    const dialog = this.removeDialog;
    if (!dialog) return;
    // Guarded on both sides: this runs on every render, and showModal() on an open dialog
    // throws InvalidStateError.
    if (this.removeOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  private handleAddFieldTextChange(event: Event): void {
    this.fieldText = (event.target as HTMLInputElement).value;
    this.customFieldError = '';
  }

  /**
   * The original also set the selection to the field it had just built. That assignment
   * could not do anything useful: on success the parent's new `state` arrives and the
   * property-driven re-seed above overwrites it, and on failure it left the settings pane
   * showing a field the mode had just refused. Dropped rather than reproduced.
   */
  private handleAddField(): void {
    if (!this.fieldText) return;
    if (!this.fieldText.trim()) {
      this.customFieldError = 'Field name cannot be empty.';
      return;
    }
    this.customFieldError = this.addField('read', newField(this.fieldText));
  }

  /**
   * Entering batch mode starts from an empty basket; leaving it keeps whatever was ticked,
   * which is what the original did — its guard read the pre-toggle value of the flag.
   */
  private toggleBatchDelete(): void {
    const entering = !this.batchDelete;
    this.batchDelete = entering;
    if (entering) this.deleteFields = [];
  }

  /**
   * The original mutated the state array in place, pushed the same item twice and then
   * de-duplicated the result — three steps that cancel out. This is the surviving effect.
   *
   * Its `allFieldsChecked` guard is gone with them: the guard skipped the add while
   * select-all was on, and a tick can only arrive from a box that is currently unticked,
   * which after select-all means the item is already in the basket and the add would have
   * de-duplicated away regardless.
   */
  private handleSelectField(event: Event, item: KeepFieldItem): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.deleteFields.some((field) => sameField(field, item))) {
        this.deleteFields = [...this.deleteFields, item];
      }
      return;
    }
    this.deleteFields = this.deleteFields.filter((field) => !sameField(field, item));
  }

  private handleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.deleteFields = checked ? Object.values(this.state).flat() : [];
  }

  private selectField(item: KeepFieldItem, index: number): void {
    this.editField = item;
    this.emit<KeepFieldIndexChangeDetail>('field-index-change', { fieldIndex: index });
  }

  private openRemoveDialog(): void {
    if (this.deleteFields.length > 0) this.removeOpen = true;
  }

  private closeRemoveDialog(): void {
    this.removeOpen = false;
  }

  private handleBatchDelete(): void {
    this.emit<KeepFieldsRemoveDetail>('fields-remove', { fields: this.deleteFields });
    this.toggleBatchDelete();
    this.closeRemoveDialog();
    store.dispatch(toggleAlert('Successfully deleted fields from the current mode.'));
  }

  /** One row's second line: format, access flag, group and the required marker. */
  private static describe(item: KeepFieldItem, isRequired: boolean): string {
    const format = displayFormat(item);
    const fieldGroup = item.fieldGroup ?? '';
    // capitalizeFirst indexes character zero unguarded, so the original threw on a field
    // with no format at all — a shape the very next interpolation already allows for.
    const label = format ? capitalizeFirst(format) : '';
    return `${label} ${format ? '•' : ''} ${accessFlag(item)} ${
      fieldGroup ? '•' : ''
    } ${fieldGroup} ${isRequired ? '• Required' : ''}`;
  }

  private renderRow(raw: KeepFieldItem, index: number) {
    // The normalised copy is what the settings pane is handed, exactly as before: the
    // multi-value flag is derived from the type when it is absent, and `delete` is the
    // flag the row model has always carried.
    const item: KeepFieldItem = {
      ...raw,
      isMultiValue: raw.isMultiValue || raw.type === 'array',
      delete: false,
    };
    const isRequired = this.required.includes(item.content ?? '');
    const selected = this.editField?.name === item.name;

    return html`
      <div class="row">
        <button
          type="button"
          class="row-select"
          aria-current=${selected ? 'true' : nothing}
          @click=${() => this.selectField(item, index)}
        >
          <span class="row-name">${item.name}</span>
          <span class="row-meta">${ModeFields.describe(item, isRequired)}</span>
        </button>
        ${this.batchDelete
          ? html`
              <keep-checkbox
                .checked=${this.deleteFields.some((field) => field.name === item.name)}
                @change=${(event: Event) => this.handleSelectField(event, item)}
              >
                <span class="visually-hidden">Select ${item.name}</span>
              </keep-checkbox>
            `
          : nothing}
      </div>
    `;
  }

  private renderBatchBar() {
    const empty = this.fields.length === 0;

    if (!this.batchDelete) {
      return html`
        <button type="button" class="text-button" ?disabled=${empty} @click=${this.toggleBatchDelete}>
          <span class="danger-text">Delete Field(s)</span>
        </button>
      `;
    }

    const nothingTicked = this.deleteFields.length === 0;
    return html`
      <div class="batch-actions">
        <div class="batch-buttons">
          <keep-tooltip
            placement="bottom"
            content=${nothingTicked ? 'Please select which field/s to remove first.' : ''}
          >
            <button type="button" class="text-button" @click=${this.openRemoveDialog}>
              <span class="danger-text ${nothingTicked ? 'disabled' : ''}">Remove</span>
            </button>
          </keep-tooltip>
          <button type="button" class="text-button" ?disabled=${empty} @click=${this.toggleBatchDelete}>
            <span class="cancel-text">Cancel</span>
          </button>
        </div>
        <keep-checkbox size="s" @change=${this.handleSelectAll}>
          <span class="visually-hidden">Select all fields</span>
        </keep-checkbox>
      </div>
    `;
  }

  private renderRemoveDialog() {
    return html`
      <dialog aria-label="Remove Field" @cancel=${this.closeRemoveDialog}>
        <div class="dialog-head">
          <div class="warning-icon">
            <!-- One registered glyph replaces 35x35 of hand-drawn path data that was
                 duplicated byte-for-byte in keep-forms-table and in a dead styles/forms.tsx
                 export (#946). Solid rather than the outline it replaces, per #718. -->
            <wa-icon library=${FA_LIBRARY} name="circle-exclamation" canvas="auto" aria-hidden="true"></wa-icon>
          </div>
          <div class="dialog-head-body">
            <keep-form-dialog-header
              heading="Remove Field"
              @header-close=${this.closeRemoveDialog}
            ></keep-form-dialog-header>
          </div>
        </div>
        <div class="dialog-content">
          <p class="dialog-text">Are you sure you want to remove the following fields:</p>
          <ul>
            ${this.deleteFields.map(
              (field) => html`<li><p class="dialog-field-name">${field.name}</p></li>`,
            )}
          </ul>
          <p class="dialog-text">on this mode?</p>
        </div>
        <div class="dialog-actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.closeRemoveDialog}>
            Cancel
          </keep-button>
          <keep-button @click=${this.handleBatchDelete}>OK</keep-button>
        </div>
      </dialog>
    `;
  }

  render() {
    const fields = this.fields;
    const editField = this.editField;

    return html`
      <div class="field-list-panel">
        <div class="add-row">
          <wa-input
            class="add-input"
            autofocus
            label="Add custom field"
            placeholder="Add custom field..."
            .value=${live(this.fieldText)}
            @input=${this.handleAddFieldTextChange}
          ></wa-input>
          <button
            type="button"
            class="add-button"
            aria-label="Add Custom Field"
            @click=${this.handleAddField}
          >
            <wa-icon class="add-icon" library=${FA_LIBRARY} name="plus" canvas="auto"></wa-icon>
          </button>
        </div>
        ${this.customFieldError
          ? html`<p class="error-text" role="alert">${this.customFieldError}</p>`
          : nothing}
        <hr />
        <div class="batch-bar">${this.renderBatchBar()}</div>
        ${fields.length > 0
          ? html`
              <div class="field-list">
                ${Object.values(this.state).flatMap((list) =>
                  list.map((item, index) => this.renderRow(item, index)),
                )}
              </div>
            `
          : html`<p class="empty-text">Please add field/s...</p>`}
      </div>
      <div class="editor-panel">
        ${editField
          ? html`
              <keep-field-container
                .item=${editField}
                .droppableIndex=${this.droppableIndex}
                .itemIndex=${fields.findIndex((field) => field.name === editField.name)}
                .required=${this.required}
              ></keep-field-container>
            `
          : html`
              <div class="no-field">
                <p class="no-field-title">Field Setting</p>
                <div class="no-field-message">
                  <p>No field found. Please select a field.</p>
                </div>
              </div>
            `}
        <keep-script-editor
          .data=${this.scripts}
          .validationRules=${this.validationRules}
        ></keep-script-editor>
      </div>
      ${this.renderRemoveDialog()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-mode-fields': ModeFields;
  }
}
