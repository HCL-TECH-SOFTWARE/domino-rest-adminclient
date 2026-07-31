/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { store } from '../../store/store';
import { fetchMyApps } from '../../store/applications/action';
import { fetchUsers } from '../../store/access/action';
import { getConsents } from '../../store/consents/action';
import './keep-consents';

/**
 * The `/apps/consents` route. Tag: `keep-consents-container`.
 *
 * Replaces `applications/ConsentsContainer.tsx`, which was a padded box around
 * {@link ./keep-consents} plus the fetch that fills it.
 *
 * ## The route mounts this module directly
 *
 * It used to be reached through `keep-elements/react/KeepConsentsContainer`, because
 * `Views.tsx` wrapped every route in `React.lazy`, which needs a module whose default export
 * is a *component* — and an element module's is a class. #719 P4 made the outlet a Lit
 * element, so `keep-views` names the tag and imports this module for its registration alone.
 * That wrapper is deleted.
 *
 * ## No `StoreController`
 *
 * Nothing here is rendered from the store. `appPull` decides once, at connect, whether the
 * application list still has to be fetched, and is never read again — so a controller would
 * add a subscription whose only possible effect is a re-render of markup that cannot change.
 * The store module is imported directly, which is what an element that only dispatches does.
 *
 * ## The fetch runs once, not twice
 *
 * The effect this replaces listed `appPull` as a dependency, so it re-ran the moment
 * `fetchMyApps` resolved and flipped that flag — issuing a second `/users` and a second
 * `/consents` on every cold arrival. Nothing consumed the second pair: `keep-consents-table`
 * subscribes to all three slices and re-renders when the apps land on their own. Both are
 * requested once here.
 */
@customElement('keep-consents-container')
export default class ConsentsContainer extends KeepElement {
  /* was the ConsentsBox block. */
  static styles = css`
    :host {
      display: flex;
      padding: 30px;
      box-sizing: border-box;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (!store.getState().apps.appPull) store.dispatch(fetchMyApps());
    store.dispatch(fetchUsers());
    store.dispatch(getConsents());
  }

  render() {
    return html`<keep-consents></keep-consents>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-consents-container': ConsentsContainer;
  }
}
