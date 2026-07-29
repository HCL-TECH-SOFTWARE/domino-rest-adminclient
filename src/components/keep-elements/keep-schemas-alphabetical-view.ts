/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { toggleAlert } from '../../store/alerts/action';
import { FA_LIBRARY } from '../../services/icon-library';
import { appIconUri, appIconsLoaded, isAppIconName, loadAppIcons } from '../../services/app-icons';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';
import type { KeepDeleteTarget } from './keep-delete-dialog';
import type { KeepSchemaOpenDetail } from './keep-schemas-cards-view';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import './keep-tooltip';
import './keep-delete-dialog';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/** Group by the initial of the schema name, then order the letters. */
const byInitial = (databases: any[]): Record<string, any[]> => {
  const groups: Record<string, any[]> = {};
  for (const database of databases) {
    const initial = String(database.schemaName ?? '')
      .charAt(0)
      .toUpperCase();
    (groups[initial] ??= []).push(database);
  }
  return Object.keys(groups)
    .sort()
    .reduce<Record<string, any[]>>((sorted, letter) => {
      sorted[letter] = groups[letter];
      return sorted;
    }, {});
};

/**
 * The "alphabetical" view of the schemas list: an A–Z strip that scrolls to a letter, and one
 * row per schema under it.
 *
 * ## The `isSchema` conditionals were all true
 *
 * Like its scopes twin, this took `isSchema` from `useLocation().pathname === '/schema'` — and
 * it only ever renders inside the schemas list, so every `isSchema &&` guard was true and the
 * grouping key was always `schemaName`. The nsf subline and the delete control are therefore
 * unconditional here, which is what shipped, and the router dependency is gone. It also had the
 * same `useEffect` whose body was the comment "Append to stack".
 *
 * ## The scroll no longer fires on every render
 *
 * `scrollIntoView` sat in a `useEffect` with **no dependency array**, so it ran after every
 * render and dragged the viewport back to the chosen letter whenever anything else changed —
 * including a store update from an unrelated screen. It runs here only when `chosenLetter`
 * actually changes.
 */
