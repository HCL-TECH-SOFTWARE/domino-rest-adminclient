/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import './keep-tooltip';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';
import { convert2FieldType } from '../../utils/field-types';

/**
 * One field of a mode, as the Access tab stores it.
 *
 * Loosely typed on purpose: the parent chain types these `any` all the way up from the
 * schema, and the index signature lets a record travel through this element and back out
 * in an event with every key it arrived with.
 */
export interface KeepFieldItem {
  name?: string;
  content?: string;
  externalName?: string;
  type?: string;
  format?: string;
  items?: { format?: string; type?: string };
  isMultiValue?: boolean;
  fieldAccess?: string;
  fieldGroup?: string;
  encryptedField?: boolean;
  [extra: string]: unknown;
}

/** `event.detail` of `field-update`. Mirrors the `update(index, mode, item)` callback. */
export interface KeepFieldUpdateDetail {
  /** Position of the field inside the mode's list, as the parent computed it. */
  itemIndex: number;
  /** The mode key the field belongs to — the parent's "droppable" id. */
  droppableIndex: string;
  /** The whole field, with the edit applied. */
  item: KeepFieldItem;
}

/** `event.detail` of `required-change`. */
export interface KeepRequiredChangeDetail {
  /** The complete new list of required field names, not a delta. */
  required: string[];
}

/** The JSON-schema formats the Field Type control offers, in the order it offers them. */
const FIELD_FORMATS = [
  'authors',
  'binary',
  'boolean',
  'byte',
  'date',
  'date-time',
  'double',
  'float',
  'int32',
  'int64',
  'names',
  'password',
  'readers',
  'richtext',
  'string',
] as const;

/** The three access modes, `fieldAccess` value → label. */
const ACCESS_MODES: ReadonlyArray<readonly [string, string]> = [
  ['RW', 'Read/Write'],
  ['RO', 'Read Only'],
  ['WO', 'Write Only'],
];

/** The format a field is currently exposed under, for both the single and array shapes. */
function formatOf(item: KeepFieldItem): string {
  if (item.type === 'array') {
    return item.items?.format ?? item.format ?? 'string';
  }
  return item.format ?? 'string';
}

/**
 * The Field Setting panel on the Access tab. Tag: `keep-field-container`.
 *
 * The right-hand pane of `FieldDndContainer`: the selected field's name, its type, its
 * access mode, and the four toggles (multi-value, field group, encrypt, required).
 *
 * ## Store access
 *
 * None. `FieldDndContainer` has no selector of its own and `TabsAccess` above it owns the
 * mode list, the `required` array and the save cycle, so everything arrives as a property
 * and every edit leaves as an event. A `StoreController` in here would fight the React
 * bridge, which re-applies every property on every parent render with no dirty check.
 *
 * ## Local state, and why it is a copy
 *
 * `editedItem` is a copy of {@link item} that this element edits and re-seeds from the
 * property whenever the parent hands over a *different* object. That is what the original
 * did (an effect keyed on `[item]`), and the Lit equivalent is exact: `changedProperties`
 * uses `Object.is`, the same comparison React's dependency array uses. Re-applying the
 * same object reference — which the bridge does on every parent render — changes nothing.
 *
 * Both bound controls use `live()`. Without it, a render that commits the value the field
 * already holds is skipped by Lit's dirty check, so a control the user has moved but the
 * parent has *not* accepted would keep the user's value and quietly disagree with the
 * state behind it. `live()` compares against the live DOM instead.
 *
 * ## Accessibility (#713)
 *
 * The four switches were Material switches with a sibling `<p>` and no label of their own,
 * so each had an empty accessible name. The text is now the switch's own label — Web
 * Awesome renders it inside the `<label>` that wraps the `role="switch"` input, which is
 * what names it — and the label part is re-ordered so the visual order is unchanged.
 *
 * ## What the shadow boundary cost
 *
 * `.config-field-container` and its eight siblings in `styles.css`, the twelve utility
 * classes on top of them, the `EncryptSignOptions` block in `styles/forms.tsx`, and Web
 * Awesome's `wa-native` layer — whose `box-sizing` reset arrives through a universal
 * selector and so stops at the boundary like everything else that is not a custom
 * property. All restated below, reading the same tokens so both colour modes still
 * resolve.
 *
 * @fires field-update - `CustomEvent<KeepFieldUpdateDetail>`
 * @fires required-change - `CustomEvent<KeepRequiredChangeDetail>`
 */
