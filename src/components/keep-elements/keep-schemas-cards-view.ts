/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { toggleAlert } from '../../store/alerts/action';
import { appIconUri, appIconsLoaded, loadAppIcons } from '../../services/app-icons';
import type { KeepDeleteTarget } from './keep-delete-dialog';
import './keep-default-card';
import './keep-delete-dialog';

/** Which schema the user asked to open. */
export interface KeepSchemaOpenDetail {
  database: unknown;
}

/**
 * The "card" view of the schemas list.
 *
 * ## `schemasWithScopes` is derived, not stored
 *
 * The React version kept it in `useState` and refreshed it from an effect on `scopes`, guarded
 * by `if (schemasWithScopes !== schemasScopes)` — a comparison between two arrays built one
 * line apart, so never equal and never a guard. A getter computes it from the controller's
 * value instead, which is what the effect was emulating.
 *
 * ## Navigation goes up, not out
 *
 * The element emits `schema-open` rather than navigating: `useNavigate` is a React hook, and
 * the router is handed out through React context with no module-level instance, so an element
 * cannot reach it. `router/react.tsx` says what the eventual answer is — the views subscribe to
 * the same `Router` through a reactive controller, and that module is deleted — but that
 * controller does not exist yet, so for now the still-React parent navigates.
 *
 * ## Why the delete dialog lives here
 *
 * It always did, and it can stay: this element renders it, so setting the target and dispatching
 * the open flag happen in the same update. That is the race `keep-slim-database-card` avoids by
 * emitting instead of dispatching — it does not own its dialog and its caller does.
 */
@customElement('keep-schemas-cards-view')
export default class SchemasCardsView extends KeepElement {
  static styles = css`
    /* was SchemasMainContainer in SchemaStyles */
    :host {
      display: flex;
      flex-direction: column;
    }

    /*
     * was ExtraFlex from components/flex, whose last three importers are the three views
     * converted in this pass - the module goes with them. Its two .child rules are not
     * reproduced: no element here carries that class.
     */
    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
  `;

  @property({ attribute: false }) accessor databases: any[] = [];

  private readonly databaseState = new StoreController(this, (state) => state.databases);

  @state() private accessor target: KeepDeleteTarget = {};

  /** Set once the lazy icon payloads (#772) land, so render swaps in the real icons. */
  @state() private accessor iconsReady = appIconsLoaded();

  connectedCallback(): void {
    super.connectedCallback();
    if (this.iconsReady) return;
    loadAppIcons()
      .then(() => {
        this.iconsReady = true;
      })
      .catch(() => {
        /* the cards show their own skeleton; nothing here can retry usefully */
      });
  }

  /** `nsfPath:schemaName` for every schema a scope points at. */
  private get schemasWithScopes(): string[] {
    return (this.databaseState.value.scopes ?? []).map(
      (scope: any) => `${scope.nsfPath}:${scope.schemaName}`,
    );
  }

  private openSchema(database: unknown): void {
    this.emit<KeepSchemaOpenDetail>('schema-open', { database });
  }

  private requestDelete(database: any): void {
    if (!this.databaseState.value.permissions?.deleteDbMapping) {
      this.databaseState.dispatch(toggleAlert(`You don't have permission to delete schema.`));
      return;
    }
    this.target = {
      isDeleteSchema: true,
      nsfPath: database.nsfPath,
      schemaName: database.schemaName,
    };
    this.databaseState.dispatch(toggleDeleteDialog());
  }

  render() {
    const configured = this.schemasWithScopes;
    return html`
      <div class="cards">
        ${(this.databases ?? []).map(
          (database: any) => html`
            <keep-default-card
              title=${database.schemaName}
              subtitle=${database.nsfPath}
              description=${database.description}
              .delete=${true}
              .status=${configured.includes(`${database.nsfPath}:${database.schemaName}`)}
              .icon=${this.iconsReady ? appIconUri(database.iconName) : ''}
              @click=${() => this.openSchema(database)}
              .onDelete=${() => this.requestDelete(database)}
            ></keep-default-card>
          `,
        )}
      </div>
      <keep-delete-dialog .selected=${this.target}></keep-delete-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schemas-cards-view': SchemasCardsView;
  }
}
