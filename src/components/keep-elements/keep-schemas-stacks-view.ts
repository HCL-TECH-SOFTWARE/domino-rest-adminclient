/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { setDbIndex } from '../../store/databases/action';
import { getDatabaseIndex } from '../../store/databases/scripts';
import type { KeepDeleteTarget } from './keep-delete-dialog';
import type { KeepSchemaOpenDetail } from './keep-schemas-cards-view';
import type { KeepSlimDatabaseCardDetail } from './keep-slim-database-card';
import './keep-slim-database-card';
import './keep-zero-results';
import './keep-delete-dialog';

/**
 * The "stack" view of the schemas list: schemas a scope points at, then the rest.
 *
 * The second group is hidden entirely when `databases.onlyShowSchemasWithScopes` is set — the
 * switch above the list. That flag and `scopes` are store state no caller passes down, which is
 * what makes a `StoreController` right here rather than two more properties.
 *
 * Unlike `keep-scopes-stacks-view`, this one keeps its delete dialog: on the schemas list the
 * cards *do* show a delete control, so the dialog is reachable and this element owns the flow —
 * it sets the target and dispatches the open flag in the same update, which is the race the card
 * avoids by emitting rather than dispatching.
 */
@customElement('keep-schemas-stacks-view')
export default class SchemasStacksView extends KeepElement {
  static styles = css`
    /* was SchemasMainContainer in SchemaStyles */
    :host {
      display: flex;
      flex-direction: column;
    }

    /* was StackHeader. Its .active-counts rule is dropped: nothing carried that class. */
    .stack-header {
      display: flex;
      align-items: center;
    }

    /* was the m-0, mt-5 and mb-5 utilities on the count */
    .count {
      margin: 5px 0;
    }

    /* was ExtraFlex; see keep-schemas-cards-view for why the module goes with this pass */
    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
  `;

  @property({ attribute: false }) accessor databases: any[] = [];

  private readonly databaseState = new StoreController(this, (state) => state.databases);

  @state() private accessor target: KeepDeleteTarget = {};

  private get schemasWithScopes(): string[] {
    return (this.databaseState.value.scopes ?? []).map(
      (scope: any) => `${scope.nsfPath}:${scope.schemaName}`,
    );
  }

  private openSchema(event: Event): void {
    const { database } = (event as CustomEvent<KeepSlimDatabaseCardDetail>).detail;
    this.emit<KeepSchemaOpenDetail>('schema-open', { database });
  }

  /**
   * The card has already checked `permissions.deleteDbMapping` and refused with an alert if it
   * was missing, so reaching here means the delete is allowed.
   */
  private requestDelete(event: Event): void {
    const { database } = (event as CustomEvent<KeepSlimDatabaseCardDetail>).detail;
    const { nsfPath, schemaName } = database as { nsfPath: string; schemaName: string };
    this.target = { isDeleteSchema: true, nsfPath, schemaName };
    this.databaseState.dispatch(toggleDeleteDialog());
  }

  /** Right-clicking a card records its index, which the other databases screens read. */
  private recordIndex(database: any): void {
    this.databaseState.dispatch(
      setDbIndex(getDatabaseIndex(this.databases, database.apiName, database.nsfPath)),
    );
  }

  private renderGroup(heading: string, emptyLabel: string, databases: any[]) {
    return html`
      <div class="stack-header"><span class="count">${databases.length} ${heading}</span></div>
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
                    is-schema
                    @card-open=${this.openSchema}
                    @card-delete=${this.requestDelete}
                    @contextmenu=${() => this.recordIndex(database)}
                  ></keep-slim-database-card>
                `,
              )
          : html`
              <keep-zero-results mainLabel=${emptyLabel} secondaryLabel=""></keep-zero-results>
            `}
      </div>
    `;
  }

  render() {
    const configured = this.schemasWithScopes;
    const key = (schema: any) => `${schema.nsfPath}:${schema.schemaName}`;
    const databases = this.databases ?? [];
    const inUse = databases.filter((schema) => configured.includes(key(schema)));
    const notInUse = databases.filter((schema) => !configured.includes(key(schema)));

    return html`
      ${this.renderGroup('in use Schema(s) (configured with Scope)', '0 in use Schema ', inUse)}
      ${this.databaseState.value.onlyShowSchemasWithScopes
        ? nothing
        : this.renderGroup(
            'not in use Schema(s) (not configured with Scope)',
            '0 not in use Schema',
            notInUse,
          )}
      <keep-delete-dialog .selected=${this.target}></keep-delete-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schemas-stacks-view': SchemasStacksView;
  }
}
