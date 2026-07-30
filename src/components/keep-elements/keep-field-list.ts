/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/spinner/spinner.js';
import './keep-search-input';
import './keep-single-field';
import './keep-tooltip';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';
import { StoreController } from '../../store/StoreController';
import { setLoading } from '../../store/loading/action';
import { fetchFields, getAllFieldsByNsf } from '../../store/databases/action';
import { fullEncode } from '../../utils/common';
import type { AccessField } from '../../store/accessMode/types';
import type { KeepFieldAddDetail } from './keep-single-field';
import type { KeepSearchChangeDetail } from './keep-search-input';

/** `fields-add` payload: the fields the user asked to put into the current mode. */
export interface KeepFieldsAddDetail {
  items: AccessField[];
}

/** The sentinel form name the API uses for "every field in the NSF". */
const ALL_FIELDS = 'keep_internal_form_for_allFields';

/** Marks a subform in the picker, so it is distinguishable from a form of the same name. */
const ANCHOR = '⚓';

/** Prefixes the API uses for internal items a user cannot put into a mode. */
const INTERNAL_PREFIXES = ['@', '~#'];

const isSelectable = (content: unknown): content is string =>
  typeof content === 'string' && !INTERNAL_PREFIXES.some((prefix) => content.startsWith(prefix));

/** One entry in the "show fields from" picker. */
interface FormOption {
  dbName: string;
  name: string;
  externalName: string;
  designType?: string;
}

/**
 * The field palette on the schema-management screen: a form picker, a filter, and the list
 * of fields that form offers. Tag: `keep-field-list`. Exposed via `KeepElements.tsx` as
 * `KeepFieldList`, because `access/AccessMode.tsx` is still React.
 *
 * Replaces `components/access/Fields.tsx`.
 *
 * ## Why this one reads the store directly
 *
 * Four reads: the NSF design list, the pending new form, the fetched fields, and whether a
 * fetch is in flight. The parent forwards none of them — it selects two of the four for its
 * own purposes and passes neither down — so this is the "the element owns the state" case
 * rather than the "the parent owns it" one, and a controller is the 1:1 translation of the
 * `useSelector` each one already was.
 *
 * Hoisting them into the parent instead would be actively worse for the one that changes
 * most: the spinner's flag flips on every field fetch, and the parent re-renders the whole
 * mode editor beside this panel. Keeping it here confines that to this element.
 *
 * The panel does not *write* any of them. Adding a field emits {@link KeepFieldsAddDetail}
 * and the parent folds it through the `moveTo` it already had, so ownership of that write
 * stays in one place — the same split `keep-single-field` uses one level down.
 *
 * ## Picking a form used to be pointer-only
 *
 * The dropdown had a change handler that recorded the choice and a per-item click handler
 * that actually fetched the fields. Only a pointer fires both: choosing with the keyboard
 * ran the first and not the second, so the picker changed and the list below it did not.
 * There is one path now, the control's own change event (#925).
 *
 * @fires fields-add - `CustomEvent<KeepFieldsAddDetail>` when a row, or "add all", is used.
 */
