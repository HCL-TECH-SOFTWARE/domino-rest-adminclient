/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { clearDBError } from '../../store/databases/action';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import './keep-drawer';
import './keep-alert';
import './keep-quick-config-form';
import type QuickConfigForm from './keep-quick-config-form';

/**
 * The Quick Config drawer shell. Tag: `keep-quick-config-drawer`.
 *
 * Replaces `database/QuickConfigFormContainer.tsx`. What is left of that file after the form
 * took its own state is genuinely a shell: read the drawer flag, render the drawer, show a
 * toast when a save fails, and clear the form when the drawer moves.
 *
 * ### It does not own the form's state
 *
 * The React container held `useFormik` and passed `FormikProps<any>` down to the leaf. That
 * split cannot survive the conversion: handing a form object across a shadow boundary as a
 * property would keep the coupling alive through the type after removing it from the imports.
 * `keep-quick-config-form` owns its own `FormController`, and the two values the container
 * really did own — `nsfPath` and `icon` — moved with it. That is #894 and #897 by construction:
 * there is no second copy of `nsfPath` left to disagree with the submitted one, and no
 * `initialValues` entry the form does not write.
 *
 * The one thing the shell still drives is the clear-on-move, which it does through the
 * element's public `reset()` rather than a shared object.
 */
@customElement('keep-quick-config-drawer')
export default class QuickConfigDrawer extends KeepElement {
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

    /* Was the DrawerFormContainer styled.div. No backticks inside a css template. */
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

  private readonly drawer = new StoreController(this, (state) => state.drawer.quickConfigDrawer);

  /**
   * Two fields, so the whole slice rather than a projection — same reasoning as the form
   * (#895): a projection allocates on every store change and compares no fewer references.
   */
  private readonly db = new StoreController(this, (state) => state.databases);

  @query('keep-quick-config-form') private accessor form!: QuickConfigForm | null;

  /** Previous drawer flag, so `updated` sees the edge rather than the level. */
  private wasOpen = false;

  /**
   * The React version reset on **every** change of the drawer flag, opening or closing, via a
   * `useEffect` — so that is what this does. It also tried to focus a field and could not: the
   * ref it read was never attached to an element, so `descriptionElement` was always null.
   * Focus is real here, and only on open.
   *
   * The comparison is explicit rather than a `changedProperties.has(…)`: the flag arrives from
   * a `StoreController`, which drives re-renders with a bare `requestUpdate()` and so puts
   * nothing in the changed-properties map.
   */
  protected updated(_changed: PropertyValues): void {
    if (this.wasOpen === this.drawer.value) return;
    this.wasOpen = this.drawer.value;
    this.form?.reset();
    if (this.drawer.value) this.form?.focusFirstField();
  }

  private close(): void {
    this.db.dispatch(clearDBError());
    this.drawer.dispatch(toggleQuickConfigDrawer());
  }

  render() {
    const { dbError, dbErrorMessage } = this.db.value;
    return html`
      <keep-drawer
        label="Quick Config"
        ?open=${this.drawer.value}
        .closeFn=${() => this.close()}
      >
        <div class="drawer-form">
          <keep-quick-config-form @close=${() => this.close()}></keep-quick-config-form>
        </div>
      </keep-drawer>
      ${dbError
        ? html`<keep-alert
            variant="danger"
            heading="Quick config error!"
            message=${dbErrorMessage}
          ></keep-alert>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-quick-config-drawer': QuickConfigDrawer;
  }
}