@customElement('keep-field-container')
export default class FieldContainer extends KeepElement {
  static styles = css`
    /*
     * The page's border-box reset is Web Awesome's wa-native layer, which applies it
     * through a universal selector. A universal selector does not cross a shadow
     * boundary, so without this every percentage width below stops covering its own
     * padding.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* was .config-field-container */
    :host {
      box-sizing: border-box;
      display: block;
      width: 100%;
      padding: 0 0 15px 0;
      border: 1px solid var(--wa-color-surface-border);
      border-radius: 5px;
      background: var(--wa-color-surface-default);
      color: var(--wa-color-text-normal);
    }

    /* was .item-name-container */
    .item-name {
      width: 30%;
      font-size: 14px;
      padding: 24px 24px 0 24px;
    }

    /* was .field-item-title.m-0 — the literal pair was light #6c6c6c / dark #b0b0b0,
       which is what the quiet-text token already resolves to at both ends. */
    .item-name-label {
      font-size: 12px;
      font-weight: 400;
      color: var(--wa-color-text-quiet);
      margin: 0;
    }

    /* was .field-item-name. Deliberately no margin rule: the original carried no m-0, so
       it kept the user-agent paragraph margin — which still applies inside a shadow
       root. */
    .item-name-value {
      font-size: 16px;
      font-weight: 500;
      color: var(--wa-color-text-normal);
    }

    /*
     * was .divider.pt-5.pb-10.mb-10.no-background. .no-background is declared after
     * .divider in styles.css, so the grey bar the divider class asks for never painted
     * and the rule only ever contributed the box; the visible line is the user-agent
     * border on the hr, which a shadow root still gets.
     */
    hr {
      height: 1px;
      width: 100%;
      background: none;
      padding: 5px 0 10px 0;
      margin: 0 0 10px 0;
    }

    /* was .field-setting-text.m-0 */
    .settings-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--wa-color-text-normal);
      width: 100%;
      padding: 0 20px;
      margin: 0;
    }

    /* was .field-setting-details-container */
    .settings {
      padding: 10px 20px 0 20px;
      display: flex;
      flex-wrap: wrap;
      row-gap: 8px;
    }

    /* was .half-width.pt-5.pb-5 */
    .cell {
      width: 50%;
      padding: 5px 0;
    }

    /* was .flex.flex-row.half-width on the two tooltips. An outer-tree rule beats the
       element's own :host { display: inline-block }, so this is all it takes. */
    keep-tooltip.cell-tooltip {
      display: flex;
      flex-direction: row;
      width: 50%;
    }

    /* was .full-width.pt-5.pb-5, the field-group cell inside its tooltip */
    .group-cell {
      width: 100%;
      padding: 5px 0;
    }

    /* was .half-width.pt-5.pb-5.multi-value-container.w-fit — .w-fit is declared after
       .half-width, so fit-content is the width this row actually rendered at. */
    .multi-value {
      display: flex;
      align-items: center;
      width: fit-content;
      padding: 5px 0;
    }

    /* was .field-name-input / .field-type-text-field / .field-access-input and the
       .half-width on the field-group control: each is half of its own half-width cell. */
    .control {
      width: 50%;
    }

    /*
     * Each switch used to be a Material switch with a sibling paragraph, so it had no
     * accessible name; the text is the switch's own label now. Web Awesome renders the
     * label inside the same <label> as the role="switch" input, which is what names it.
     * The order property puts the words back on the left, where they were — rather
     * than row-reverse, which would also reverse how the two parts are sized against
     * each other and is harder to reason about when one of them is given a width.
     */
    wa-switch::part(control) {
      order: 2;
    }

    wa-switch::part(label) {
      order: 1;
      font-size: 14px;
      margin-inline-start: 0;
      margin-inline-end: 0.5em;
    }

    /* was the EncryptSignOptions section in styles/forms.tsx */
    .encrypt {
      width: 45%;
      font-size: var(--wa-font-size-m);
    }

    .encrypt .main-row {
      display: flex;
      align-items: center;
    }

    /*
     * was .warning-text, on a <text> element — an SVG tag name with no meaning in HTML,
     * so it is a paragraph here. #616161 was a light-mode literal that would sit under
     * 2.5:1 on the dark surface; the quiet-text token is the mode-aware equivalent.
     */
    .warning-text {
      color: var(--wa-color-text-quiet);
      font-size: var(--wa-font-size-s);
      margin: 0;
    }

    /* was .small-icon around the glyph plus .script-editor-help-icon's colour. wa-icon
       takes its box from font-size, so the 15px square is a font-size here. */
    .help-icon {
      color: #2d91e3;
      font-size: 15px;
    }

    /* was .input.required-pill-container — the input class matches no rule anywhere. */
    .required-pill {
      display: flex;
      align-items: center;
    }
  `;

