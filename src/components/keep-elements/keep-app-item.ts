/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { store } from '../../store/store';
import { generateSecret } from '../../store/applications/action';
import { toggleAlert } from '../../store/alerts/action';
import { FA_LIBRARY } from '../../services/icon-library';
import type { AppFormProp, AppProp } from '../../store/applications/types';
import './keep-app-icon';
import './keep-app-status';
import './keep-button';
import './keep-tooltip';

/** `event.detail` of `app-edit`: the seed values for the Application form. */
export interface KeepAppItemEditDetail {
  /** Exactly the object the row used to push into the form with `setValues`. */
  values: AppFormProp;
}

/** `event.detail` of `app-delete`. */
export interface KeepAppItemDeleteDetail {
  appId: string;
}

/** The prompt shown where an app has no secret yet. */
const CLICK_TO_GENERATE = 'Click to Generate Secret';

/** What a secret the user has not asked to reveal renders as. */
const MASKED = '********************';

/**
 * Row styling for {@link AppItem}, adopted by the table that renders it.
 *
 * The rows are in the *table's* shadow root, not in one of their own — see the element's
 * docblock — so the rules that dress them have to be in the same root as the table's, and
 * that root is where these go. Scoped by tag name so nothing here can reach the table's own
 * head, which uses several of the same class names.
 */
