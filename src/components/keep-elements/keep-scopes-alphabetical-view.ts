/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';
import { appIconUri, appIconsLoaded, isAppIconName, loadAppIcons } from '../../services/app-icons';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';
import type { KeepScopeOpenDetail } from './keep-scopes-default-view';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import './keep-tooltip';
import './keep-zero-results';

/** Group by first letter of the api name, then order the letters. */
const byInitial = (databases: any[]): Record<string, any[]> => {
  const groups: Record<string, any[]> = {};
  for (const database of databases) {
    const initial = String(database.apiName ?? '')
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
 * The "alphabetical" view of the scopes list: one column per initial letter.
 *
 * ## Two things that were dead
 *
 * The React version took `isSchema` from `useLocation().pathname === '/schema'` and used it to
 * pick between `schemaName` and `apiName` when grouping — but this component only ever renders
 * inside the scopes list, so the schema branch was unreachable, while the row beneath it
 * displayed `apiName` unconditionally. On a schemas-shaped record the two disagreed. The
 * grouping key is `apiName`, stated once. `SchemasAlphabeticalView` is the file that wants the
 * other half, and it has its own copy.
 *
 * It also had a `useEffect` whose body was the comment "Append to stack".
 */
@customElement('keep-scopes-alphabetical-view')
export default class ScopesAlphabeticalView extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }

      /* was the big-text and color-text-primary utilities; the token inherits across the
         boundary, the class does not */
      .heading {
        font-size: 18px;
        color: var(--text-color-primary);
      }

      /* was AlphabeticalViewContainer */
      .letters {
        display: flex;
        flex-wrap: wrap;
        padding: 20px 0;
      }

      /* was BlockContainer */
      .block {
        width: 25%;
        margin: 20px 0;
      }

      /* was the large-text and color-text-primary pair on the letter row. BlockContainer also
         declared a .letter rule at 24px that nothing carried, so 20px is what applied. */
      .letter {
        display: flex;
        flex-direction: row;
        font-size: 20px;
        color: var(--text-color-primary);
      }

      /* was Db plus the flex and gap-5 utilities */
      .db {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        margin-bottom: 10px;
      }

      .db:hover .api-name {
        text-decoration: underline;
      }

      /*
       * was .schemas-alphabetical-schema-name in styles.css. That rule stays there for now:
       * SchemasAlphabeticalView is still React and still carries the class. It goes when that
       * file converts.
       */
      .api-name {
        font-size: 16px;
        overflow-x: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 25vw;
        line-height: 1.2em;
        color: var(--text-color-primary);
      }

      /* was the h-30px utility on the icon */
      .db img,
      .db wa-icon,
      .db .app-icon-skeleton {
        height: 30px;
        display: block;
      }

      .db wa-icon {
        font-size: 30px;
      }
    `,
  ];

  @property({ attribute: false }) accessor databases: any[] = [];

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

  private openScope(scope: unknown): void {
    this.emit<KeepScopeOpenDetail>('scope-open', { scope });
  }

  private handleKeydown(event: KeyboardEvent, scope: unknown): void {
    // Space as well as Enter: the row announces itself as a button, so it has to behave like
    // one (WCAG 2.1.1). The React version took Enter only.
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openScope(scope);
  }

  /** Unknown name is permanent and shows the fallback; known-but-unloaded shows a skeleton. */
  private renderIcon(name: unknown) {
    if (!isAppIconName(name as string)) {
      return html`<wa-icon library=${FA_LIBRARY} name="database"></wa-icon>`;
    }
    if (!this.iconsReady) return appIconSkeleton();
    // Decorative: the api name is right beside it. The React alt was "database-icon".
    return html`<img src=${appIconUri(name as string)} alt="" aria-hidden="true" />`;
  }

  render() {
    const databases = this.databases ?? [];
    if (databases.length === 0) {
      return html`
        <span class="heading">HCL Domino REST API Databases Scope A - Z</span>
        <div class="letters">
          <keep-zero-results
            mainLabel=" Sorry, No result found"
            secondaryLabel="What you search was unfortunately not found or doesn't exist."
          ></keep-zero-results>
        </div>
      `;
    }

    const groups = byInitial(databases);
    return html`
      <span class="heading">HCL Domino REST API Databases Scope A - Z</span>
      <div class="letters">
        ${Object.keys(groups).map(
          (letter) => html`
            <div class="block">
              <span class="letter">${letter}</span>
              ${groups[letter].map(
                (database) => html`
                  <div
                    class="db"
                    role="button"
                    tabindex="0"
                    @click=${() => this.openScope(database)}
                    @keydown=${(e: KeyboardEvent) => this.handleKeydown(e, database)}
                  >
                    ${this.renderIcon(database.iconName)}
                    <keep-tooltip content=${database.apiName} without-arrow>
                      <span class="api-name">${database.apiName}</span>
                    </keep-tooltip>
                  </div>
                `,
              )}
            </div>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-scopes-alphabetical-view': ScopesAlphabeticalView;
  }
}