  /** The field being edited. Owned by the parent; this element edits a copy. */
  @property({ attribute: false }) accessor item: KeepFieldItem = {};

  /** Position of {@link item} in the mode's field list. Echoed back in `field-update`. */
  @property({ type: Number }) accessor itemIndex = -1;

  /** The mode key the field belongs to. Echoed back in `field-update`. */
  @property({ type: String }) accessor droppableIndex = '';

  /** Names of the mode's required fields. Owned by the parent. */
  @property({ type: Array }) accessor required: string[] = [];

  /** The working copy. Re-seeded whenever the parent hands over a different object. */
  @state() private accessor editedItem: KeepFieldItem = {};

  @state() private accessor isMultiValue = false;

  @state() private accessor encrypt = false;

  @state() private accessor formatValue = 'string';

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('item')) {
      this.editedItem = { ...this.item };
      this.encrypt = Boolean(this.item.encryptedField);
      this.formatValue = formatOf(this.editedItem);
      this.isMultiValue = this.editedItem.isMultiValue ?? this.editedItem.type === 'array';
    }
  }

  /** Both mirror the `update(itemIndex, droppableIndex, item)` callback they replaced. */
  private commit(item: KeepFieldItem): void {
    this.editedItem = item;
    this.emit<KeepFieldUpdateDetail>('field-update', {
      itemIndex: this.itemIndex,
      droppableIndex: this.droppableIndex,
      item,
    });
  }

  private handleFieldNameChange(event: Event): void {
    event.stopPropagation();
    const value = (event.target as HTMLInputElement).value;
    this.commit({ ...this.editedItem, externalName: value, content: value });
  }

  private handleFieldTypeChange(event: Event): void {
    event.stopPropagation();
    const format = (event.target as HTMLInputElement).value;
    this.formatValue = format;

    // readers and authors are name lists: choosing either forces the field multi-value,
    // as does editing a field that already is one.
    if (this.editedItem.type === 'array' || format === 'readers' || format === 'authors') {
      this.isMultiValue = true;
      this.commit({
        ...this.editedItem,
        type: convert2FieldType(format, true),
        isMultiValue: true,
        items: { format, type: this.editedItem.items?.format ?? 'string' },
      });
      return;
    }

    this.isMultiValue = false;
    this.commit({
      ...this.editedItem,
      format,
      type: convert2FieldType(format, false),
    });
  }

  private handleAccessModeChange(event: Event): void {
    event.stopPropagation();
    const fieldAccess = (event.target as HTMLInputElement).value;
    this.commit({ ...this.editedItem, fieldAccess });
  }

  private handleFieldGroupChange(event: Event): void {
    event.stopPropagation();
    const fieldGroup = (event.target as HTMLInputElement).value;
    this.commit({ ...this.editedItem, fieldGroup });
  }

  /**
   * Multi-value carries the format in a different place at each end: a single-value field
   * keeps it in `format`, an array keeps it in `items.format`. Toggling therefore moves
   * the value across as well as flipping the flag.
   *
   * The original read `editedItem.items.format` unguarded on the way *down*, which throws
   * on an array field that has no `items` — a shape the schema allows and the format
   * getter above already tolerates. Read through the same fallback here.
   */
  private toggleMultiValue(event: Event): void {
    event.stopPropagation();
    const isMultiValue = (event.target as HTMLInputElement).checked;
    this.isMultiValue = isMultiValue;

    if (isMultiValue) {
      const format = this.editedItem.format ?? 'string';
      this.formatValue = format;
      this.commit({
        ...this.editedItem,
        isMultiValue,
        type: convert2FieldType(format, true),
        items: { ...this.editedItem.items, format },
      });
      return;
    }

    const format = this.editedItem.items?.format ?? this.editedItem.format ?? 'string';
    this.formatValue = format;
    this.commit({
      ...this.editedItem,
      isMultiValue,
      format,
      type: convert2FieldType(format, false),
    });
  }

  private toggleEncrypt(event: Event): void {
    event.stopPropagation();
    const encrypt = (event.target as HTMLInputElement).checked;
    this.encrypt = encrypt;
    this.commit({ ...this.editedItem, encryptedField: encrypt });
  }

  /** The required list is the parent's, so this sends the whole new array rather than a delta. */
  private toggleRequired(event: Event): void {
    event.stopPropagation();
    const content = this.editedItem.content ?? '';
    const isRequired = (event.target as HTMLInputElement).checked;

    let required = [...this.required];
    if (isRequired) {
      if (!required.includes(content)) required.push(content);
    } else if (required.includes(content)) {
      required = required.filter((name) => name !== content);
    }

    this.emit<KeepRequiredChangeDetail>('required-change', { required });
  }

  render() {
    const item = this.editedItem;
    const fieldName = item.externalName ? item.externalName : (item.content ?? '');
    const fieldGroup = item.fieldGroup ?? '';
    const hasGroup = fieldGroup.length > 0;
    const multiValueLocked =
      this.formatValue === 'readers' || this.formatValue === 'authors' || hasGroup;

    return html`
      <div class="item-name">
        <p class="item-name-label">Item Name</p>
        <p class="item-name-value">${this.item.name ?? ''}</p>
      </div>
      <hr />
      <div>
        <p class="settings-title">Field Setting</p>
        <div class="settings">
          <div class="cell">
            <wa-input
              class="control"
              id="field-name"
              size="s"
              label="Field Name"
              .value=${live(fieldName)}
              @input=${this.handleFieldNameChange}
            ></wa-input>
          </div>
          <div class="cell">
            <wa-select
              class="control"
              id="field-type"
              size="s"
              label="Field Type"
              .value=${live(this.formatValue)}
              @change=${this.handleFieldTypeChange}
            >
              ${FIELD_FORMATS.map(
                (format) => html`<wa-option value=${format}>${format}</wa-option>`,
              )}
            </wa-select>
          </div>
          <div class="cell">
            <wa-select
              class="control"
              id="field-access"
              size="s"
              label="Access"
              .value=${live(item.fieldAccess ?? '')}
              @change=${this.handleAccessModeChange}
            >
              ${ACCESS_MODES.map(
                ([value, label]) => html`<wa-option value=${value}>${label}</wa-option>`,
              )}
            </wa-select>
          </div>
          <keep-tooltip
            class="cell-tooltip"
            placement="bottom"
            content=${hasGroup ? 'Field group should be empty to toggle off multi-value' : ''}
          >
            <div class="multi-value">
              <wa-switch
                id="multi-value"
                size="s"
                .checked=${live(this.isMultiValue)}
                ?disabled=${multiValueLocked}
                @change=${this.toggleMultiValue}
                >Multi-Value?</wa-switch
              >
            </div>
          </keep-tooltip>
          <keep-tooltip
            class="cell-tooltip"
            content=${this.isMultiValue ? '' : 'Enable multi-value to input a field group'}
          >
            <div class="group-cell">
              <wa-input
                class="control"
                id="field-group"
                size="s"
                label="Field Group"
                .value=${live(fieldGroup)}
                ?disabled=${!this.isMultiValue}
                @input=${this.handleFieldGroupChange}
              ></wa-input>
            </div>
          </keep-tooltip>
          <section class="encrypt">
            <section class="main-row">
              <wa-switch id="encrypt" size="s" .checked=${live(this.encrypt)} @change=${this.toggleEncrypt}>
                Encrypt
                <keep-tooltip
                  content="Please understand this option before enabling, see the documentation on enabling encryption."
                  @click=${this.stopLabelActivation}
                >
                  <wa-icon
                    class="help-icon"
                    library=${FA_LIBRARY}
                    name="circle-question"
                  ></wa-icon>
                </keep-tooltip>
              </wa-switch>
            </section>
            <p class="warning-text">Please understand this option before enabling</p>
          </section>
          <div class="required-pill">
            <wa-switch
              id="required"
              size="s"
              .checked=${live(this.required.includes(item.content ?? ''))}
              @change=${this.toggleRequired}
              >Required?</wa-switch
            >
          </div>
        </div>
      </div>
    `;
  }

  /**
   * The encrypt help glyph sits inside the switch's label slot, which is the only place
   * it can sit and keep both the original left-to-right order and a real label on the
   * switch. A click anywhere in a `<label>` activates its control, so without this the
   * glyph would toggle encryption — which it never did when it was a sibling.
   */
  private stopLabelActivation(event: Event): void {
    event.stopPropagation();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-field-container': FieldContainer;
  }
}
