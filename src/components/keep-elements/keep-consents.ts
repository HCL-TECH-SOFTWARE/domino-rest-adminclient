/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { deleteConsent, toggleDeleteConsent } from '../../store/consents/action';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import { FA_LIBRARY } from '../../services/icon-library';
import type {
  KeepConsentsTableFiltersOnDetail,
  KeepConsentsTableResetDetail,
} from './keep-consents-table';
import './keep-consents-table';
import './keep-zero-results';
import './keep-form-dialog-header';
import './keep-button';

/** The close control was pressed. The caller knows what it opened, so there is no payload. */
export type KeepConsentsCloseDetail = undefined;

/**
 * The OAuth Consents screen. Tag: `keep-consents`. Exposed to React as `KeepConsents`.
 *
 * Replaces `applications/kanban/Consents.tsx`. It is the frame around
 * {@link ./keep-consents-table}: the title, the Expand/Collapse/All-filters/Reset bar, the
 * empty state, and the "Revoke consent?" confirmation.
 *
 * Two hosts render it. `applications/kanban/Kanban.tsx` puts it in a full-screen dialog and
 * passes `dialog`, and {@link ./keep-consents-container} is the `/apps/consents` route.
 *
 * ## Store access
 *
 * Two subscriptions. The consents slice is selected as a whole — one reference, so the
 * controller's `Object.is` check is exact — because five of its six fields are read here and
 * neither host selects any of them: `Kanban` selects the apps and databases slices, the
 * container selects nothing. There is therefore no property for a subscription to fight, and
 * the same reasoning `keep-consents-table` records for its own four.
 *
 * The second reads the two loading flags as one boolean; see the empty-state note below.
 *
 * ## The close control is rendered only in the dialog
 *
 * It used to be rendered always, with its icon behind the same flag — so on the route the
 * markup was a `<button>` with no content, no padding and no border: a zero-by-zero box that
 * no pointer could reach, that no name was announced for, and that was still a tab stop which
 * navigated the user off the page when activated. Rendering the whole control behind the flag
 * removes that (#713) and is why this element needs no router: the only navigation it ever
 * performed was from a control nobody could see.
 *
 * ## Three defects this conversion fixes
 *
 * 1. **The close glyph was invisible in both colour modes.** Web Awesome's `wa-native` layer
 *    colours every light-DOM button `var(--wa-color-on-loud, var(--wa-color-neutral-on-loud))`,
 *    which is white in light mode and near-black in dark; the button's classes overrode the
 *    matching *background* and not the colour, so the glyph was drawn in the dialog's own
 *    surface colour. A bare element selector does not cross a shadow boundary, so the rule is
 *    restated below without those two colour declarations and the glyph reads as text.
 * 2. **Escape left the store believing the dialog was open.** A native `<dialog>` closes
 *    itself on Escape without telling anyone, and the flag that drives it is in the store, so
 *    the next Revoke toggled it back to false and closed an already-closed dialog. The revoke
 *    confirmation could not be reopened for the rest of the session. `cancel` is handled now.
 * 3. **The empty state was shown while the list was still loading.** The choice was on
 *    `consents.length`, which is zero during the first fetch — so every cold arrival showed
 *    "Sorry, no consents found" for as long as the request took, and `keep-consents-table`'s
 *    own loading panel could only ever appear for a user who already had consents. The
 *    loading flags are part of that choice here.
 *
 * ## Styling
 *
 * The two Linaria blocks and the seven global utility classes the markup carried are restated
 * in `static styles`, since neither reaches into a shadow root. Two rules are dropped as dead:
 * the `.title` rule in the header block (the markup labelled that span `medium-text text-bold`
 * instead) and the `.text` rule in the options block (no node ever carried it). `.visible` on
 * Reset is dropped too — it set `visibility: visible`, which is the initial value.
 *
 * The option buttons' hover pair is left as the two literals it has always been. They are not
 * on any ramp, but they are mode-invariant *together* — the rule sets the text colour and the
 * background in the same breath, and white on that blue measures 5.75:1 — so unlike a lone
 * hardcoded colour they degrade in neither mode. Moving them onto `--keep-surface-brand` would
 * change the hover from blue to the brand purple, which is a design decision and not a
 * conversion.
 *
 * @fires consents-close - `CustomEvent<KeepConsentsCloseDetail>`
 */
