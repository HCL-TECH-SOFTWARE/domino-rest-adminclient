/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { deleteApplication, fetchMyApps } from '../../store/applications/action';
import { fetchUsers } from '../../store/access/action';
import { getConsents } from '../../store/consents/action';
import { toggleAlert } from '../../store/alerts/action';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { toggleAppFilterDrawer, toggleApplicationDrawer } from '../../store/drawer/action';
import type { AppFormProp } from '../../store/applications/types';
import type { KeepAppItemDeleteDetail, KeepAppItemEditDetail } from './keep-app-item';
import './keep-app-form';
import './keep-apps-table';
import './keep-button';
import './keep-confirm-delete-dialog';
import './keep-consents';
import './keep-drawer';
import './keep-page-loading';

/** The confirmation the delete control opens. Both strings were locals in the replaced file. */
const DELETE_TITLE = 'Delete Application';
const DELETE_MESSAGE = 'Are you sure you want to delete this Application?';

/**
 * The Applications screen — the whole `/apps` route. Tag: `keep-applications`.
 *
 * Replaces `applications/Applications.tsx` and `applications/kanban/Kanban.tsx`, which are one
 * screen split across two files: the outer one held the loading gate and a context provider,
 * the inner one held everything on the page. Nothing crossed between them except that context,
 * and the context is gone (see below), so they are one element.
 *
 * The list itself is {@link ./keep-apps-table}, converted in the previous wave; this is the
 * frame around it — the title bar, the two buttons and the filter control, the delete
 * confirmation, the Application form's drawer and the OAuth Consents dialog.
 *
 * ## The drawer is rendered here, not by a shared shell
 *
 * `applications/FormDrawer.tsx` was a two-case switch over a `formName` string: this screen
 * asked it for the Application form, the schema access tab asked it for the Test Formulas
 * form. It shared a drawer element and nothing else — each branch rendered a different
 * element, with different properties, from a different store flag's worth of state. The
 * Application branch is inlined here, which is what makes the seed a property of this element
 * rather than a form object handed down through a third file.
 *
 * ## The Add-vs-Edit mode is not carried
 *
 * The React ancestors published a `formContext` string through a context, and
 * {@link ./keep-app-form} read it as a property to choose between creating and updating.
 * Nothing sets it here: the form derives the mode from the row it was seeded with (#939), so
 * the presence of {@link formSeed} *is* the mode. A screen that opens a drawer no longer has
 * to remember to announce what kind of drawer it opened.
 *
 * ## Store access
 *
 * Four subscriptions, one per field actually read, rather than the two whole slices the two
 * React files selected between them. Each selector returns a primitive, so the controller's
 * `Object.is` check is exact and an unrelated write to `databases` or `apps` — both of which
 * move constantly — does not re-render the page.
 *
 * ## Accessibility (#713)
 *
 * Three defects the original carried:
 *
 *  - the page had no heading at all. Its title was a paragraph styled to look like one, so
 *    the screen was absent from every heading list and skip-to-content path (1.3.1). It is an
 *    `h1` here, sized by the same declarations.
 *  - the filter control was an icon-only button whose only content was a decorative graphic,
 *    so it had no accessible name (4.1.2). It is named, and the graphic is hidden from the
 *    accessibility tree.
 *  - the Consents dialog had no accessible name (4.1.2). It is labelled.
 */