@customElement('keep-field-list')
export default class FieldList extends KeepElement {
  static styles = css`
    /* was the FieldContainer Linaria block */
    :host {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-l);
      background: var(--wa-color-surface-default);
    }

    /*
     * The document reset is Web Awesome's wa-native layer, which sets box-sizing through a
     * universal selector, and a universal selector does not cross a shadow boundary. The
     * picker below is 100% wide inside a padded column, so without this it overflows.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* .fields-dropdown-div */
    .picker {
      padding: 0 23.5px;
    }

    /* FieldsDropDownHeader, plus .fields-dropdown-header from the global sheet */
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 0 0 10px;
    }

    /* was .small-text with p-0, full-width and m-0 beside it */
    .header p {
      font-size: 14px;
      padding: 0;
      margin: 0;
      width: 100%;
    }

    /*
     * IconButton. Its nested .icon-button rule is not reproduced: Linaria compiles a nested
     * selector to a descendant of the generated class, and that class was on the button
     * itself rather than on an ancestor of it, so those six declarations never applied.
     * The tooltip that wraps the second button carried a w-40 class for the same reason and
     * with the same effect.
     */
    .icon-button {
      border: 0;
      background: none;
      user-select: none;
      cursor: pointer;
      color: var(--wa-color-text-normal);
    }

    .icon-button:focus-visible {
      border-radius: var(--wa-border-radius-s);
      outline: var(--wa-focus-ring);
      outline-offset: var(--wa-focus-ring-offset);
    }

    /*
     * The .icon rule did apply — it is a descendant. An icon takes its box from font-size
     * rather than width, because the glyph lives in a shadow root of its own, so 18px is
     * expressed the way that still delivers it.
     */
    .icon-button wa-icon {
      margin: 0;
      font-size: 18px;
    }

    /* FieldsDropDown, twice over */
    .row {
      display: flex;
      align-items: center;
      padding: 5px 0;
    }

    /*
     * The picker was a Material select whose border came from an inline style of
     * 1px solid #323A3D — a light-mode literal on a control that also renders in dark mode.
     * The outlined appearance draws it from the theme tokens instead. The label is real but
     * visually hidden: the paragraph above is the visible caption for the whole row, and
     * Web Awesome still needs a name of its own for the control.
     */
    wa-select {
      width: 100%;
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

    /*
     * The filter was a bare input inside two nested containers whose background was the
     * literal #f9f9f9 — invisible in light mode and a near-white slab in dark. The shared
     * search element brings its own mode-aware container along with the label and focus
     * ring it also lacked.
     */
    keep-search-input {
      width: 100%;
    }

    /*
     * Was an <hr> carrying .divider plus four utilities. Two of them cancelled each other:
     * .divider paints a #cbcbcb background and .no-background sets none, and the latter is
     * declared later at equal specificity, so the only line ever drawn was the user agent's
     * own hr border. Stated outright here, as one token-coloured rule with the spacing as
     * margin, which is what the class name always meant.
     */
    .divider {
      height: 1px;
      width: 100%;
      margin: 5px 0 10px 0;
      background: var(--wa-color-surface-border);
    }

    /* .field-config */
    .loading {
      height: calc(100vh - 170px);
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      width: 100%;
      color: var(--wa-color-text-normal);
    }

    /*
     * 40px and a 4px track are the Material spinner's defaults, which is what this replaces.
     * A spinner sizes from font-size only; width and height break its animation.
     */
    .loading wa-spinner {
      font-size: 40px;
      --track-width: 4px;
    }

    /* .loading-container, and the paragraph inside it that carried m-0 */
    .loading p {
      margin: 10px 0;
      display: flex;
    }

    /* .fields-displayed-container */
    .fields {
      overflow-y: scroll;
    }

    /*
     * ListRoot, a Material List. Its list semantics are reproduced with real roles below
     * rather than with the component, so only the box is left.
     */
    .field-group {
      width: 100%;
      max-width: 360px;
      padding: 0;
      font-size: var(--wa-font-size-m);
      margin: 0;
      list-style: none;
    }

    /*
     * ListContainer with FieldList over it. FieldList's shorthand padding overrides
     * ListContainer's padding-left, and its top/left/bottom go nowhere without a position,
     * so 10px 1px is the whole of it.
     */
    .field-items {
      border-radius: var(--wa-border-radius-s);
      flex: 0 0 150px;
      font-family: sans-serif;
      padding: 10px 1px;
      height: 100%;
    }

    /* ListItemField, a Material ListItem */
    .field-item {
      padding-bottom: 2px;
    }
  `;

  /** The schema (configuration) name — `dbName` at the call site. */
  @property({ type: String }) accessor schemaName = '';

  /** The NSF this schema configures. Encoded again for every request. */
  @property({ type: String }) accessor nsfPath = '';

  /** The form the access screen is editing. Seeds the picker. */
  @property({ type: String }) accessor formName = '';

  /** The form currently chosen in the picker — a form name, or the all-fields sentinel. */
  @state() accessor currentFormValue = '';

  /** What is typed in the filter. Internal: the parent never read it. */
  @state() accessor searchFieldKey = '';

  private designs = new StoreController(this, (state) => state.databases.nsfDesigns);

  private activeFields = new StoreController(this, (state) => state.databases.activeFields);

  private newForm = new StoreController(this, (state) => state.databases.newForm);

  // A boolean rather than the object around it: the controller compares with Object.is, and
  // the slice is rewritten on every unrelated loading change.
  private loading = new StoreController(this, (state) => state.loading.loading.status);

  /** Guards the fetch below against re-running for inputs it has already answered. */
  private lastFetch = '';

  private get design(): { forms?: any[]; subforms?: any[] } | undefined {
    return this.designs.value?.[this.nsfPath];
  }

  private get designForms(): any[] {
    return this.design?.forms ?? [];
  }

  private get designSubforms(): any[] {
    return this.design?.subforms ?? [];
  }