@customElement('keep-consents')
export default class Consents extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /*
       * Neither a universal selector nor a bare element selector crosses a shadow boundary,
       * so Web Awesome's html border-box plus universal inherit stops at the host. Stated
       * on the descendants directly rather than as inherit: an inherited value loses to any
       * declaration a nested sheet makes on a cell or a control.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /* was the ConsentsContainer block. */
      :host {
        display: flex;
        gap: 16px;
        flex-direction: column;
        z-index: 1;
        width: 90vw;
        padding: 30px 35px;
      }

      /*
       * Web Awesome's wa-native button region, restated for the reason above. Height, the
       * flex centring, the inherited family, the action weight, the pointer and the
       * transition all arrive through a bare button selector today.
       *
       * Two departures from it, both deliberate. Its font-size reads a token this theme
       * never defines, so the declaration is invalid at computed-value time and the size
       * that actually renders is the inherited one — written as inherit here, which is what
       * happens rather than what the sheet says. And its colour pair is not restated: the
       * background half was already overridden by every one of these four buttons, and the
       * colour half is the invisible-glyph defect in the class note.
       */
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: var(--wa-form-control-height);
        padding: 0 var(--wa-form-control-padding-inline);
        font-family: inherit;
        font-size: inherit;
        font-weight: var(--wa-font-weight-action);
        text-decoration: none;
        vertical-align: middle;
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        background: none;
        border: none;
        color: var(--text-color-primary);
        transition-property: background, border, box-shadow, color;
        transition-duration: var(--wa-transition-fast);
        transition-timing-function: var(--wa-transition-easing);
      }

      button:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /* was the Header block. */
      .header {
        display: flex;
        justify-content: space-between;
        width: 100%;
        align-items: center;
      }

      /* was medium-text + text-bold + m-0 + p-0 on the title span. */
      .heading {
        font-size: 16px;
        color: var(--text-color-primary);
        font-weight: bold;
        margin: 0;
        padding: 0;
      }

      /* was m-0 + p-0 on the close button. */
      .close {
        margin: 0;
        padding: 0;
      }

      /*
       * wa-icon has no size property; the React call sites reached its box through Web
       * Awesome's wa-size-xl utility, which is a font-size class in a document layer and so
       * does not cross either.
       */
      .icon-xl {
        font-size: var(--wa-font-size-xl);
      }

      /* was the OptionsBar block. */
      .options {
        display: flex;
        padding: 25px 16px 0 16px;
        width: 100%;
        align-items: center;
        gap: 10px;
      }

      .option {
        display: flex;
        gap: 5px;
        align-items: center;
        border-radius: var(--wa-border-radius-m);
        padding: 5px 10px 5px 5px;
        background: none;
      }

      .option:hover {
        color: #fff;
        background-color: #0f5fdc;
      }

      /*
       * The two rules between the three buttons are CSS rather than glyphs: the
       * short-vertical from styles.css that AppItem already draws, as in 72a0c1f. This bar
       * is a flex row with centred items, so a bare div lands where the glyph did and needs
       * no inline-block. Only the height is restated, from the xl size the glyph carried;
       * the shared 31px belongs to a taller row. The colour is the class's own
       * --wa-color-text-loud rather than the hardcoded grey once passed to the glyph, which
       * was on no token ramp.
       */
      .rule {
        height: 1.5em;
        width: 1px;
        background-color: var(--wa-color-text-loud);
      }

      /* was the .dialog pair in styles/styles.css. Its border reads a token rather than
         that rule's light-dark() literal, which #708 does not allow inside an element. */
      dialog {
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        width: 30%;
        height: fit-content;
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
        flex-direction: column;
        gap: 30px;
        display: none;
      }

      dialog[open] {
        display: flex;
      }

      /* was .dialog-content */
      .dialog-content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      /* was .dialog-content-text */
      .dialog-content-text {
        color: var(--text-color-primary);
      }

      /* was .dialog-actions */
      .dialog-actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-content: center;
        align-items: center;
      }
    `,
  ];

  /**
   * Whether a host dialog frames this screen. Adds the close control; `Kanban` sets it, the
   * route does not. See the class note for why the control is not simply always there.
   */
  @property({ type: Boolean }) accessor dialog = false;

  /** Expand all / Collapse all, handed to the table. */
  @state() accessor expand = false;

  /** The table's legacy "a filter is on" flag, round-tripped as the original did. */
  @state() accessor filtersOn = false;

  /** Reset, handed to the table, which clears itself and hands the flag back off. */
  @state() accessor resetFilters = false;

  private readonly consentsCtl = new StoreController(this, (state) => state.consents);

  private readonly loadingCtl = new StoreController(
    this,
    (state) => state.loading.consentsLoading || state.loading.usersLoading,
  );

  /**
   * What was last applied to the native dialog.
   *
   * The store is not a reactive property, so `updated()` has no changed-properties entry to
   * key off and runs on every render. Tracking the last applied value is what makes this an
   * edge trigger — without it an unrelated re-render re-issues `showModal()`, which throws
   * `InvalidStateError` on an already-open dialog. Same shape as
   * {@link ./keep-confirm-delete-dialog}.
   */
  private applied = false;

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  protected updated(): void {
    const native = this.nativeDialog;
    if (!native) return;
    const open = this.consentsCtl.value.deleteConsentDialog;
    if (open === this.applied) return;
    this.applied = open;
    if (open) {
      // showModal() on an already-open dialog throws; close() on a closed one is a no-op,
      // so only the opening side needs the second guard.
      if (!native.open) native.showModal();
    } else {
      native.close();
    }
  }

  /** Put the revoke confirmation away, and clear what it was asking about. */
  private readonly closeRevokeDialog = (): void => {
    this.consentsCtl.dispatch(toggleDeleteConsent('', '', '', ''));
  };

  private confirmRevoke(): void {
    this.consentsCtl.dispatch(
      deleteConsent(this.consentsCtl.value.deleteUnid, this.closeRevokeDialog),
    );
  }

  private close(): void {
    this.emit<KeepConsentsCloseDetail>('consents-close');
  }

  private handleFiltersOnChange(event: CustomEvent<KeepConsentsTableFiltersOnDetail>): void {
    event.stopPropagation();
    this.filtersOn = event.detail.filtersOn;
  }

  private handleResetChange(event: CustomEvent<KeepConsentsTableResetDetail>): void {
    event.stopPropagation();
    this.resetFilters = event.detail.reset;
  }

  /** The sentence the revoke confirmation asks, with or without a resolved application. */
  private get revokeQuestion(): string {
    const { appName, username, scope } = this.consentsCtl.value;
    return appName
      ? `Are you sure you want to revoke consent for application ${appName} with user ${username} and scopes ${scope}?`
      : `Are you sure you want to revoke consent for user ${username} with scopes ${scope}?`;
  }

  /**
   * The Expand / Collapse / All filters / Reset bar.
   *
   * Not `renderOptions`: `LitElement` already declares an instance property of that name —
   * the `{ host: this }` it passes to `lit-html`'s `render` — and an instance property
   * shadows a prototype method, so the call site read an object and threw.
   */
  private renderOptionsBar() {
    return html`
      <div class="options">
        <button
          type="button"
          class="option"
          @click=${() => {
            this.expand = true;
          }}
        >
          <wa-icon
            library=${FA_LIBRARY}
            name="chevron-down"
            canvas="auto"
            class="icon-xl"
          ></wa-icon>
          Expand all
        </button>
        <div class="rule"></div>
        <button
          type="button"
          class="option"
          @click=${() => {
            this.expand = false;
          }}
        >
          <wa-icon library=${FA_LIBRARY} name="chevron-up" canvas="auto" class="icon-xl"></wa-icon>
          Collapse all
        </button>
        <div class="rule"></div>
        <button
          type="button"
          class="option"
          @click=${() => this.consentsCtl.dispatch(toggleConsentsDrawer())}
        >
          <!-- Kept as an inline SVG rather than swapped for wa-icon: no funnel glyph is
               bundled, it inherits currentColor, and it needs no icon library at runtime.
               Decorative, because the button says "All filters" beside it. -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2z"
            />
          </svg>
          All filters
        </button>
        <button
          type="button"
          @click=${() => {
            this.resetFilters = true;
          }}
        >
          Reset
        </button>
      </div>
    `;
  }

  private renderList() {
    // The loading flags are part of this choice; see the class note. Without them the empty
    // state stands in for the table's own loading panel on every cold arrival.
    if (this.consentsCtl.value.consents.length > 0 || this.loadingCtl.value) {
      return html`
        <keep-consents-table
          .expand=${this.expand}
          .filtersOn=${this.filtersOn}
          .reset=${this.resetFilters}
          @filters-on-change=${this.handleFiltersOnChange}
          @reset-change=${this.handleResetChange}
        ></keep-consents-table>
      `;
    }
    return html`
      <keep-zero-results
        .mainLabel=${'Sorry, no consents found'}
        .secondaryLabel=${"What you search was unfortunately not found or doesn't exist."}
      ></keep-zero-results>
    `;
  }

  render() {
    // Accessibility (#713):
    //  - the title is an <h2>, so the screen has a heading rather than a bold span.
    //  - type="button" on all four controls, because a button in a form defaults to submit.
    //  - aria-label on the modal rather than aria-labelledby: the heading lives inside
    //    keep-form-dialog-header's shadow root and an IDREF cannot cross a shadow boundary.
    //  - aria-describedby points at the question, which nothing referenced before.
    return html`
      <div class="header">
        <h2 class="heading">OAuth Consents</h2>
        ${this.dialog
          ? html`
              <button type="button" class="close" aria-label="Close" @click=${this.close}>
                <wa-icon
                  library=${FA_LIBRARY}
                  name="xmark"
                  canvas="auto"
                  class="icon-xl"
                ></wa-icon>
              </button>
            `
          : null}
      </div>
      ${this.renderOptionsBar()} ${this.renderList()}
      <dialog
        aria-label="Revoke consent?"
        aria-describedby="reset-form-contents"
        @cancel=${this.closeRevokeDialog}
      >
        <keep-form-dialog-header
          heading="Revoke consent?"
          @header-close=${this.closeRevokeDialog}
        ></keep-form-dialog-header>
        <div class="dialog-content">
          <div id="reset-form-contents" class="dialog-content-text">${this.revokeQuestion}</div>
        </div>
        <div class="dialog-actions">
          <keep-button @click=${this.confirmRevoke}>Yes</keep-button>
          <keep-button variant="neutral" appearance="outlined" @click=${this.closeRevokeDialog}>
            No
          </keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-consents': Consents;
  }
}
