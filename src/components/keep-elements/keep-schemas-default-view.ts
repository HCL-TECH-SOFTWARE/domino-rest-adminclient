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
import { mapSchemas } from '../../utils/mapper';
import type { KeepDeleteTarget } from './keep-delete-dialog';
import type { KeepSchemaOpenDetail } from './keep-schemas-cards-view';
import './keep-nsf-card';
import './keep-delete-dialog';

/**
 * The "nsf" view of the schemas list: one `keep-nsf-card` per file.
 *
 * ## Three React workarounds that do not survive the conversion
 *
 * `mapSchemas` was wrapped in `useMemo` "to prevent infinite re-renders"; `schemasWithScopes`
 * was `useState` fed by an effect; and that effect compared `JSON.stringify(prevScopesRef)`
 * with `JSON.stringify(scopes)` to decide whether to run. All three exist because a render is
 * cheap to trigger and expensive to control in React. A Lit element re-renders when a declared
 * property or the controller's value changes, so both are plain getters computed during render
 * and the ref, the stringify comparison and the effect all go.
 *
 * Navigation is emitted as `schema-open` for the reason given in `keep-schemas-cards-view`: the
 * router is React-context-scoped and its reactive controller does not exist yet.
 */
@customElement('keep-schemas-default-view')
export default class SchemasDefaultView extends KeepElement {
  static styles = css`
    /* was SchemasMainContainer */
    :host {
      display: flex;
      flex-direction: column;
    }

    /* was the big-text, mb-10 and color-text-primary utilities. The token inherits across the
       boundary; the class does not, and its dark override lives in styles.css rather than
       dark-mode.css, so copying the literal would give black text on a near-black surface. */
    .heading {
      font-size: 18px;
      margin-bottom: 10px;
      color: var(--text-color-primary);
    }

    /*
     * was ExtraFlex carrying flex, flex-row, gap-5 and flex-wrap. ExtraFlex declares gap: 20px
     * and the gap-5 utility overrode it to 5px; both are single-class selectors, so which won
     * depended on stylesheet order. The explicit utility is taken as the intent, as it was for
     * keep-scopes-default-view.
     */
    .cards {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 5px;
    }
  `;

  @property({ attribute: false }) accessor databases: any[] = [];

  private readonly databaseState = new StoreController(this, (state) => state.databases);

  @state() private accessor target: KeepDeleteTarget = {};

  /** `nsfPath:schemaName` for every schema a scope points at. */
  private get schemasWithScopes(): string[] {
    return (this.databaseState.value.scopes ?? []).map(
      (scope: any) => `${scope.nsfPath}:${scope.schemaName}`,
    );
  }

  private openSchema = (database: unknown): void => {
    this.emit<KeepSchemaOpenDetail>('schema-open', { database });
  };

  private requestDelete = (database: any): void => {
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
  };

  render() {
    // Arrow-bound rather than passed inline: keep-nsf-card takes `open` and `deleteFn` as
    // callback properties, and a fresh closure per render would look like a changed property
    // to Lit every time.
    const configured = this.schemasWithScopes;
    return html`
      <span class="heading">HCL Domino REST API Databases Schema</span>
      <div class="cards">
        ${mapSchemas((this.databases ?? []) as never, 'schemas').map(
          (database: any) => html`
            <keep-nsf-card
              .database=${database}
              .schemasWithScopes=${configured}
              .iconName=${database.iconName}
              .deleteFn=${this.requestDelete}
              .open=${this.openSchema}
            ></keep-nsf-card>
          `,
        )}
      </div>
      <keep-delete-dialog .selected=${this.target}></keep-delete-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schemas-default-view': SchemasDefaultView;
  }
}
