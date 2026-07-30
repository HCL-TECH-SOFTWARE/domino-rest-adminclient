/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';
import './keep-tooltip';
import { store } from '../../store/store';
import { selectFieldIsAdded } from '../../store/accessMode/selectors';
import type { AccessField } from '../../store/accessMode/types';
import { capitalizeFirst } from '../../utils/common';

/** `field-add` payload. The field the user asked to put into the current mode. */
export interface KeepFieldAddDetail {
  item: AccessField;
}

/** The two `kind` values the API spells as one word and a human would not. */
const KIND_TEXT: Record<string, string> = {
  computedfordisplay: 'computed for display',
  computedwhencomposed: 'computed when composed',
};

/**
 * One row of the "show fields from …" list on the schema-management screen: a field the
 * user can add to the mode being edited. Tag: `keep-single-field`.
 *
 * No React wrapper: `keep-field-list` is the only thing that renders these, and it is a Lit
 * element, so it uses the tag directly and imports this module for registration.
 *
 * Replaces `components/access/SingleFieldContainer.tsx`.
 *
 * ## Why this one reads the store directly
 *
 * Clicking a row that is *already* in the mode must do nothing. The old component decided
 * that from `useContext(AccessContext)`; that context is a slice now, so the check reads
 * the slice.
 *
 * It reads through `store` rather than a `StoreController`, and the distinction matters at
 * this element's scale. A controller subscribes, and its job is to re-render the host when
 * the selected value changes — but nothing this element renders depends on that value. It
 * is wanted once, inside a click handler. A list of a few hundred fields would therefore
 * hold a few hundred subscriptions whose only effect is a few hundred identical re-renders
 * every time a field is added. Same reasoning as the "only dispatches" case: no
 * subscription, no controller.
 *
 * The row does not write, either. It emits `field-add`, `keep-field-list` gathers that into
 * its own `fields-add`, and the access screen folds it back through the `moveTo` it already
 * had — so ownership of the write stays in one place instead of being split between a
 * parent and a leaf.
 *
 * @fires field-add - `CustomEvent<KeepFieldAddDetail>`, unless the field is already in the
 *   mode or the row is `disabled`.
 */
@customElement('keep-single-field')
export default class SingleField extends KeepElement {
  static styles = css`
    :host {
      display: block;
    }

    /*
     * Was the .item-container rule in styles.css. box-sizing is restated because the
     * document's border-box reset does not cross a shadow boundary, and this row depends
     * on it: width:100% alongside 50px of horizontal padding and a 1px border would
     * otherwise overflow the column by 52px.
     */
    .item-container {
      align-content: flex-start;
      align-items: center;
      border: 1px solid transparent;
      border-radius: 3px;
      box-sizing: border-box;
      display: flex;
      line-height: 1.5;
      padding: 10px 40px 10px 10px;
      user-select: none;
      width: 100%;
    }

    /*
     * The hover outline was the literal #5F1EBE — the brand purple from before the ramp in
     * keep-theme.css existed. brand-border-loud is the step Web Awesome derives for exactly
     * this role and it is defined on both sides of .wa-dark, so the row keeps a visible
     * edge in dark mode where a fixed light-mode purple would not.
     */
    .item-container:hover {
      border-color: var(--wa-color-brand-border-loud);
      border-radius: 2px;
      cursor: pointer;
    }

    /* Never applied: nothing has ever set isDragging. Carried over rather than dropped,
       because dropping it would silently retire the drag affordance along with it. */
    .item-container--dragging {
      border-color: #4099ff;
      border-style: dashed;
    }

    :host([disabled]) .item-container:hover {
      border-color: transparent;
      cursor: default;
    }

    /*
     * The add button and the kind tooltip both appear on hover.
     *
     * opacity, not the visibility:hidden this used to be. A visibility:hidden control
     * cannot take focus and is not in the accessibility tree, so the only way to reach the
     * button was to hover it with a pointer: the whole list was keyboard-dead and silent to
     * a screen reader. opacity reserves the same box and looks identical, while leaving the
     * button focusable — which is what makes the :focus-within rule below able to fire at
     * all (#713).
     *
     * height:100% is what the document rule set; the Linaria block's height:20px lost to it
     * on specificity and never applied.
     *
     * The colour is explicit because a button does not inherit one — the user-agent
     * 'buttontext' it would otherwise use is not driven by this app's .wa-dark toggle, so
     * the glyph rendered near-black on a dark surface.
     */
    .add-field {
      background: none;
      border: 0;
      color: var(--wa-color-text-normal);
      height: 100%;
      opacity: 0;
      user-select: none;
    }

    .item-container:hover .add-field,
    .item-container:focus-within .add-field {
      cursor: pointer;
      opacity: 1;
    }

    .add-field:focus-visible {
      border-radius: var(--wa-border-radius-s);
      outline: var(--wa-focus-ring);
      outline-offset: var(--wa-focus-ring-offset);
    }

    /*
     * Both glyphs were sized with the wa-size-xl utility class. That is a document-level
     * rule in Web Awesome's utilities layer, so it does not reach in here; the token it
     * sets does, because custom properties inherit across the boundary.
     */
    wa-icon {
      font-size: var(--wa-font-size-xl);
    }

    /* was the flex / flex-1 / flex-col utilities */
    .labels {
      display: flex;
      flex: 1;
      flex-direction: column;
    }

    /* was small-text + color-text-primary. The token is mode-aware; the utility's literal
       #000 is not, and its dark override is a light-DOM descendant selector. */
    .field-name {
      color: var(--text-color-primary);
      font-size: 14px;
    }

    /* was tiny-text + weight-400 + color-text-disabled */
    .field-format {
      color: var(--text-color-disabled);
      font-size: 12px;
      font-weight: 400;
    }
  `;