export const appItemStyles = css`
  /*
   * The rows have to lay out as rows of the table above them, so the element between the
   * body and them must not generate a box of its own.
   */
  keep-app-item {
    display: contents;
  }

  /*
   * Row, from the replaced file. Four of its rules are dropped because no node in this
   * markup ever carried the class: exp-row, text, revoke and off-border. They were copied
   * in from the consents row, which does use all four.
   */
  keep-app-item .expand keep-tooltip {
    display: block;
  }

  keep-app-item .app-name {
    gap: 10px;
  }

  /* Was MdRefresh color='#2873F0', an SVG color attribute. wa-icon paints from
     currentColor, so the colour is a declaration now. The literal is carried over
     unchanged; it is not on the WA token ramp. */
  keep-app-item .regenerate-icon {
    color: #2873f0;
  }

  /* Was MdEdit size={20}, i.e. a 20px SVG box. wa-icon sizes from font-size. */
  keep-app-item .edit-icon {
    font-size: 20px;
  }

  /* Was AppImage, a styled image handed to the icon component's element-override prop.
     That prop is gone: the icon is a custom element and its image lives in a shadow root,
     where no class from any sheet reaches it. The element exposes the image as a part,
     which is the one hook that does cross. width is stated because the element's own rule
     stretches the image to the host, and here the host is unsized — the height and the
     picture's own ratio decide the box, as they did when these declarations sat on the
     image itself. The grey plate is carried over unchanged; it is a literal, not a token,
     so it does not follow the theme. */
  keep-app-item keep-app-icon::part(icon) {
    margin-top: 8px;
    background: #d9d9d9;
    border-radius: 8px;
    padding: 6px;
    width: auto;
    height: 40px;
  }

  /*
   * The delete glyph. It was two rules over one node: a shared styled div in styles/forms
   * supplied the placement, the sizing and the hover image, and the row's own class
   * overrode the resting image with a differently-tinted copy of it. The row's selector was
   * the more specific of the two, so the tint below is the one on the screen today; the
   * hover carried an importance flag and won regardless, so it is the shared one.
   */
  keep-app-item .delete-icon {
    width: 20px;
    height: 20px;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
    background-position: top right;
    background-repeat: no-repeat;
    background-size: contain;
  }

  keep-app-item .delete-icon:hover {
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIHN0cm9rZT0iI0Q2NDY2RiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPG1hc2sgaWQ9InBhdGgtMy1vdXRzaWRlLTFfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjIiIHk9IjUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIyIiB5PSI1IiB3aWR0aD0iMjAiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNMyA2SDVIMjEiLz4KPC9tYXNrPgo8cGF0aCBkPSJNMyA2SDVIMjEiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTMgNUMyLjQ0NzcyIDUgMiA1LjQ0NzcyIDIgNkMyIDYuNTUyMjggMi40NDc3MiA3IDMgN1Y1Wk0yMSA3QzIxLjU1MjMgNyAyMiA2LjU1MjI4IDIyIDZDMjIgNS40NDc3MiAyMS41NTIzIDUgMjEgNVY3Wk0zIDdINVY1SDNWN1pNNSA3SDIxVjVINVY3WiIgZmlsbD0id2hpdGUiIG1hc2s9InVybCgjcGF0aC0zLW91dHNpZGUtMV8yNzhfMTM3MykiLz4KPG1hc2sgaWQ9InBhdGgtNS1vdXRzaWRlLTJfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNNCA1TDUuNzc3NzggNUwyMCA1Ii8+CjwvbWFzaz4KPHBhdGggZD0iTTQgNUw1Ljc3Nzc4IDVMMjAgNSIgZmlsbD0iI0Q2NDY2RiIvPgo8cGF0aCBkPSJNNCA0QzMuNDQ3NzIgNCAzIDQuNDQ3NzIgMyA1QzMgNS41NTIyOCAzLjQ0NzcyIDYgNCA2TDQgNFpNMjAgNkMyMC41NTIzIDYgMjEgNS41NTIyOSAyMSA1QzIxIDQuNDQ3NzIgMjAuNTUyMyA0IDIwIDRMMjAgNlpNNCA2TDUuNzc3NzggNkw1Ljc3Nzc4IDRMNCA0TDQgNlpNNS43Nzc3OCA2TDIwIDZMMjAgNEw1Ljc3Nzc4IDRMNS43Nzc3OCA2WiIgZmlsbD0iI0Q2NDY2RiIgbWFzaz0idXJsKCNwYXRoLTUtb3V0c2lkZS0yXzI3OF8xMzczKSIvPgo8L3N2Zz4K');
  }

  /* AppNameContainer. Its status-container and inactive rules are dropped: the pill is
     keep-app-status, which draws itself inside its own shadow root, and no node here has
     ever carried either class. */
  keep-app-item .app-name-container {
    display: flex;
    flex-direction: row;
    gap: 10px;
    width: 100%;
    align-items: center;
  }

  /* AppIdSecretContainer. Its id-secret rule is dropped for the same reason. */
  keep-app-item .app-id-secret-row {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-content: center;
    align-items: center;
  }

  /* OptionsContainer. */
  keep-app-item .options {
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  /*
   * The two copy-to-clipboard triggers were spans with a click handler, so neither was
   * reachable from a keyboard — and the key handler that was meant to cover that sat on the
   * tooltip wrapper, which is not focusable either, so it could never fire. They are
   * buttons now (#713); these declarations are what makes a button look like the text it
   * replaced.
   */
  keep-app-item .copy-text {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    text-align: left;
  }

  keep-app-item button:focus-visible {
    border-radius: var(--wa-border-radius-s);
    outline: var(--wa-focus-ring);
    outline-offset: var(--wa-focus-ring-offset);
  }

  /*
   * Web Awesome's native layer styles a bare dialog element — width, padding, surface,
   * radius, shadow and the centring — and a bare element selector does not cross a shadow
   * boundary, so none of it reaches a dialog rendered in here. Restated, together with the
   * backdrop, which is the half that is invisible when it goes missing: the modal stays on
   * the top layer and the page behind it simply stops being dimmed.
   */
  keep-app-item dialog {
    flex-direction: column;
    align-items: start;
    width: 32rem;
    max-width: calc(100% - var(--wa-space-l));
    background-color: var(--wa-color-surface-raised);
    border-radius: var(--wa-panel-border-radius);
    border: none;
    box-shadow: var(--wa-shadow-l);
    margin: auto;
    inset: 0;
  }

  keep-app-item dialog:focus {
    outline: none;
  }

  keep-app-item dialog::backdrop {
    background-color: var(--wa-color-overlay-modal, rgb(0 0 0 / 0.25));
  }

  :host-context(body[data-theme='dark']) keep-app-item dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.6);
  }

  /* was .regen-app-secret-dialog, which is unlayered and so outranks the block above. */
  keep-app-item .regen-app-secret-dialog {
    flex-direction: column;
    padding: 30px;
    gap: 25px;
  }

  keep-app-item .regen-app-secret-dialog[open] {
    display: flex;
  }

  /* was .dialog-title */
  keep-app-item .dialog-title {
    display: flex;
    width: 100%;
    padding: 0;
    justify-content: space-between;
    position: relative;
  }

  /* was .dialog-title-text */
  keep-app-item .dialog-title-text {
    flex: 1;
    text-overflow: ellipsis;
    width: 100%;
    overflow: hidden;
    font-size: 24px;
    font-weight: bold;
    color: var(--text-color-primary);
  }

  /* was .dialog-content */
  keep-app-item .dialog-content {
    width: 100%;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* was .dialog-content-text */
  keep-app-item .dialog-content-text {
    color: var(--text-color-primary);
  }

  /* was .dialog-actions */
  keep-app-item .dialog-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    align-content: center;
    align-items: center;
  }

  /*
   * The utilities the row carried in from the global stylesheet. They reached those nodes
   * as class selectors, which do not cross a shadow boundary, so they are restated here.
   * flex-end, which the edit control also carried, is not among them: no rule of that name
   * exists in any sheet in this app, so it has never done anything.
   */
  keep-app-item .small-text {
    font-size: 14px;
  }

  keep-app-item .text-bold {
    font-weight: bold;
  }

  keep-app-item .full-width {
    width: 100%;
  }

  /*
   * The launch disc. #946.
   *
   * 40px because that is what the SVG it replaces was drawn at, and wa-icon takes its box
   * from font-size rather than width. The two colours were interpolated into a fill attribute
   * per call; they live here now because the production CSP sends style-src-attr 'none' and
   * would drop an interpolated style attribute outright (#685).
   */
  keep-app-item .launch-disc {
    font-size: 40px;
  }

  keep-app-item .launch-disc.live {
    color: #5e1ebe;
  }

  keep-app-item .launch-disc.inactive {
    color: #a5afbe;
  }

  keep-app-item .w-30px {
    width: 30px;
  }

  keep-app-item .flex {
    display: flex;
  }

  keep-app-item .flex-col {
    flex-direction: column;
  }

  keep-app-item .gap-2 {
    gap: 2px;
  }

  keep-app-item .m-0 {
    margin: 0;
  }

  keep-app-item .p-0 {
    padding: 0;
  }

  keep-app-item .no-background {
    background: none;
  }

  keep-app-item .no-border {
    border: none;
  }

  keep-app-item .cursor-pointer {
    cursor: pointer;
  }

  keep-app-item .color-text-hint {
    color: var(--hint-text-color);
  }

  keep-app-item .color-hover {
    color: var(--hover-color);
  }

  keep-app-item .script-editor-help-icon {
    color: #2d91e3;
  }

  keep-app-item .short-vertical {
    height: 31px;
    width: 1px;
    background-color: var(--wa-color-text-loud);
  }
`;

