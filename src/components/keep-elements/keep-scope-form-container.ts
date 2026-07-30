/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { clearDBError } from '../../store/databases/action';
import { toggleDrawer } from '../../store/drawer/action';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { toggleAlert } from '../../store/alerts/action';
import './keep-drawer';
import './keep-scope-form';
import type { ScopeRow } from './keep-scope-form';
import './keep-delete-dialog';
import type { KeepDeleteTarget } from './keep-delete-dialog';

/**
 * The Scope drawer shell. Tag: `keep-scope-form-container`.
 *
 * Replaces `database/ScopeFormContainer.tsx`. What is left of that file once the form takes
 * its own state is genuinely a shell: read the drawer flag, render the drawer, decide whether
 * a delete is allowed, and hold the confirmation dialog.
 *
 * ### It does not own the form's state
 *
 * The React container held the form object, the validation schema, four values in component
 * state and two effects to keep them roughly in step. All of that moved into
 * `keep-scope-form`, for the reason `keep-quick-config-drawer` gives: handing a form object
 * across a shadow boundary as a property keeps the coupling alive through the type after
 * removing it from the imports. Two of those component-state copies were also the only thing
 * the submit read, and were seeded once at mount and never updated — see the form's docblock.
 *
 * ### `permissions` is read, not received
 *
 * The React version took it as a prop from the list view, which read it from the store. A prop
 * that mirrors store state is the wrapper hazard in its purest form: `@lit/react` re-applies
 * every prop on every parent render with no dirty check, so the element would be told its own
 * state by a parent that read it from the store the element can read itself.
 *
 * `database` and `isEdit` stay properties: they are the list view's selection, not the store's.
 */
@customElement('keep-scope-form-container')
export default class ScopeFormContainer extends KeepElement {
  static styles = css`
    /* Restated inside the shadow root: the global reset does not cross the boundary. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: contents;
    }

    /* Was the DrawerFormContainer styled.div. */
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
  `;

  /** The scope the list view has selected, or nothing when the drawer stands in for an Add. */
  @property({ attribute: false }) accessor database: ScopeRow | undefined;

  @property({ type: Boolean }) accessor isEdit = false;

  private readonly drawer = new StoreController(this, (state) => state.drawer.visible);

  /** One field, not the slice: `state.databases` changes constantly and only this is read. */
  private readonly permissions = new StoreController(
    this,
    (state) => state.databases.permissions,
  );

  private close(): void {
    this.permissions.dispatch(clearDBError());
    this.drawer.dispatch(toggleDrawer());
  }

  /**
   * Everything that finishes hiding the drawer arrives here, and the guard is what tells two
   * different things apart.
   *
   * `keep-drawer` calls this from `wa-after-hide`, which Web Awesome fires whenever the panel
   * has finished hiding — including when the hide was our own doing. So a close we asked for
   * comes back to us as a hide notification a frame later, and unguarded that second visit
   * toggles the flag again and reopens the drawer, empty. If the flag is still up, the hide
   * came from the user dismissing the panel and the store has to catch up; if it is already
   * down, the close has been accounted for. The React version had the same guard.
   */
  private handleHide(): void {
    if (this.drawer.value) this.close();
  }

  /**
   * A delete opens the confirmation dialog, or explains why it cannot. The check lives here
   * rather than in the form because this is where the dialog is.
   */
  private handleDelete(): void {
    if (this.permissions.value?.deleteDbMapping) {
      this.permissions.dispatch(toggleDeleteDialog());
    } else {
      this.permissions.dispatch(toggleAlert(`You don't have permission to delete scope.`));
    }
  }

  render() {
    const selected: KeepDeleteTarget = {
      isDeleteSchema: false,
      apiName: this.database?.apiName ?? '',
    };
    return html`
      <keep-drawer
        label="${this.isEdit ? 'Edit' : 'Add New'} Scope"
        ?open=${this.drawer.value}
        .closeFn=${() => this.handleHide()}
      >
        <div class="drawer-form">
          <keep-scope-form
            .database=${this.database}
            .isEdit=${this.isEdit}
            @close=${() => this.close()}
            @delete=${() => this.handleDelete()}
          ></keep-scope-form>
          <keep-delete-dialog .selected=${selected}></keep-delete-dialog>
        </div>
      </keep-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-scope-form-container': ScopeFormContainer;
  }
}