  /** The field this row offers. */
  @property({ type: Object }) accessor item: AccessField | null = null;

  /**
   * A placeholder row — "No Field Available" — rather than an offer.
   *
   * Reflected so the `:host([disabled])` rule above can match. It suppresses the add button
   * as well as the click: a button announcing "Add No Field Available to this mode" is
   * worse than no button.
   */
  @property({ type: Boolean, reflect: true }) accessor disabled = false;

  /** The field's name, and the row's identity as far as de-duplication is concerned. */
  private get content(): string {
    const value = this.item?.content;
    return typeof value === 'string' ? value : '';
  }

  /** The API's `kind` in words, when it has one. Empty string means "no badge". */
  private get kindText(): string {
    const kind = this.item?.kind;
    if (typeof kind !== 'string' || kind.length === 0) return '';
    return `This field is ${KIND_TEXT[kind] ?? kind}`;
  }

  private handleClick(): void {
    if (this.disabled || !this.item) return;
    // Only offer the field if the mode does not already have it. `moveTo` de-duplicates
    // too, but letting a redundant add through would still write a new array into the
    // slice, and the access screen treats any change to that array as an unsaved edit.
    if (selectFieldIsAdded(store.getState(), this.content)) return;
    this.emit<KeepFieldAddDetail>('field-add', { item: this.item });
  }

  private renderAddButton() {
    if (this.disabled) return nothing;
    return html`
      <button type="button" class="add-field" aria-label="Add ${this.content} to this mode">
        <wa-icon library=${FA_LIBRARY} name="plus" canvas="auto"></wa-icon>
      </button>
    `;
  }

  private renderKind() {
    const kindText = this.kindText;
    if (this.disabled || kindText.length === 0) return nothing;
    // The icon carries the same text as its accessible name. Without it Web Awesome renders
    // the glyph aria-hidden, and a hover-only tooltip is the whole of the information —
    // i.e. it reached pointer users only.
    return html`
      <keep-tooltip class="add-field" content=${kindText}>
        <wa-icon library=${FA_LIBRARY} name="circle-info" label=${kindText} canvas="auto"></wa-icon>
      </keep-tooltip>
    `;
  }

  render() {
    const format = this.item?.format;
    const formatText = typeof format === 'string' && format.length > 0 ? capitalizeFirst(format) : '';
    const dragging = this.item?.isDragging ? ' item-container--dragging' : '';

    return html`
      <div class="item-container${dragging}" @click=${this.handleClick}>
        ${this.renderAddButton()}
        <div class="labels">
          <span class="field-name">${this.content}</span>
          <span class="field-format">${formatText}</span>
        </div>
        ${this.renderKind()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-single-field': SingleField;
  }
}
