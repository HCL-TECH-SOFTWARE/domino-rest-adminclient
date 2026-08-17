/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { toggleAlert } from '../../store/alerts/action';
import { AGENTS_ERROR, VIEWS_ERROR } from '../../store/databases/types';
import './keep-form-dialog-header';
import './keep-button';

/**
 * The row record the table hands in: one view or one agent, straight from the store.
 *
 * Loosely typed on purpose — `ViewsTable` types its rows `any` and the two shapes only
 * overlap in the fields read here. The index signature keeps the record travelling back
 * out through the events untouched, which is what the activation thunks need.
 */
export interface KeepActivateSwitchRecord {
  viewActive?: boolean;
  agentActive?: boolean;
  viewName?: string;
  agentName?: string;
  [extra: string]: unknown;
}

/** Both events carry the record back, so the table can pass it to its own thunk. */
export interface KeepActivateSwitchToggleDetail {
  view: KeepActivateSwitchRecord;
}

/**
 * The Active/Inactive segmented toggle in the Views and Agents tables.
 *
 * ## Why this is not built on `keep-switch`
 *
 * `keep-switch` wraps `<wa-switch>` — a sliding thumb with a text label beside it, and no
 * `checked` or `disabled` property at all (it forwards one `wa-change` callback). This
 * control is a different widget: a 137x34 pill holding two 68px halves, where the filled
 * half carries the current state as a word and slides between the two sides. Composing
 * `keep-switch` would have meant replacing the widget rather than converting it, and
 * extending `keep-switch` to carry state would have changed the three "Show Active"
 * toggles that already use it. So this element keeps its own markup and takes the switch
 * *semantics* instead: one `role="switch"` button, `aria-checked`, an accessible name,
 * and Enter/Space for free from the native button (#713).
 *
 * ## The flip is optimistic and never reverts
 *
 * The original snapshotted `viewActive`/`agentActive` into local state on mount, flipped
 * that state the instant the pill was clicked, and never read the record again — the
 * activation thunk is fired and not awaited. A failed activation therefore leaves the pill
 * saying "Active" over a record that is still inactive. That is preserved here exactly,
 * because changing it would change what a user sees during every slow save, not only
 * during a failure. `active` is seeded once, in the first `willUpdate`.
 *
 * ## Store access
 *
 * Neither table passes any of this down — `AgentsTable` selects nothing at all and
 * `ViewsTable` selects `dialog.loading` only for its own edit buttons — so there is no
 * property mirroring store state for the bridge to re-apply on every parent render. Both
 * selections are slice references, which is what `StoreController`'s `Object.is` check
 * wants.
 *
 * `VIEWS_ERROR` / `AGENTS_ERROR` are dispatched as bare action objects, exactly as before.
 * `databases/reducer.ts` matches both literally in `extraReducers` for that reason; see
 * `test/store/databases/shared-action-types.test.ts`, which guards the pair.
 */
