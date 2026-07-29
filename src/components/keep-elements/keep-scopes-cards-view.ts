/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { appIconUri, loadAppIcons } from '../../services/app-icons';
import './keep-default-card';
import './keep-zero-results';

/** Which scope the user asked to open. Same contract as `keep-scopes-default-view`. */
export interface KeepScopeOpenDetail {
  scope: unknown;
}

/**
 * The "card" view of the scopes list: one `keep-default-card` per database.
 *
 * Child properties are set with **property** bindings (`.title=`, `.icon=`, …) rather than
 * attributes. That is what `createComponent` did on the React side, and it matters for `title`
 * in particular: as an attribute it would also raise the browser's native tooltip.
 */
@customElement('keep-scopes-cards-view')
export default class ScopesCardsView extends KeepElement {
  static styles = css`
    /* was SchemasMainContainer */
    :host {
      display: flex;
      flex-direction: column;
    }

    /* was ExtraFlex, with no utility override here so it keeps its own 20px gap. ExtraFlex's
       .child rules are dropped - nothing here carries that class. */
    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }

    /* were the medium-font, mb-30, mt-5 and color-text-primary utilities. No stylesheet in the tree defines
       medium-font, so only the other three had any effect. */
    .heading {
      margin-top: 5px;
      margin-bottom: 30px;
      color: #000;
    }
  `;

  @property({ attribute: false }) accessor databases: unknown[] = [];

  /**
   * #772 put the 219 KB icon map behind a dynamic import, so the URIs are not available on the
   * first render and the cards show their own skeleton until they are.
   *
   * The React version used `useAppIcons()`, a `useSyncExternalStore` over the service's
   * subscriber set. A one-shot await is equivalent here and needs no subscription: the store
   * transitions exactly once, from empty to loaded, and never changes again. `loadAppIcons` is
   * idempotent and concurrent callers share the one `import()`.
   */
  connectedCallback(): void {
    super.connectedCallback();
    void loadAppIcons().then(() => this.requestUpdate());
  }

  private openScope(scope: unknown) {
    this.emit<KeepScopeOpenDetail>('scope-open', { scope });
  }

  render() {
    const databases = this.databases ?? [];
    return html`
      <span class="heading">HCL Domino REST API Databases Scope</span>
      <div class="cards">
        ${databases.length > 0
          ? (databases as any[]).map(
              (database: any) => html`
                <keep-default-card
                  .status=${database.isActive}
                  .icon=${appIconUri(database.iconName)}
                  .title=${database.apiName}
                  .subtitle=${`${database.schemaName} (${database.nsfPath})`}
                  .acl=${database.maximumAccessLevel ? database.maximumAccessLevel : '*Editor'}
                  .description=${database.description}
                  .delete=${false}
                  @click=${() => this.openScope(database)}
                ></keep-default-card>
              `,
            )
          : html`
              <keep-zero-results
                mainLabel=" Sorry, No result found"
                secondaryLabel="What you search was unfortunately not found or doesn't exist."
              ></keep-zero-results>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-scopes-cards-view': ScopesCardsView;
  }
}
