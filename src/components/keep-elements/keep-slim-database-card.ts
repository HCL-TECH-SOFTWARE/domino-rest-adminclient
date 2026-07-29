/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { toggleAlert } from '../../store/alerts/action';
import { FA_LIBRARY } from '../../services/icon-library';
import { appIconUri, appIconsLoaded, isAppIconName, loadAppIcons } from '../../services/app-icons';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import './keep-tooltip';

/** Which card the user acted on. Both events carry the same entry. */
export interface KeepSlimDatabaseCardDetail {
  database: unknown;
}

/**
 * One row in the stacks view: icon, name, and — on the schemas list — the nsf path and a
 * delete control.
 *
 * ## Three properties the React version took and did not use
 *
 * `open`, `selected` and `aria-describedby` were all passed by both call sites and all three
 * were dead. The first two fed a `state` prop on a `styled(Card)` whose template interpolates
 * nothing, so they styled nothing; `aria-describedby` was set to `'simple-popper'`, and no
 * element with that id exists anywhere in the tree — a dangling IDREF, which is worse than no
 * description because assistive tech resolves it to nothing and says nothing. All three are
 * gone rather than ported.
 *
 * ## `isSchema` replaces a location sniff
 *
 * The React component derived it as `useLocation().pathname === '/schema'`. Its two callers
 * are the schemas stacks view and the scopes stacks view, each of which knows statically
 * which one it is, so it is now a property they set. That removes the router dependency —
 * `useLocation` is a React hook and has no place in an element — and it is more honest: the
 * component wanted to know which list it was in, not what the URL said.
 *
 * ## Why `permissions` is read here but the delete is not dispatched here
 *
 * `permissions` is store state no caller passes down, which makes a `StoreController` correct.
 * The **dispatch** stays with the caller: the parent has to record which entry is being
 * deleted before the dialog can render it, and `keep-delete-dialog` now opens straight off
 * `state.dialog.deleteDialog`. Dispatching from here would race the parent's own state update.
 * So this element checks the permission, refuses with an alert if it is missing, and otherwise
 * emits `card-delete` and lets the caller open the dialog.
 */