/**
 * One application in the Applications list: the data row, plus the confirmation the refresh
 * control opens. Tag: `keep-app-item`.
 *
 * Replaces `applications/AppItem.tsx`. {@link ../applications/AppsTable} owned the list, the
 * filtering and the paging before this pass and {@link ./keep-apps-table} owns them now, so
 * this takes the record as a property and reports the two decisions it cannot make itself —
 * edit and delete — back as events.
 *
 * ## It renders into the light DOM, and that is the whole design
 *
 * A shadow root here would be a third tree between the table and its rows, and two
 * stylesheets that dress those rows would stop at it: `keep-data-table`'s slotted-table sheet
 * (every selector in it begins `keep-data-table`, an ancestor of the table but not of
 * anything inside a root nested below it) and Web Awesome's native table region, which is
 * bare element selectors. Rendering into the light DOM keeps the rows in the table's own
 * root, where both already reach them. What the element owns instead is {@link appItemStyles},
 * which the table adopts.
 *
 * ## Store access
 *
 * Two dispatches, no selection. The record arrives as a property from the table, so the store
 * is imported directly rather than through a controller — a controller with no selector is a
 * subscription that can never fire.
 *
 * ## Edit is reported, not performed
 *
 * The row computes the seed and hands it out as `app-edit`; the table passes it on and
 * {@link ./keep-applications} does the two things it did before — keep the values, open the
 * drawer.
 *
 * **That seed is now also the mode (#939).** Add versus Edit used to be a separate string
 * that whoever opened the drawer was expected to set, and this row — the only reachable way
 * in — never set it, so an edit opened from here took the create branch and saving duplicated
 * the application. {@link ./keep-app-form} derives it from the client id in these values
 * instead, so there is nothing for this element to announce beyond the row itself.
 *
 * ## Two #844 fixes carried over
 *
 * Both came from the same slip in the original — a branch that tested the record and rendered
 * component state — and both are preserved as fixed:
 *
 * - the visible-secret branch renders `app.appSecret`, the value it is guarded by, not the
 *   local one, which is empty until something is generated in this session;
 * - the refresh control only opens the confirmation. It does not flip the row into the
 *   just-generated branch, which used to blank the masked secret before the user had
 *   answered, and leave it blank on cancel.
 *
 * ## Accessibility (#713)
 *
 * Four defects the original carried, fixed here rather than preserved. `keep-tooltip` builds
 * its popup imperatively and never points an `aria-describedby` at the trigger, so a tooltip
 * gives a control no accessible name at all:
 *
 *  - launch, edit and delete were icon-only buttons inside a tooltip, so all three were
 *    unnamed. Each is named directly now and its glyph is decorative (4.1.2).
 *  - the two copy triggers were spans with a click handler: not focusable, not operable from
 *    a keyboard, and the key handler meant to cover that sat on the tooltip wrapper, which is
 *    not focusable either, so it never ran. They are buttons (2.1.1).
 *  - the inactive marker was a bare graphic with no text alternative. It is labelled (1.1.1).
 *  - the confirmation dialog had no accessible name. Its heading names it now (4.1.2).
 *
 * @fires app-edit - `CustomEvent<KeepAppItemEditDetail>`
 * @fires app-delete - `CustomEvent<KeepAppItemDeleteDetail>`
 */