@customElement('keep-schemas-alphabetical-view')
export default class SchemasAlphabeticalView extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }

      /* was the big-text and color-text-primary utilities */
      .heading {
        font-size: 18px;
        color: var(--text-color-primary);
      }

      /* was AlphabeticalViewContainer */
      .container {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        padding: 20px 0;
      }

      .letters {
        display: flex;
        flex-direction: row;
        justify-content: center;
      }

      .all-rows {
        height: 50vh;
        overflow-y: auto;
        scroll-behavior: smooth;
      }

      @media only screen and (max-height: 943px) {
        .all-rows {
          height: 40vh;
          overflow-y: scroll;
        }
      }

      .each-letter {
        padding: 0 10px;
        font-size: 20px;
        color: var(--wa-color-text-normal);
        cursor: pointer;
        background: none;
        border: none;
        font-family: inherit;
      }

      .each-letter[aria-current='true'] {
        font-weight: bold;
      }

      /* was .no-schema, applied to letters with nothing under them */
      .each-letter:disabled {
        color: #a2a6a8;
        cursor: default;
      }

      /* was the divider utility on the two hr elements */
      hr {
        height: 1px;
        background: #cbcbcb;
        width: 100%;
        padding: 0;
        margin: 0;
        border: none;
      }

      /* was BlockContainer */
      .block {
        width: 100%;
        padding: 20px 0;
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      .block .letter {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 24px;
        text-transform: uppercase;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: var(--keep-surface-highlight);
        color: var(--wa-color-text-normal);
        flex-shrink: 0;
      }

      .schemas {
        width: calc(100% - 60px);
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 10px 0;
      }

      /* was Db */
      .db {
        cursor: pointer;
        display: flex;
        align-items: center;
        margin: 0 50px;
        width: 318px;
        height: 45px;
      }

      /* was .api-status and .unused - a bar coloured by whether a scope uses the schema */
      .status {
        width: 9px;
        height: 44px;
        flex-shrink: 0;
        background: #82dc73;
      }

      .status.unused {
        background: #f75764;
      }

      .icon,
      .app-icon-skeleton {
        height: 44px;
      }

      .icon {
        display: block;
      }

      wa-icon.icon {
        font-size: 44px;
      }

      /* was .text-container */
      .text-container {
        display: flex;
        flex-direction: column;
        width: calc(100% - 9px - 44px - 10px - 15px - 10%);
        background: none;
        border: none;
        padding: 0;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
      }

      .text-container:hover {
        text-decoration: underline;
      }

      /*
       * was .schemas-alphabetical-schema-name in styles.css, plus text-bold and
       * color-text-primary. That rule is deleted from styles.css in this commit: this view and
       * the scopes one were its only consumers and both are elements now.
       */
      .api-name {
        font-size: 16px;
        overflow-x: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 25vw;
        line-height: 1.2em;
        font-weight: bold;
        color: var(--text-color-primary);
      }

      /*
       * was the same rule plus weight-400, text-italic and color-text-hint. The literal
       * #5B666D that BlockContainer set for this line had no dark-mode override; the hint
       * token is mode-aware.
       */
      .api-nsf {
        font-size: 16px;
        overflow-x: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 25vw;
        line-height: 1.2em;
        font-weight: 400;
        font-style: italic;
        color: var(--hint-text-color);
      }

      .delete {
        display: flex;
        width: 10%;
        justify-content: flex-end;
      }

      /*
       * was DeleteIcon, a 20px box painting a base64 trash SVG. A registered Font Awesome
       * glyph draws the same thing, and it is a real button now.
       */
      .delete-button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        width: 20px;
        height: 20px;
        border: none;
        background: none;
        cursor: pointer;
        color: var(--wa-color-danger-60);
        font-size: 20px;
      }
    `,
  ];

  @property({ attribute: false }) accessor databases: any[] = [];

  private readonly databaseState = new StoreController(this, (state) => state.databases);

  @state() private accessor chosenLetter = '';

  @state() private accessor target: KeepDeleteTarget = {};

  @state() private accessor iconsReady = appIconsLoaded();

  connectedCallback(): void {
    super.connectedCallback();
    if (this.iconsReady) return;
    loadAppIcons()
      .then(() => {
        this.iconsReady = true;
      })
      .catch(() => {
        /* leave the skeleton up; nothing here can retry usefully */
      });
  }

  // PropertyValues without a type argument: `chosenLetter` is private, so it is not in
  // `keyof this` and the typed map would reject the lookup.
  protected updated(changed: PropertyValues): void {
    if (!changed.has('chosenLetter') || !this.chosenLetter) return;
    // scrollIntoView? because jsdom does not implement it; optional chaining on the element
    // alone would not save the call.
    this.shadowRoot
      ?.querySelector(`.block[data-letter='${this.chosenLetter}']`)
      ?.scrollIntoView?.();
  }

  private get groups(): Record<string, any[]> {
    return byInitial(this.databases ?? []);
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

  private handleKeydown(event: KeyboardEvent, database: unknown): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openSchema(database);
  }

  private requestDelete(database: any): void {
    this.chosenLetter = '';
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

  private renderIcon(name: unknown) {
    if (!isAppIconName(name as string)) {
      return html`<wa-icon class="icon" library=${FA_LIBRARY} name="database"></wa-icon>`;
    }
    if (!this.iconsReady) return appIconSkeleton();
    // Decorative: the schema name is beside it. The React alt was "database-icon".
    return html`<img class="icon" src=${appIconUri(name as string)} alt="" aria-hidden="true" />`;
  }

  private renderRow(database: any) {
    const used = this.schemasWithScopes.includes(`${database.nsfPath}:${database.schemaName}`);
    const usage = used ? 'Used by Scopes' : 'Not used by Scopes';
    return html`
      <div class="db">
        <keep-tooltip content=${usage}>
          <!-- role="img" with a name: the bar carries the only indication of this state, and a
               tooltip is not an accessible name (WCAG 1.1.1). -->
          <div class="status ${used ? '' : 'unused'}" role="img" aria-label=${usage}></div>
        </keep-tooltip>
        ${this.renderIcon(database.iconName)}
        <button
          class="text-container"
          type="button"
          @click=${() => this.openSchema(database)}
          @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, database)}
        >
          <keep-tooltip content="${database.schemaName}(${database.nsfPath})">
            <span class="api-name">${database.schemaName}</span>
          </keep-tooltip>
          <span class="api-nsf">${database.nsfPath}</span>
        </button>
        <div class="delete">
          <keep-tooltip content="Delete schema">
            <button
              class="delete-button"
              type="button"
              aria-label="Delete schema ${database.schemaName}"
              @click=${() => this.requestDelete(database)}
            >
              <wa-icon library=${FA_LIBRARY} name="trash"></wa-icon>
            </button>
          </keep-tooltip>
        </div>
      </div>
    `;
  }

  render() {
    const groups = this.groups;
    const present = Object.keys(groups);
    return html`
      <span class="heading">HCL Domino REST API Databases Schema A - Z</span>
      <div class="container">
        <div class="letters">
          ${LETTERS.map(
            (letter) => html`
              <!-- a real button, so the disabled letters are announced as such rather than
                   carrying tabIndex={-1} on a div (WCAG 4.1.2) -->
              <button
                class="each-letter"
                type="button"
                ?disabled=${!present.includes(letter)}
                aria-current=${letter === this.chosenLetter ? 'true' : 'false'}
                @click=${() => {
                  this.chosenLetter = letter;
                }}
              >
                ${letter}
              </button>
            `,
          )}
        </div>
        <hr />
        <div class="all-rows">
          ${present.map(
            (letter) => html`
              <div>
                <div class="block" data-letter=${letter}>
                  <span class="letter">${letter}</span>
                  <div class="schemas">${groups[letter].map((db) => this.renderRow(db))}</div>
                </div>
                <hr />
              </div>
            `,
          )}
        </div>
      </div>
      <keep-delete-dialog .selected=${this.target}></keep-delete-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schemas-alphabetical-view': SchemasAlphabeticalView;
  }
}