@customElement('keep-activate-switch')
export default class ActivateSwitch extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      :host {
        display: block;
      }

      /*
       * was .toggle-container.
       *
       * It is the button now, rather than a click-handling div wrapping two nested
       * buttons — that markup put the only click target on a non-focusable element and
       * nested interactive content inside it, so the control could not be reached or
       * operated from the keyboard at all.
       *
       * The content-box declaration is not redundant. There is no document-wide border-box
       * reset in this app (styles.css sets it on one container only), so the div measured
       * 147x44 with its padding; the user-agent sheet gives buttons border-box, which
       * would have silently shrunk the control by 10px in each direction. The absolutely
       * positioned halves are placed against that padding box, so their left/top offsets
       * only add up at the original size.
       *
       * The rest is the user-agent button reset: without the font shorthand below, a
       * button does not inherit the page font.
       */
      .toggle-container {
        position: relative;
        width: 137px;
        height: 34px;
        background-color: var(--keep-surface-highlight);
        cursor: pointer;
        user-select: none;
        border-radius: var(--wa-border-radius-m);
        padding: 5px;
        box-sizing: content-box;
        display: block;
        appearance: none;
        border: none;
        margin: 0;
        font: inherit;
        color: inherit;
        text-align: left;
      }

      /*
       * Marked disabled rather than made disabled. The control still does something while
       * a save is in flight: it raises the "please wait" alert. The old markup disabled
       * the two inner buttons — which greyed the labels and did nothing else, because the
       * click handler was on the container they sat in.
       */
      .toggle-container[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .toggle-container:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * was .toggle-btn. The 500 weight is new text, not a new look: the halves were
       * buttons from the Material library, whose own typography supplied that weight and
       * is not here to supply it any more.
       */
      .toggle-btn {
        display: flex;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        width: 68px;
        height: 24px;
        font-size: var(--wa-font-size-m);
        font-weight: 500;
        line-height: 16px;
        cursor: pointer;
        color: #fff;
        background-color: #008000;
        box-shadow: 0 2px 4px rgb(0, 0, 0, 0.25);
        padding: 8px 12px;
        border-radius: var(--wa-border-radius-m);
        position: absolute;
        top: 10px;
        transition: all 0.2s ease;
        left: 74px;
        overflow-x: visible;
        text-transform: none;
      }

      /*
       * was .disable. Both literals are kept rather than swapped for a semantic token:
       * they are single colours, not a light/dark pair, so they read identically in both
       * themes, and both clear 4.5:1 against the white label (5.1:1 and 4.5:1). A
       * success/neutral token pair would have re-derived those ratios from a ramp this
       * app overrides.
       */
      .disable {
        background-color: #6c7882;
        left: 5px;
      }

      /* was .unchecked */
      .unchecked {
        box-sizing: border-box;
        width: 68px;
        height: 24px;
        left: 74px;
        top: 10px;
        position: absolute;
        color: var(--wa-color-text-quiet);
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: var(--wa-font-size-m);
        font-weight: 500;
        line-height: 16px;
        padding: 8px 12px;
        text-transform: none;
      }

      /* was .left */
      .left {
        left: 5px;
      }

      /* was the .dialog pair in styles/styles.css; see keep-delete-dialog for why the
         border is a token here and a light-dark() literal there. */
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
      .content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      /* was .dialog-content-text, on an element that used to be a bare <text> tag — an
         SVG name with no meaning in HTML. --text-color-primary inherits through the
         shadow boundary. */
      .content p {
        color: var(--text-color-primary);
        margin: 0;
      }

      /* was .dialog-actions */
      .actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-content: center;
        align-items: center;
      }
    `,
  ];

  /** The view or agent this switch activates. */
  @property({ attribute: false }) accessor view: KeepActivateSwitchRecord = {};

  /** `view` or `agent`. Chooses the wording, the thunk and which error flag applies. */
  @property({ type: String }) accessor type = 'view';

  /** The pill's state. Seeded from `view` once, then owned entirely by this element. */
  @state() accessor active = false;

  /** Whether the "reset columns?" confirmation is up. Views only. */
  @state() accessor resetView = false;

  private readonly dialogState = new StoreController(this, (state) => state.dialog);

  private readonly databases = new StoreController(this, (state) => state.databases);

  private seeded = false;

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  private get subject(): string {
    const name = this.view.viewName ?? this.view.agentName;
    return typeof name === 'string' ? name : '';
  }

  private get kind(): string {
    return this.type === 'view' ? 'View' : 'Agent';
  }

  private get heading(): string {
    return `Reset ${this.kind} Columns?`;
  }

  /**
   * Seeds `active` from the record on the first update only, which is what the original's
   * `useState(initial)` did.
   *
   * The ordering this depends on holds: the React bridge assigns element properties from a
   * layout effect, which runs synchronously in the commit phase, while Lit's first update
   * is queued as a microtask — so `view` is always set by the time this runs. The
   * `AgentsTable` suite renders through that bridge and asserts the seeded label, so the
   * dependency is covered rather than assumed.
   */
  protected willUpdate(): void {
    if (this.seeded) return;
    this.seeded = true;
    // `||`, not `??`: the original fell through to agentActive whenever viewActive was
    // falsy, not only when it was absent.
    this.active = Boolean(this.view.viewActive || this.view.agentActive);
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('resetView')) return;
    const dialog = this.nativeDialog;
    if (!dialog) return;
    // Guarded on the opening side only: showModal() on an open dialog throws
    // InvalidStateError, close() on a closed one is a no-op.
    if (this.resetView) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }

  private requestToggle(activate: boolean): void {
    this.emit<KeepActivateSwitchToggleDetail>(activate ? 'toggle-active' : 'toggle-inactive', {
      view: this.view,
    });
  }

  /**
   * The original's branch order, unchanged.
   *
   * Two things about it are worth naming rather than quietly tidying. The second branch
   * tests `!updateViewError || !updateAgentError` — one condition over both flags, so a
   * view's activation is gated on the agent error too; and the last two branches are only
   * reachable when *both* flags are set, where they clear one and do nothing else, so the
   * next click activates. Preserved verbatim: this is a conversion, and the flags are set
   * from one place only (`store/databases/views.ts` sets VIEWS_ERROR on a failed view
   * update; nothing in the tree ever sets AGENTS_ERROR to true).
   */
  private handleToggle(): void {
    const { loading } = this.dialogState.value;
    const { updateViewError, updateAgentError } = this.databases.value;

    if (loading) {
      this.dialogState.dispatch(toggleAlert(`Please wait while ${this.type}s are still saving!`));
      return;
    }
    if (!this.active && (!updateViewError || !updateAgentError)) {
      this.requestToggle(true);
      this.active = true;
    } else if (!updateViewError && this.type === 'view') {
      this.resetView = true;
    } else if (!updateAgentError && this.type === 'agent') {
      this.requestToggle(false);
      this.active = false;
    } else if (this.type === 'view') {
      this.dialogState.dispatch({ type: VIEWS_ERROR, payload: false });
    } else {
      this.dialogState.dispatch({ type: AGENTS_ERROR, payload: false });
    }
  }

  private continueResetView(): void {
    this.requestToggle(false);
    this.active = false;
    this.resetView = false;
  }

  /**
   * Also wired to the dialog's native `cancel`, which Escape fires. Without that the flag
   * stayed true behind a shut dialog, and since the next click only sets it true again
   * nothing re-opened it — the view could never be deactivated for the rest of the page's
   * life. The React version had that bug.
   */
  private closeResetView(): void {
    this.resetView = false;
  }

  render() {
    const { loading } = this.dialogState.value;
    // The name is the record's; "on"/"off" comes from aria-checked, so the label does not
    // repeat it. Falls back to the kind alone for a record with no name (#713).
    const label = this.subject ? `${this.kind} ${this.subject}` : `${this.kind} active`;

    return html`
      <button
        class="toggle-container"
        type="button"
        role="switch"
        aria-checked=${this.active ? 'true' : 'false'}
        aria-disabled=${loading ? 'true' : 'false'}
        aria-label=${label}
        @click=${this.handleToggle}
      >
        <span class="toggle-btn ${this.active ? '' : 'disable'}"
          >${this.active ? 'Active' : 'Inactive'}</span
        >
        <span class="unchecked ${this.active ? 'left' : ''}"
          >${this.active ? 'Inactive' : 'Active'}</span
        >
      </button>
      <dialog
        aria-label=${this.heading}
        aria-describedby="reset-description"
        @cancel=${this.closeResetView}
      >
        <keep-form-dialog-header
          heading=${this.heading}
          @header-close=${this.closeResetView}
        ></keep-form-dialog-header>
        <div class="content">
          <p id="reset-description">
            Making this view inactive will reset all columns and remove any configuration done
            to this view. Do you wish to proceed?
          </p>
        </div>
        <div class="actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.closeResetView}
            >No</keep-button
          >
          <keep-button @click=${this.continueResetView}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-activate-switch': ActivateSwitch;
  }
}