@customElement('keep-applications')
export default class Applications extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /*
       * The page's box-sizing reset is Web Awesome's native layer — a rule on the root element
       * plus a universal inherit — and neither a universal nor a bare element selector crosses
       * a shadow boundary. Stated on the descendants directly rather than inherited, because a
       * declaration made by a nested sheet beats an inherited value.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * The element occupies the route's box without adding one of its own. Both the loading
       * state and the board below it were direct children of the router outlet before this
       * conversion, and the board's height is a percentage of that box — an extra host box in
       * between would resolve it against auto and collapse the scroll region.
       */
      :host {
        display: contents;
      }

      /* was the AppContainer block. */
      .board {
        overflow-y: auto;
        height: calc(100% - 120px);
      }

      /*
       * was the TopContainer block from styles/layout.tsx. Its three nested rules are dropped:
       * no node on this screen has ever carried any of those class names.
       *
       * The top margin is the one that block sets. The bar also carried a utility from the
       * global sheet asking for a smaller one, but that sheet is imported at the entry and the
       * component block is emitted later at equal specificity, so the utility has never applied
       * here. Named in words rather than as a literal so the sheet's own dead-rule check can
       * still see it die when the last consumer goes.
       */
      .top-bar {
        margin-top: 20px;
        display: flex;
        padding: 15px 0;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: space-between;
      }

      /*
       * was p.header-text from styles/styles.css. A heading element rather than a paragraph —
       * see the accessibility note on the class. The margin reset is the user-agent heading
       * margin, which does reach in here, unlike the class that used to size this text.
       */
      .title {
        display: flex;
        flex: 1;
        margin: 0;
        font-size: 24px;
        font-weight: bold;
      }

      /* was the OptionsContainer block. Reversed, so the controls read right to left. */
      .options {
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        gap: 20px;
      }

      /*
       * The rule between the two buttons and the filter control.
       *
       * Its colour was a hardcoded light/dark pair, which #708 does not allow in an element —
       * the token below is the one keep-app-item already uses for the identical rule between
       * the edit and delete controls in every row of the table underneath. Light mode is
       * unchanged; dark mode gains the same treatment as its neighbour one row down.
       */
      .divider {
        height: 46px;
        width: 1px;
        background-color: var(--wa-color-text-loud);
      }

      /*
       * The filter control. Its class from the global sheet is not restated: no rule of that
       * name exists in any sheet in this app, and the only rule that ever selected it was a
       * dark-mode override whose value is invalid at parse time, so it has never applied.
       */
      .filter-button {
        margin: 0;
        padding: 0;
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        display: flex;
        align-items: center;
      }

      .filter-button:focus-visible {
        border-radius: var(--wa-border-radius-s);
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /* was the AppStackContainer block — a scroll region, not a stack of cards. */
      .list {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 260px);
        max-width: 100%;
        overflow-y: scroll;
      }

      @media only screen and (max-width: 768px) {
        .list {
          height: calc(100vh - 280px);
        }
      }

      /* was the DrawerFormContainer block from styles/dialog.tsx. */
      .drawer-form {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 100vh;
        overflow: hidden;
      }

      @media only screen and (max-width: 768px) {
        .drawer-form {
          width: 100vw;
        }
      }

      /*
       * The Consents dialog.
       *
       * It was a full-screen dialog component from the material library with three declarations
       * of its own; what is below is those three plus the sizing that component supplied. The
       * inset is what leaves the consents panel — which is 90vw wide in its own right — 5% of
       * the viewport on either side, exactly as before.
       *
       * The rest of the block is the user-agent dialog styling this has to override: a border,
       * padding, the centring margin and the modal size caps.
       */
      .consents-dialog {
        display: none;
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        margin: 0;
        padding: 2.5% 5%;
        border: none;
        background: var(--wa-color-surface-default);
        color: var(--wa-color-text-normal);
      }

      .consents-dialog[open] {
        display: flex;
      }
    `,
  ];

  /** Whether the application list has been fetched. Drives the loading gate and the refetch. */
  private readonly appPull = new StoreController(this, (state) => state.apps.appPull);

  /** The other half of the loading gate. The scopes are fetched by the shell, not by us. */
  private readonly scopePull = new StoreController(this, (state) => state.databases.scopePull);

  /**
   * Whether this account may create an application. A primitive rather than the permissions
   * object, so an unrelated write to `databases` cannot re-render the page.
   */
  private readonly canCreate = new StoreController(this, (state) =>
    Boolean(state.databases.permissions?.createDbMapping),
  );

  /** Drives the Application form's drawer. The form reads the same flag to seed itself. */
  private readonly drawer = new StoreController(
    this,
    (state) => state.drawer.applicationDrawer,
  );

  /** The application the delete confirmation is standing over. */
  @state() private accessor selected = '';

  /** Whether the OAuth Consents dialog is up. */
  @state() private accessor consentsOpen = false;

  /**
   * The row the form drawer was opened on, or nothing when it was opened to add.
   *
   * **This is the Add-vs-Edit mode** — see the class docblock. It is the object
   * {@link ./keep-app-item} computed and handed up as `app-edit`, passed straight through:
   * the form seeds from it and derives the mode from it, so there is one thing to get right
   * rather than a value and a flag that can disagree.
   */
  @state() private accessor formSeed: AppFormProp | undefined;

  @query('.consents-dialog') private accessor consentsDialog!: HTMLDialogElement | null;

  /**
   * Whether {@link consentsDialog} has been opened by us.
   *
   * Tracked rather than read back off `dialog.open`, because a dialog that the user dismissed
   * with Escape reports itself closed while our flag still says open — and the environment the
   * suite runs in implements neither method, so `open` never moves there at all.
   */
  private dialogShown = false;

  /** Previous value of the pulled flag, so the fetch below sees a change rather than a level. */
  private lastAppPull: boolean | undefined;

  /**
   * Fetch the applications if nobody has yet.
   *
   * The effect this replaces listed the pulled flag as a dependency, so it ran on mount and
   * again whenever that flag moved — which is reproduced by comparing it rather than by
   * fetching once on connect. The difference only shows if something ever sets the flag back
   * to false; nothing does today, and the guard costs one field.
   *
   * `willUpdate` rather than `updated`: the dispatch is asynchronous, so nothing it does can
   * land inside this render, and doing it here keeps it out of a second update pass.
   */
  protected willUpdate(): void {
    const pulled = this.appPull.value;
    if (pulled === this.lastAppPull) return;
    this.lastAppPull = pulled;
    if (!pulled) this.appPull.dispatch(fetchMyApps());
  }

  protected updated(): void {
    const dialog = this.consentsDialog;
    if (!dialog) return;
    if (this.consentsOpen && !this.dialogShown) {
      this.dialogShown = true;
      dialog.showModal();
    } else if (!this.consentsOpen && this.dialogShown) {
      this.dialogShown = false;
      dialog.close();
    }
  }

  /**
   * Open the form to add an application, or explain why it cannot be opened.
   *
   * The seed is cleared first, so the form comes up blank rather than showing whatever row
   * was last edited. Clearing it is also what tells the form this is an add.
   */
  private readonly createAction = (): void => {
    if (!this.canCreate.value) {
      this.canCreate.dispatch(toggleAlert(`You don't have permission to create application.`));
      return;
    }
    this.formSeed = undefined;
    this.drawer.dispatch(toggleApplicationDrawer());
  };

  /**
   * A row asked to be edited: keep its values and open the drawer. Both halves are what the
   * replaced file did, in this order.
   */
  private readonly handleAppEdit = (event: CustomEvent<KeepAppItemEditDetail>): void => {
    this.formSeed = event.detail.values;
    this.drawer.dispatch(toggleApplicationDrawer());
  };

  /**
   * The drawer dismissed itself — its own close control, Escape, or a click outside.
   *
   * Guarded, and that is the whole point. `toggleApplicationDrawer` toggles, so an unguarded
   * handler run on a drawer that is already closed *opens* it in the store. The React
   * `FormDrawer` this replaced passed no `closeFn` at all, so `keep-drawer`'s default no-op
   * ran instead and the store was simply never told: dismissing the drawer left
   * `drawer.applicationDrawer` true, and the next *Add Application* toggled it to **false** —
   * so the button appeared dead and only worked on the second press.
   *
   * Same shape as the quick-config drawer fixed earlier in #806, and the same guard
   * `keep-scope-form-container` uses.
   */
  private readonly handleDrawerHide = (): void => {
    if (this.drawer.value) this.drawer.dispatch(toggleApplicationDrawer());
  };

  /**
   * A row asked to be deleted. The id is recorded before the dialog is opened, rather than
   * after as it was, so the confirmation cannot be answered against the previous row's id.
   */
  private readonly handleAppDelete = (event: CustomEvent<KeepAppItemDeleteDetail>): void => {
    this.selected = event.detail.appId;
    this.appPull.dispatch(toggleDeleteDialog());
  };

  /** Yes was pressed on the confirmation. The thunk closes the dialog itself. */
  private readonly deleteApp = (): void => {
    this.appPull.dispatch(deleteApplication(this.selected));
  };

  /** The three things the Consents dialog needs before it can show anything. */
  private readonly openConsents = (): void => {
    if (!this.appPull.value) this.appPull.dispatch(fetchMyApps());
    this.appPull.dispatch(fetchUsers());
    this.appPull.dispatch(getConsents());
    this.consentsOpen = true;
  };

  private readonly closeConsents = (): void => {
    this.consentsOpen = false;
  };

  /**
   * A press that landed on the dialog itself rather than on anything inside it is a press on
   * the region around the panel, which closed the dialog component this replaces. A native
   * dialog does not do that for us.
   */
  private readonly handleDialogClick = (event: MouseEvent): void => {
    if (event.target === event.currentTarget) this.closeConsents();
  };

  private readonly openFilters = (): void => {
    this.drawer.dispatch(toggleAppFilterDrawer());
  };

  private renderOptionsBar() {
    return html`
      <section class="options">
        <keep-button icon="plus" @click=${this.createAction}>Add Application</keep-button>
        <keep-button @click=${this.openConsents}>OAuth Consents</keep-button>
        <div class="divider"></div>
        <button class="filter-button" aria-label="Filter applications" @click=${this.openFilters}>
          <wa-icon library=${FA_LIBRARY} name="filter" canvas="auto" aria-hidden="true"></wa-icon>
        </button>
      </section>
    `;
  }

  /**
   * The Consents dialog. Its contents are rendered only while it is up, which is what the
   * dialog component this replaces did — that screen holds three store subscriptions and
   * fetches nothing itself, so mounting it behind a closed dialog would be a live listener
   * for a panel nobody can see.
   */
  private renderConsentsDialog() {
    return html`
      <dialog
        class="consents-dialog"
        aria-label="OAuth Consents"
        @click=${this.handleDialogClick}
        @close=${this.closeConsents}
      >
        ${this.consentsOpen
          ? html`<keep-consents dialog @consents-close=${this.closeConsents}></keep-consents>`
          : nothing}
      </dialog>
    `;
  }

  private renderBoard() {
    return html`
      <div class="board">
        <div class="top-bar">
          <h1 class="title">Application Management</h1>
          ${this.renderOptionsBar()}
        </div>
        <div class="list">
          <keep-apps-table
            @app-edit=${this.handleAppEdit}
            @app-delete=${this.handleAppDelete}
          ></keep-apps-table>
        </div>
        <keep-confirm-delete-dialog
          heading=${DELETE_TITLE}
          message=${DELETE_MESSAGE}
          @confirm-delete=${this.deleteApp}
        ></keep-confirm-delete-dialog>
        <keep-drawer
          label="Application Form"
          ?open=${this.drawer.value}
          .closeFn=${this.handleDrawerHide}
        >
          <div class="drawer-form">
            <keep-app-form .initialValues=${this.formSeed}></keep-app-form>
          </div>
        </keep-drawer>
        ${this.renderConsentsDialog()}
      </div>
    `;
  }

  render() {
    return this.scopePull.value && this.appPull.value
      ? this.renderBoard()
      : html`<keep-page-loading message="Loading Applications"></keep-page-loading>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-applications': Applications;
  }
}
