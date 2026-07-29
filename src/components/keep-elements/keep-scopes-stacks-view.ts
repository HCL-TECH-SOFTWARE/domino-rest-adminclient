/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { store } from '../../store/store';
import { setDbIndex } from '../../store/databases/action';
import { getDatabaseIndex } from '../../store/databases/scripts';
import type { KeepScopeOpenDetail } from './keep-scopes-default-view';
import type { KeepSlimDatabaseCardDetail } from './keep-slim-database-card';
import './keep-slim-database-card';
import './keep-zero-results';

/**
 * The "stack" view of the scopes list: active scopes, then inactive ones.
 *
 * ## The delete dialog is gone from this view, and it was unreachable
 *
 * The React version rendered a `DeleteDialog` here with `isDeleteSchema: true` — on the
 * *scopes* list — fed by two pieces of state that only a context-menu handler ever set. There
 * was no way to open it: the cards show a delete control only on the schemas list, and the MUI
 * Popper that presumably once offered a Delete item is long gone (what was left of it was an
 * `anchorEl` feeding two props that styled nothing, removed with the card's conversion).
 *
 * Worse, it was a second dialog on the same global `dialog.deleteDialog` flag as
 * `ScopeFormContainer`'s, which *is* reachable. Both opened together; the later one in DOM
 * order won the top layer, so the user saw the right one and an empty "Delete ?" sat behind it.
 *
 * ## Why the store is imported directly instead of through StoreController
 *
 * This element dispatches and never selects. `StoreController` exists to replace `useSelector`
 * *and* `useDispatch`; with no selector there is nothing to subscribe to, and a controller
 * would only add a subscription that can never fire.
 */
@customElement('keep-scopes-stacks-view')
export default class ScopesStacksView extends KeepElement {
  static styles = css`
    /* was SchemasMainContainer in ScopeStyles */
    :host {
      display: flex;
      flex-direction: column;
    }

    /* was StackHeader. Its .active-counts rule is dropped: nothing carried that class. */
    .stack-header {
      display: flex;
      align-items: center;
    }

    /* was the small-text, m-0, mt-5 and mb-5 utilities on the count */
    .count {
      font-size: 14px;
      margin: 5px 0;
    }

    /*
     * was ExtraFlex from components/flex. Its two .child rules are not reproduced - no element
     * in this view carries that class. The module itself survives until the three schemas views
     * stop importing it.
     */
    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
  `;

  @property({ attribute: false }) accessor databases: any[] = [];

  private openScope(event: Event): void {
    const { database } = (event as CustomEvent<KeepSlimDatabaseCardDetail>).detail;
    this.emit<KeepScopeOpenDetail>('scope-open', { scope: database });
  }

  /**
   * Right-clicking a card records its index in the store, which is what the rest of the
   * databases screens read to know which entry is current.
   */
  private recordIndex(database: any): void {
    store.dispatch(
      setDbIndex(getDatabaseIndex(this.databases, database.apiName, database.nsfPath)),
    );
  }

  private renderGroup(label: string, databases: any[]) {
    return html`
      <div class="stack-header"><span class="count">${databases.length} ${label}</span></div>
      <div class="cards">
        ${databases.length > 0
          ? // keepconfig is excluded from the rendering but counted in the heading, exactly as
            // before: a group holding nothing else shows the count and an empty row.
            databases
              .filter((database) => database.apiName !== 'keepconfig')
              .map(
                (database) => html`
                  <keep-slim-database-card
                    .database=${database}
                    @card-open=${this.openScope}
                    @contextmenu=${() => this.recordIndex(database)}
                  ></keep-slim-database-card>
                `,
              )
          : html`
              <keep-zero-results mainLabel="0 ${label}" secondaryLabel=""></keep-zero-results>
            `}
      </div>
    `;
  }

  render() {
    const databases = this.databases ?? [];
    return html`
      ${this.renderGroup(
        'Active Scope',
        databases.filter((database) => database.isActive),
      )}
      ${this.renderGroup(
        'Inactive Scope',
        databases.filter((database) => !database.isActive),
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-scopes-stacks-view': ScopesStacksView;
  }
}