@customElement('keep-slim-database-card')
export default class SlimDatabaseCard extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
      :host {
        display: contents;
      }

      /* was CardContainer, a styled(Card) whose MUI paper was fully overridden anyway */
      .card {
        box-sizing: border-box;
        width: 336px;
        min-width: 250px;
        height: 70px;
        margin: 0 15px 15px 0px;
        padding: 17px 16px;
        border: 1px solid #c8d2dd;
        border-radius: var(--wa-border-radius-l);
        background: var(--wa-color-surface-raised);
        display: flex;
        align-items: center;
        user-select: none;
        cursor: pointer;
      }

      .card:hover {
        border: 1px solid var(--hover-color);
      }

      @media only screen and (max-width: 1366px) {
        .card {
          width: 250px;
        }
      }

      /* was CardHeader */
      .header {
        display: flex;
        align-items: center;
        width: 90%;
        /* The row is the primary control, so it takes a visible focus ring of its own. The
           user-agent outline is the ring; it is stated here because the reset in the document
           sheet does not cross into this root. */
        outline-offset: 2px;
      }

      /* was ModeLogo */
      .logo {
        width: 44px;
      }

      /* was DBImage, which reached this element through AppIcon's element-override prop */
      .logo img {
        border-radius: 8px;
        height: 44px;
        display: block;
      }

      /*
       * was the fallback DBIcon, a Material icon carrying the color-hover utility. Material
       * icons paint with currentColor, so the utility was what tinted it; the token it reads
       * inherits across the shadow boundary and the class does not, hence the property here.
       */
      .logo wa-icon {
        border-radius: 50%;
        font-size: 35px;
        color: var(--hover-color);
      }

      .logo .app-icon-skeleton {
        width: 44px;
      }

      /*
       * was .text-content. display is deliberately left unset, as it was: the two
       * declarations below it are inert without one, and turning it on would newly enable the
       * ellipsis on .api-name, which is a visible change to how long names render. Left for a
       * pass that can look at it in a browser.
       */
      .text-content {
        width: calc(100% - 44px);
        flex-direction: column;
        padding-left: 16px;
        gap: 0;
      }

      .api-name {
        font-weight: bold;
        text-overflow: ellipsis;
        overflow-x: hidden;
        white-space: nowrap;
        margin: 0;
        line-height: 1.2em;
        color: var(--text-color-primary);
      }

      /*
       * was .api-nsf with a literal #5B666D. That is a light-mode grey with no dark-mode
       * override anywhere, so on the dark raised surface it sat at about 2.2:1 and failed
       * 1.4.3. The token is mode-aware and is what the rest of the tree uses for secondary
       * text. (--text-color-secondary is NOT usable: it is a mode-invariant near-white.)
       */
      .api-nsf {
        display: block;
        font-style: italic;
        text-overflow: ellipsis;
        overflow-x: hidden;
        white-space: nowrap;
        color: var(--wa-color-text-quiet);
        margin: 0;
        line-height: 1.2em;
      }

      @media only screen and (max-width: 1366px) {
        .api-name,
        .api-nsf {
          font-size: var(--wa-font-size-m);
        }
      }

      /* was .delete */
      .delete {
        display: flex;
        width: 10%;
        justify-content: flex-end;
      }

      /*
       * was a div wrapping DeleteIcon, a 20px box painting one base64 SVG and swapping to a
       * second on hover. Both are a trash can; the swap is outline to filled. A registered
       * Font Awesome glyph draws the same thing without 3 kB of data URI, and it is a real
       * button now rather than a div with a click handler.
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

  @property({ attribute: false }) accessor database: any = {};

  /** Set by the caller: the schemas list shows the nsf path and the delete control. */
  @property({ type: Boolean, attribute: 'is-schema' }) accessor isSchema = false;

  private readonly databases = new StoreController(this, (state) => state.databases.permissions);

  /** Set once the lazy icon payloads (#772) land, so render swaps skeleton for icon. */
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

  private get subject(): string {
    return this.isSchema ? this.database?.schemaName : this.database?.apiName;
  }

  private open(): void {
    this.emit<KeepSlimDatabaseCardDetail>('card-open', { database: this.database });
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Space as well as Enter. The React version took Enter only, which leaves a control that
    // announces itself as a button and does not behave like one (WCAG 2.1.1).
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.open();
  }

  private requestDelete(): void {
    if (!this.databases.value?.deleteDbMapping) {
      this.databases.dispatch(toggleAlert(`You don't have permission to delete schema.`));
      return;
    }
    this.emit<KeepSlimDatabaseCardDetail>('card-delete', { database: this.database });
  }

  /**
   * An unknown icon name is permanent and shows the fallback at once; a known one whose
   * payload chunk has not arrived is transient and shows the skeleton. Same three states as
   * the React AppIcon, which is why this element does not need it.
   */
  private renderIcon() {
    const name = this.database?.iconName;
    if (!isAppIconName(name)) {
      return html`<wa-icon library=${FA_LIBRARY} name="database"></wa-icon>`;
    }
    if (!this.iconsReady) return appIconSkeleton();
    // Decorative: the name beside it identifies the entry, and the React alt was the
    // placeholder string "db-icon" (WCAG 1.1.1).
    return html`<img src=${appIconUri(name)} alt="" aria-hidden="true" />`;
  }

  render() {
    const nsfPath = this.database?.nsfPath;
    return html`
      <div class="card">
        <div
          class="header"
          role="button"
          tabindex="0"
          @click=${this.open}
          @keydown=${this.handleKeydown}
        >
          <div class="logo">${this.renderIcon()}</div>
          <div class="text-content">
            <keep-tooltip
              content=${this.isSchema ? `${this.database?.schemaName}(${nsfPath})` : this.subject}
              without-arrow
              placement="bottom"
            >
              <span class="api-name">${this.subject}</span>
            </keep-tooltip>
            ${this.isSchema ? html`<span class="api-nsf">${nsfPath}</span>` : nothing}
          </div>
        </div>
        ${this.isSchema
          ? html`
              <div class="delete">
                <keep-tooltip content="Delete schema">
                  <button
                    class="delete-button"
                    type="button"
                    aria-label="Delete schema ${this.subject}"
                    @click=${this.requestDelete}
                  >
                    <wa-icon library=${FA_LIBRARY} name="trash"></wa-icon>
                  </button>
                </keep-tooltip>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-slim-database-card': SlimDatabaseCard;
  }
}
