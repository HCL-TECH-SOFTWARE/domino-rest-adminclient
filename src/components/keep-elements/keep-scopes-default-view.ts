/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { mapSchemas } from '../../utils/mapper';
import './keep-nsf-card';
import './keep-zero-results';

/** Which scope the user asked to open. */
export interface KeepScopeOpenDetail {
  scope: unknown;
}

/**
 * The "nsf" view of the scopes list: one `keep-nsf-card` per database.
 *
 * Now that this is an element, `keep-nsf-card` and `keep-zero-results` are composed directly in
 * the template instead of through their React wrappers - the point of converting leaves first.
 *
 * `openScope` became a `scope-open` event rather than a callback property. Report 02 §2.4 names
 * callback-as-property as the pattern to retire, and `keep-nsf-card.open` (which this element
 * still has to set, since changing that element's API is lane B's call) is the example it cites.
 */
@customElement('keep-scopes-default-view')
export default class ScopesDefaultView extends KeepElement {
  static styles = css`
    /* was SchemasMainContainer */
    :host {
      display: flex;
      flex-direction: column;
    }

    /*
     * was ExtraFlex with className='flex gap-10'. ExtraFlex declares gap: 20px and the
     * gap-10 utility overrides it to 10px; both are single-class selectors, so which one won
     * depended on stylesheet injection order. The explicit utility is taken as the intent.
     * ExtraFlex's .child rules are dropped - nothing here carries that class.
     */
    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
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

  private openScope(scope: unknown) {
    this.emit<KeepScopeOpenDetail>('scope-open', { scope });
  }

  render() {
    const databases = this.databases ?? [];
    return html`
      <span class="heading">HCL Domino REST API Databases Scope</span>
      <div class="cards">
        ${databases.length > 0
          ? mapSchemas(databases as never, 'schemas').map(
              (database: any) => html`
                <keep-nsf-card
                  .database=${database}
                  .iconName=${database.iconName}
                  .open=${(item: unknown) => this.openScope(item)}
                ></keep-nsf-card>
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
    'keep-scopes-default-view': ScopesDefaultView;
  }
}