  /** All-fields first, then the NSF's forms, then its subforms — the original's order. */
  private get formOptions(): FormOption[] {
    return [
      { dbName: this.schemaName, name: ALL_FIELDS, externalName: ALL_FIELDS },
      ...this.designForms.map((form: any) => ({
        dbName: this.schemaName,
        designType: 'forms',
        name: form['@name'],
        externalName: form['@name'],
      })),
      ...this.designSubforms.map((subform: any) => ({
        dbName: this.schemaName,
        designType: 'subforms',
        name: subform['@name'],
        externalName: `${ANCHOR}${subform['@name']}`,
      })),
    ];
  }

  /** The fetched field lists belonging to the form now chosen in the picker. */
  private get currentActiveFields(): any[] {
    return this.activeFields.value.filter((item: any) => item.formName === this.currentFormValue);
  }

  /**
   * The lists as the filter leaves them.
   *
   * Derived rather than stored. It was state kept in step by an effect, which meant one
   * render per keystroke showed the previous result.
   */
  private get fieldsDisplayed(): any[] {
    if (this.searchFieldKey === '') return this.currentActiveFields;
    return this.currentActiveFields.map((form: any) => ({
      ...form,
      fields: this.matchFields(form.fields ?? []),
    }));
  }

  /**
   * Fields matching the filter — falling back to progressively shorter prefixes of it.
   *
   * Carried over exactly: typing past the last match keeps the longest prefix that still
   * had one on screen, rather than emptying the list.
   */
  private matchFields(fields: any[]): any[] {
    const contains = (needle: string) =>
      fields.filter(
        (field: any) =>
          !!field.content && field.content.toLowerCase().indexOf(needle.toLowerCase()) !== -1,
      );

    const exact = contains(this.searchFieldKey);
    if (exact.length > 0) return exact;

    for (let i = this.searchFieldKey.length; i >= 0; i--) {
      const shorter = contains(this.searchFieldKey.slice(0, i));
      if (shorter.length > 0) return shorter;
    }
    return [];
  }

  /**
   * Seed the picker from the route.
   *
   * In `willUpdate` rather than `updated`: this is the sanctioned place to change reactive
   * state mid-update, so it folds into the render already scheduled. Doing it afterwards
   * costs a second render and gets the control's first paint wrong.
   */
  protected willUpdate(): void {
    if (this.currentFormValue === '' && this.formName !== '') {
      this.currentFormValue = this.designForms.length > 0 ? this.formName : 'Not Selected';
    }
  }

  protected updated(): void {
    this.fetchForForm();
  }

  /**
   * Fetch the fields the picker's current form offers.
   *
   * Was an effect over seven dependencies, two of which were store arrays whose identity
   * changed on writes that could not affect the answer. The signature below is those
   * dependencies reduced to the values the three branches actually read, so the same
   * situation asks for the same fetch exactly once.
   */
  private fetchForForm(): void {
    // Nothing addressable yet. The bridge assigns properties after the element's first
    // render, so this runs once with the defaults still in place.
    if (this.nsfPath === '') return;

    const designNames = [
      ...this.designForms.map((form: any) => form['@name']),
      ...this.designSubforms.map((subform: any) => subform['@name']),
    ];
    const known = designNames.includes(this.formName);
    const enabled = !!this.newForm.value?.enabled;
    const signature = JSON.stringify([
      this.schemaName,
      this.nsfPath,
      this.formName,
      known,
      this.designForms.length,
      enabled,
    ]);
    if (signature === this.lastFetch) return;
    this.lastFetch = signature;

    if (!known) {
      this.activeFields.dispatch(getAllFieldsByNsf(fullEncode(this.nsfPath)));
      this.activeFields.dispatch(setLoading({ status: false }));
    } else if (this.designForms.length > 0 && !!this.formName && !enabled) {
      this.activeFields.dispatch(
        fetchFields(this.schemaName, fullEncode(this.nsfPath), this.formName, this.formName, 'forms'),
      );
    } else if (!enabled) {
      this.activeFields.dispatch(getAllFieldsByNsf(fullEncode(this.nsfPath)));
    }
  }

  /** Called when another form is picked: fetch its fields with the spinner up. */
  private async loadForm(option: FormOption): Promise<void> {
    this.activeFields.dispatch(setLoading({ status: true }));
    if (option.name === ALL_FIELDS) {
      await this.activeFields.dispatch(getAllFieldsByNsf(fullEncode(this.nsfPath)));
    } else {
      await this.activeFields.dispatch(
        fetchFields(
          this.schemaName,
          fullEncode(this.nsfPath),
          option.name,
          option.externalName,
          option.designType as string,
        ),
      );
    }
    this.activeFields.dispatch(setLoading({ status: false }));
  }