@customElement('keep-app-item')
export default class AppItem extends KeepElement {
  /**
   * Light DOM. See the class docblock — the row must stay in the table's root for the two
   * sheets that style it to reach it.
   */
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  /** The application this row shows. */
  @property({ attribute: false }) accessor app!: AppProp;

  /** A secret generated in this session, and whether one has been asked for. */
  @state() accessor appSecret = '';
  @state() accessor hasAppSecret = false;

  /** Whether the "Regenerate App Secret?" confirmation is up. */
  @state() accessor confirming = false;

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog');
  }

  /** Distinct per row, so the dialog's name resolves to this row's heading and no other. */
  private get headingId(): string {
    return `regen-title-${this.app.appId}`;
  }

  protected updated(): void {
    const dialog = this.dialog;
    if (!dialog) return;
    if (this.confirming) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  private launch(): void {
    window.open(this.app.appStartPage);
  }

  /**
   * Ask for a secret, or ask whether to replace the one that is there.
   *
   * `hasAppSecret` belongs to the branch that actually asks for a secret. It used to sit
   * outside the condition, so the refresh control — which only opens the confirmation —
   * flipped the row into the just-generated branch immediately, blanking the masked secret
   * before the user had answered and leaving it blank on cancel (#844).
   */
  private requestSecret(immediate: boolean): void {
    if (immediate) {
      this.generate();
    } else {
      this.confirming = true;
    }
  }

  /**
   * The generation itself.
   *
   * The third argument is the thunk's progress callback. The original passed a state setter
   * whose value it then discarded — `useState` destructured with the value hole empty — so
   * nothing has ever rendered differently while a secret was in flight, and a callback that
   * does nothing is the same component.
   */
  private generate(): void {
    store.dispatch(
      generateSecret(
        this.app.appId,
        this.app.appStatus,
        () => {},
        (secret: string) => {
          this.appSecret = secret;
        },
      ),
    );
    this.hasAppSecret = true;
  }

  private confirmRegenerate(): void {
    this.generate();
    this.confirming = false;
  }

  /**
   * Copy a value and say so.
   *
   * The value is passed in rather than read back off the clicked node. The original read
   * `currentTarget.innerText`, which in a browser is the same string this renders into the
   * node — but reading it back is a view-library habit, and it is what made the behaviour
   * untestable: jsdom implements no `innerText`, so every assertion about what got copied
   * could only pin `undefined`.
   */
  private copyToClipboard(value: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value);
      store.dispatch(toggleAlert(`Copied ${value} to clipboard`));
    } else {
      store.dispatch(
        toggleAlert(`Failed to copy to clipboard. Please copy by yourself: ${value} `),
      );
    }
  }

  /** The seed values for the Application form, exactly as the row computed them before. */
  private viewEdit(): void {
    const app = this.app;
    const values: AppFormProp = {
      appId: app.appId,
      appName: app.appName,
      appDescription: app.appDescription,
      appStartPage: app.appStartPage,
      appStatus: app.appStatus === 'isActive',
      appScope: app.appScope,
      appIcon: app.appIcon,
      appHasSecret: app.appHasSecret ? true : false,
      appSecret: app.appSecret,
      appCallbackUrlsStr: '',
      appContactsStr: '',
      usePkce: app.usePkce,
    };

    if (app.appStartPage != null && app.appStartPage.length > 0) {
      values.appStartPage = app.appStartPage.replace(/\s+/g, '');
    }
    if (app.appCallbackUrls != null && app.appCallbackUrls.length > 0) {
      values.appCallbackUrlsStr = ([] as string[])
        .concat(app.appCallbackUrls)
        .sort((a, b) => a.localeCompare(b))
        .join('\n');
    }
    if (app.appContacts != null && app.appContacts.length > 0) {
      values.appContactsStr = ([] as string[])
        .concat(app.appContacts)
        .sort((a, b) => a.localeCompare(b))
        .join('\n');
    }

    this.emit<KeepAppItemEditDetail>('app-edit', { values });
  }

  private requestDelete(): void {
    this.emit<KeepAppItemDeleteDetail>('app-delete', { appId: this.app.appId });
  }

  /**
   * The launch disc — the brand colour when the app is live, grey when it is not.
   *
   * Was 40x40 of hand-drawn path data: a disc filled with the colour and a *white* triangle
   * over it (#946). A registered circle-play is a single colour, so the triangle is a
   * knock-out rather than white. On the card surface those look the same; against anything
   * else the hole shows the surface through. Taken deliberately — one weight and one registry
   * beats a two-tone graphic that only matches on one background.
   *
   * The colour arrives as a class rather than the interpolated `fill` it replaces, because
   * the production CSP sends style-src-attr 'none': an interpolated style attribute is
   * dropped, which is the failure #685 was filed for. The two hex values move into the
   * stylesheet with it.
   */
  private static disc(state: 'live' | 'inactive') {
    return html`
      <wa-icon
        class="launch-disc ${state}"
        library=${FA_LIBRARY}
        name="circle-play"
        canvas="auto"
        aria-hidden="true"
      ></wa-icon>
    `;
  }

  private renderLaunchCell() {
    const app = this.app;
    if (app.appStatus === 'isActive') {
      return html`
        <keep-tooltip content=${`Launch ${app.appName}`} class="w-30px">
          <button
            class="no-background no-border cursor-pointer m-0 p-0 full-width"
            aria-label=${`Launch ${app.appName}`}
            @click=${this.launch}
          >
            ${AppItem.disc('live')}
          </button>
        </keep-tooltip>
      `;
    }
    if (app.appStatus === 'disabled') {
      return html`
        <keep-tooltip content="This application is inactive.">
          <span role="img" aria-label="This application is inactive."
            >${AppItem.disc('inactive')}</span
          >
        </keep-tooltip>
      `;
    }
    return nothing;
  }

  /** A value the user can copy, under the tooltip that says what it is. */
  private renderCopyable(tooltip: string, value: string, extraClass: string) {
    return html`
      <keep-tooltip content=${tooltip}>
        <button
          class=${`copy-text small-text cursor-pointer ${extraClass}`}
          @click=${() => this.copyToClipboard(value)}
        >
          ${value}
        </button>
      </keep-tooltip>
    `;
  }

  /** Whichever of the four secret states this row is in. */
  private renderSecret() {
    const app = this.app;
    if (this.hasAppSecret) {
      return this.renderCopyable(
        'Copy Application Secret',
        this.appSecret,
        'script-editor-help-icon',
      );
    }
    if (app.appHasSecret) {
      return html`
        <button
          class="no-background no-border cursor-pointer m-0 p-0"
          aria-label="Regenerate app secret"
          @click=${() => this.requestSecret(false)}
        >
          <wa-icon
            class="regenerate-icon"
            library=${FA_LIBRARY}
            name="arrows-rotate"
            canvas="auto"
          ></wa-icon>
        </button>
        <span class="small-text color-text-hint">${MASKED}</span>
      `;
    }
    // `app.appSecret`, not the local one. This branch is guarded by the record and used to
    // render the state, which is empty until something is generated in this session — so a
    // secret the API had supplied showed as blank text under a "Copy Application Secret"
    // tooltip (#844). Each branch renders the value it tests.
    if ((app.appSecret?.length ?? 0) > 0) {
      return this.renderCopyable(
        'Copy Application Secret',
        app.appSecret,
        'script-editor-help-icon',
      );
    }
    return html`
      <button
        class="no-background no-border cursor-pointer m-0 p-0"
        @click=${() => this.requestSecret(true)}
      >
        <span class="small-text script-editor-help-icon">${CLICK_TO_GENERATE}</span>
      </button>
    `;
  }

  private renderDialog() {
    return html`
      <dialog
        class="regen-app-secret-dialog"
        aria-labelledby=${this.headingId}
        @close=${() => {
          this.confirming = false;
        }}
      >
        <div class="dialog-title">
          <span class="dialog-title-text" id=${this.headingId}>Regenerate App Secret?</span>
        </div>
        <div class="dialog-content">
          <span class="dialog-content-text">
            WARNING: You are attempting to regenerate the App Secret, doing so may break
            existing applications. Are you sure you want to proceed?
          </span>
        </div>
        <div class="dialog-actions">
          <keep-button
            variant="neutral"
            appearance="outlined"
            @click=${() => {
              this.confirming = false;
            }}
            >No</keep-button
          >
          <keep-button @click=${this.confirmRegenerate}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }

  render() {
    const app = this.app;
    return html`
      <tr>
        <td class="expand">${this.renderLaunchCell()}</td>
        <td class="app-name">
          <div class="app-name-container">
            <keep-app-icon name=${app.appIcon} alt="db-icon" class="color-hover"></keep-app-icon>
            <div class="flex flex-col gap-2">
              <span class="small-text">${app.appName}</span>
              <div class="full-width">
                <keep-app-status ?status=${app.appStatus === 'isActive'}></keep-app-status>
              </div>
            </div>
          </div>
        </td>
        <td class="expiration exp-content">
          <div>
            <div class="app-id-secret-row">
              <span class="small-text">App ID:</span>
              ${this.renderCopyable('Copy App Id', app.appId, 'color-text-hint')}
            </div>
            ${app.usePkce
              ? html`
                  <div class="app-id-secret-row">
                    <span class="small-text text-bold">PKCE</span>
                  </div>
                `
              : html`
                  <div class="app-id-secret-row">
                    <span class="small-text">App Secret:</span>
                    ${this.renderSecret()}
                  </div>
                `}
          </div>
        </td>
        <td><span class="small-text">${app.appDescription}</span></td>
        <td>
          <div class="options">
            <keep-tooltip content="Edit Application" class="w-30px flex">
              <button
                class="no-background no-border cursor-pointer m-0 p-0"
                aria-label="Edit Application"
                @click=${this.viewEdit}
              >
                <wa-icon
                  class="edit-icon"
                  library=${FA_LIBRARY}
                  name="pencil"
                  canvas="auto"
                ></wa-icon>
              </button>
            </keep-tooltip>
            <div><div class="short-vertical"></div></div>
            <keep-tooltip content="Delete Application">
              <button
                class="no-background no-border cursor-pointer m-0 p-0"
                aria-label="Delete Application"
                @click=${this.requestDelete}
              >
                <div class="delete-icon"></div>
              </button>
            </keep-tooltip>
          </div>
        </td>
      </tr>
      ${this.renderDialog()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-app-item': AppItem;
  }
}