  private handleFormChange(event: Event): void {
    // The control's change event composes, so without this a consumer would see the panel
    // itself as having changed.
    event.stopPropagation();
    const value = (event.target as HTMLInputElement).value;
    const option = this.formOptions.find((form) => form.externalName === value);
    if (!option) return;
    this.currentFormValue = option.externalName;
    void this.loadForm(option);
  }

  private async handleRefresh(): Promise<void> {
    this.activeFields.dispatch(setLoading({ status: true }));
    await this.activeFields.dispatch(
      fetchFields(this.schemaName, fullEncode(this.nsfPath), this.formName, this.formName, 'forms'),
    );
    this.activeFields.dispatch(setLoading({ status: false }));
  }

  /** Offer every field of the chosen form, minus the API's internal ones. */
  private handleAddAll(): void {
    const items: AccessField[] = [];
    this.currentActiveFields.forEach((form: any) => {
      (form.fields ?? [])
        .filter((field: any) => isSelectable(field.content))
        .forEach((field: any) => items.push({ ...field, name: field.content }));
    });
    this.emit<KeepFieldsAddDetail>('fields-add', { items });
  }

  private handleSearch(event: CustomEvent<KeepSearchChangeDetail>): void {
    event.stopPropagation();
    this.searchFieldKey = event.detail.value;
  }

  private handleFieldAdd(event: CustomEvent<KeepFieldAddDetail>): void {
    // The row's own event composes, so it would otherwise reach the parent alongside the
    // one emitted here and the field would be added twice.
    event.stopPropagation();
    this.emit<KeepFieldsAddDetail>('fields-add', { items: [event.detail.item] });
  }

  private renderIconButton(icon: string, label: string, onClick: () => void) {
    // The glyph is decorative once the button is named — a label on both would announce it
    // twice. The originals had neither, so the two controls were unreachable to a screen
    // reader and to the keyboard (#713).
    return html`
      <keep-tooltip content=${label}>
        <button type="button" class="icon-button" aria-label=${label} @click=${onClick}>
          <wa-icon library=${FA_LIBRARY} name=${icon} canvas="auto"></wa-icon>
        </button>
      </keep-tooltip>
    `;
  }

  private renderFields() {
    if (this.loading.value) {
      return html`
        <div class="loading" role="status">
          <wa-spinner aria-hidden="true"></wa-spinner>
          <p>Loading fields...</p>
        </div>
      `;
    }

    return html`
      <div class="fields">
        ${this.fieldsDisplayed.map((form: any) => this.renderFieldGroup(form))}
      </div>
    `;
  }

  private renderFieldGroup(form: any) {
    const fields = (form.fields ?? []).filter(
      (field: any) => isSelectable(field.content) && !String(field.content).startsWith('Formula'),
    );
    return html`
      <ul class="field-group">
        <li class="field-item">
          <div class="field-items">
            ${fields.length > 0
              ? fields.map(
                  (field: any) => html`
                    <keep-single-field
                      .item=${{ name: field.content, ...field }}
                      @field-add=${this.handleFieldAdd}
                    ></keep-single-field>
                  `,
                )
              : // No handler and `disabled`: the placeholder is a message, not an offer.
                html`<keep-single-field
                  disabled
                  .item=${{ content: 'No Field Available' }}
                ></keep-single-field>`}
          </div>
        </li>
      </ul>
    `;
  }

  render(): TemplateResult {
    return html`
      <div class="picker">
        <div class="header">
          <p>Show fields from:</p>
          ${this.renderIconButton('arrows-rotate', 'Refresh List of Fields', () =>
            this.handleRefresh(),
          )}
          ${this.renderIconButton('square-plus', 'Add All Fields', () => this.handleAddAll())}
        </div>
        <div class="row">
          <wa-select
            label="Show fields from"
            appearance="outlined"
            .value=${live(this.currentFormValue)}
            @change=${this.handleFormChange}
          >
            ${this.formOptions.map(
              (form) => html`
                <wa-option value=${form.externalName}>
                  ${form.externalName === ALL_FIELDS ? 'All Fields' : form.externalName}
                </wa-option>
              `,
            )}
          </wa-select>
        </div>
        <div class="row">
          <keep-search-input
            placeholder="Search Field"
            label="Search Field"
            @search-change=${this.handleSearch}
          ></keep-search-input>
        </div>
      </div>
      <div class="divider" role="separator"></div>
      ${this.renderFields()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-field-list': FieldList;
  }
}
