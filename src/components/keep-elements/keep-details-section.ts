/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/spinner/spinner.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import './keep-app-icon';
import './keep-button';
import './keep-form-dialog-header';
import './keep-icon-dropdown';
import './keep-tooltip';
import type { KeepIconSelectDetail } from './keep-icon-dropdown';
import { DEFAULT_APP_ICON_NAME, appIconPayload, loadAppIcons } from '../../services/app-icons';
import { FA_LIBRARY } from '../../services/icon-library';
import { updateSchema } from '../../store/databases/action';
import type { Database } from '../../store/databases/types';
import { store } from '../../store/store';
import { checkIcon } from '../../styles/scripts';

/** A scope, as `FormsContainer` holds them. Only these two fields are read. */
export interface KeepDetailsSectionScope {
  schemaName: string;
  nsfPath: string;
}

/** `event.detail` of the `schema-change` event. */
export interface KeepDetailsSectionSchemaChangeDetail {
  /**
   * What the parent's copy of the schema should become — either the record the update
   * endpoint echoed back, or the current one with `prohibitRefresh` flipped.
   */
  schemaData: any;
}

/**
 * The buffer the Edit Schema dialog writes into, kept apart from the schema itself so
 * Cancel/Discard can throw the edits away.
 *
 * Six of these fields are not edited anywhere and are here because the payload builder
 * reads them back out — see {@link DetailsSection.buildUpdatedSchema} for what that costs.
 */
interface SchemaEditBuffer {
  apiName: string;
  description: string;
  nsfPath: string;
  iconName: string;
  dqlAccess: boolean | null;
  openAccess: boolean | null;
  allowCode: boolean | null;
  allowDecryption: boolean | null;
  formulaEngine?: string;
  dqlFormula?: { formulaType?: string; formula?: string };
  requireRevisionToUpdate?: boolean;
  icon: string;
  isActive: string;
  applicationAccessApprovers: undefined;
  configuredForms: string[];
  excludedViews: undefined;
  owners: string[];
  storedProcedures: unknown[];
  prohibitRefresh: boolean;
}

/** The four flags the dialog's switches write straight into the buffer. */
type ToggleKey = 'dqlAccess' | 'openAccess' | 'allowCode' | 'requireRevisionToUpdate';

/** Descriptions longer than this are truncated behind a View More control. */
const DESCRIPTION_LIMIT = 180;

/**
 * The schema header on the Schema Management page: icon, name, path, description, file
 * path and configuration summary, plus the Edit Schema dialog behind the pencil.
 * Tag: `keep-details-section`. Exposed to React as `KeepDetailsSection`, because its only
 * consumer — `forms/FormsContainer.tsx` — is still React.
 *
 * @fires schema-change - the parent's copy of the schema should be replaced by
 *   `detail.schemaData`. Emitted on a successful save and when the Prevent Design Refresh
 *   switch is flipped.
 *
 * ## The parent owns the schema; this owns the edit buffer
 *
 * `schemaData`, `dbName` and `scopes` all come down as properties, which is the division
 * `FormsContainer` already has with `keep-edit-view` — it selects `databases.scopes` for
 * itself and holds the schema in React state. Nothing here selects from the store, so
 * there is no `StoreController`: the one thing it needs the store for is dispatching the
 * update thunk, and a controller with no selector would only add a subscription that can
 * never fire.
 *
 * The read-only half of the screen renders **the property**, and only the dialog renders
 * the buffer. That is what the original did and it is worth stating, because it means the
 * five checkmarks do not move when the dialog's switches move — they move when the save
 * comes back.
 *
 * ## Seeding, and the staleness it inherits
 *
 * The buffers seed once, from the first `schemaData` that arrives — the exact reach of
 * React's `useState(initialValue)`, which reads its argument on the first render and never
 * again. The consumer only mounts this once its fetch has resolved, so that first value is
 * the real schema.
 *
 * It also inherits what that costs: switching to another schema without leaving the page
 * replaces the property but not the buffers, so the dialog reopens on the previous
 * schema's description, formula and icon. The original carried one repair for one corner
 * of this — {@link syncConfigLoading} re-seeds the buffer when a schema whose four access
 * flags were `null` is replaced by one where they are not — and that is reproduced as it
 * stands. The wider staleness is reported rather than fixed; it needs a decision about
 * whether an unsaved edit survives a schema switch.
 *
 * ## The icon picker is the shared one
 *
 * The original built its own: a text button holding a 90px tile and a caret, over a menu
 * of all 86 icons, with the selection tracked **twice** — as `displayIconName` and as a
 * `selectedIndex` that started at 1 (`barcode_scanner`) while the tile showed the schema's
 * own icon. So the menu opened with the tick on the wrong row, and picking from it was the
 * only thing that ever brought the two into agreement. `keep-icon-dropdown` derives the
 * tick from the name it is given, so they cannot drift, and it is the same picker the Add
 * Schema dialog uses. Two visible consequences, both in this dialog only: its tile is 35px
 * rather than 90px, and it shows the icon's name beside the tile.
 *
 * ## Accessibility (#713)
 *
 * Five defects are fixed rather than reproduced:
 *
 *  - the edit pencil and the View More/Less control were click-handling `div`s: not
 *    focusable, not operable from the keyboard, with no role and no accessible name. Both
 *    are real buttons now (WCAG 2.1.1, 4.1.2), and the expander reports `aria-expanded`.
 *  - the five configuration glyphs were the only indication of each flag's state and were
 *    rendered `aria-hidden`, so the state was conveyed by shape and colour alone. Each
 *    carries "Enabled"/"Disabled" now (WCAG 1.1.1) — the grey-out on the label beside it
 *    is not a substitute, being colour alone.
 *  - the status dot was likewise shape-and-colour only, with the text in a tooltip. A
 *    tooltip is not an accessible name, so it is `role="img"` with one.
 *  - the description textarea's caption was a sibling `text` element, so the control had no
 *    accessible name (WCAG 3.3.2). It is a real label now.
 *  - the five switches had the same problem. Each carries its own caption as its label, so
 *    the control is named; the caption stays on the left of the toggle, where it was.
 *
 * ## What the shadow boundary cost
 *
 * Nearly all of it. Eight styled blocks, eleven rules out of the page stylesheet and about
 * twenty utility classes reached this component through class selectors, and the dialog,
 * the horizontal rules and the textarea took most of their appearance from Web Awesome's
 * native layer through bare element selectors. None of that crosses; it is all restated
 * below, against tokens rather than the literals the originals held wherever the literal
 * was a light-mode value with no dark counterpart.
 */
@customElement('keep-details-section')
export default class DetailsSection extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /* The page's border-box reset is a rule on the root element plus a universal
         inherit, and neither
         crosses this boundary. Stated as border-box rather than inherit, because an
         inherited value loses to any declaration further in — and the percentage widths
         on the configuration rows below all measure their padding. */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      :host {
        display: block;
      }

      /* Was the color-text-primary utility, which is a literal black with a dark-mode
         override keyed off the body attribute. The token is the same thing without the
         second rule, and it inherits through this boundary. */
      .text-primary {
        color: var(--wa-color-text-normal);
      }

      /* --- the title block --------------------------------------------------------- */

      /* Was the icon-container rule: the positioning context the status dot hangs off. */
      .icon-container {
        position: relative;
        display: inline-block;
        width: 90px;
        height: 90px;
      }

      /* Was the icon-dropdown rule, which sized an image. The class lands on the host
         now and the element's own image fills it, so its object-fit is dropped from here
         — it would have applied to a box with no replaced content. */
      .schema-icon {
        width: 90px;
        height: 90px;
        display: block;
      }

      /* Was the status-icon styled block. */
      .status-icon {
        position: absolute;
        top: -5px;
        right: -15px;
        z-index: 2;
      }

      /*
       * Was the schema-icon-status styled block plus one of the two in-use classes. The
       * two disagreed: the styled block sized the dot 10 square and the class 14, both at
       * one class of specificity, so which one applied depended on which sheet the bundler
       * emitted last. 10 is what the lazily loaded chunk's sheet produced, and it is
       * stated once here.
       */
      .status-dot {
        width: 10px;
        height: 10px;
        background-position: top right;
        background-repeat: no-repeat;
        background-size: contain;
      }

      .status-dot.in-use {
        background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiM4MkRDNzMiLz4KPC9zdmc+Cg==');
      }

      .status-dot.not-in-use {
        background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjYiIGZpbGw9IiNENjQ2NkYiLz4KPC9zdmc+Cg==');
      }

      /* Was the title styled block's api-name rule. */
      .api-name {
        font-size: 20px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: bold;
        display: flex;
        width: 100%;
        align-items: center;
        gap: 5px;
      }

      .api-schema {
        max-width: 80%;
        text-overflow: ellipsis;
        overflow-x: hidden;
        white-space: nowrap;
      }

      @media screen and (max-width: 600px) {
        .api-schema {
          max-width: 30%;
          text-overflow: ellipsis;
          overflow-x: hidden;
          white-space: nowrap;
        }
      }

      .api-nsf {
        font-size: var(--wa-font-size-m);
      }

      /*
       * Was the edit-icon styled block, on a click-handling div. It is a button now, so
       * the user-agent chrome is turned off to leave it looking like the bare glyph it was.
       *
       * No font-size, as before: the glyph drew at 1em and the api-name row above sets
       * 20px, so the inherited value is what shipped.
       *
       * The colour is the literal the original held. It is off the token ramp and its
       * contrast in dark mode is poor, but that was a recorded decision when the glyph was
       * converted and changing it is a visual edit this conversion has no business making.
       * The dead left beside it is dropped — nothing positions this element, so the
       * declaration could never have applied.
       */
      .edit-icon {
        cursor: pointer;
        color: blue;
        background: none;
        border: 0;
        padding: 0;
        font: inherit;
        line-height: 0;
      }

      .edit-icon:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * Was a bare hr carrying a color presentational attribute. The attribute was
       * inert: presentational hints are the lowest-priority author declarations, so Web
       * Awesome's own bare hr rule beat it and drew this line in the surface-border
       * token. That rule is restated here because a bare element selector does not cross a
       * shadow boundary — without it the user-agent groove comes back.
       */
      .rule {
        margin: var(--wa-content-spacing) 0;
        border: none;
        border-bottom: solid var(--wa-border-width-s) var(--wa-color-surface-border);
      }

      /* --- the information block --------------------------------------------------- */

      /* Was the information styled block. Its x-overflow declaration is dropped: there is
         no such property, so it was discarded at parse. */
      .information {
        padding-top: 20px;
        width: 100%;
      }

      /* Was the heading styled block and its two inner rules. */
      .heading-block {
        margin: 10px 0;
      }

      .heading {
        font-size: 20px;
        word-wrap: break-word;
      }

      .description {
        font-size: var(--wa-font-size-m);
        padding: 0 0 20px;
      }

      .expander-row {
        display: flex;
        justify-content: center;
      }

      /*
       * Was the expander styled block, on a click-handling div — a button now, with the
       * user-agent chrome off.
       *
       * Its grey was a literal with no dark counterpart, which put this control below the
       * contrast floor on the dark page. The quiet-text token is the mode-aware equivalent
       * and is the same family of grey in light mode.
       */
      .expander {
        cursor: pointer;
        color: var(--wa-color-text-quiet);
        display: flex;
        justify-content: center;
        align-items: center;
        background: none;
        border: 0;
        padding: 0;
        font: inherit;
      }

      .expander:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /* wa-icon takes its box from font-size; the utility that used to supply this one is
         in the page stylesheet. The size the call site asked for was the xl token. */
      .expander wa-icon {
        font-size: var(--wa-font-size-xl);
      }

      /* Was the view-buttons styled block: an element that has always been empty and
         exists for the 30px it puts under the description. */
      .view-buttons {
        margin-bottom: 30px;
      }

      /* --- the configuration summary ----------------------------------------------- */

      /* 20px is what the Material spinner this replaces was asked for. The control sizes
         from font-size only; a width would break its animation. */
      .config-spinner {
        font-size: 20px;
      }

      /* Was the list-config styled block. */
      .list-config {
        padding: 0 0 0 1px;
      }

      /* Was the config styled block. Its title and title-container rules are dropped:
         no element in this component ever carried either class. */
      .config {
        display: flex;
        margin: 0 0 2px;
      }

      /* Was the three flex utilities on the row inside each config block. */
      .config-line {
        display: flex;
        flex-direction: row;
        width: 100%;
        flex-wrap: wrap;
      }

      /* Was the config-name rule. */
      .config-name {
        display: flex;
        flex-wrap: wrap;
        width: 95%;
        max-width: calc(100% - 12px);
      }

      /* Was the small-text utility beside color-text-primary. */
      .config-label {
        font-size: 14px;
        color: var(--wa-color-text-normal);
      }

      /* Was the config-unchecked rule. */
      .config-label.label-unchecked {
        color: var(--hint-text-color);
      }

      /* Was the checkbox-container rule. */
      .checkbox-container {
        width: 5%;
      }

      /*
       * Was the config block's descendant rule on the glyph. It is a descendant selector
       * so it outranked the icon set's own default, and these ten glyphs have always drawn
       * at this size.
       */
      .checkbox {
        font-size: var(--wa-font-size-m);
        margin-top: 3px;
        color: var(--active-indicator-color);
      }

      /*
       * Was the unchecked rule. Both of its colours were light-mode literals — and one of
       * them, font-color, is not a property at all and was discarded at parse. The two
       * indicator tokens hold exactly these greens and greys in light mode and have dark
       * counterparts, which the literals did not.
       */
      .checkbox.unchecked {
        color: var(--inactive-indicator-color);
      }

      /* Was the formula-box rule with two flex utilities beside it. */
      .formula-box {
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
        max-width: 100%;
      }

      /* Was the large-text utility beside color-text-primary. */
      .formula-title {
        font-size: 20px;
        color: var(--wa-color-text-normal);
      }

      /* Was the small-text utility beside color-text-primary. */
      .formula-value {
        font-size: 14px;
        color: var(--wa-color-text-normal);
      }

      /* --- the two dialogs --------------------------------------------------------- */

      /*
       * Was the shared modal-dialog rule. Its border was a hardcoded light/dark pair and
       * is the surface-border token here, as the other converted dialogs settled on.
       *
       * Everything from max-width down is Web Awesome's own bare dialog rule, restated
       * because it does not cross this boundary: without it the dialog is 32rem wide by
       * user-agent default rather than centred, padded and raised. The backdrop comes from
       * the shared module above for the same reason.
       */
      dialog {
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        width: 30%;
        height: fit-content;
        flex-direction: column;
        gap: 30px;
        display: none;

        max-width: calc(100% - var(--wa-space-l));
        padding: var(--wa-space-l);
        margin: auto;
        inset: 0;
        align-items: start;
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
        box-shadow: var(--wa-shadow-l);
      }

      dialog[open] {
        display: flex;
      }

      dialog:focus {
        outline: none;
      }

      /* Was the two zero-padding utilities on the edit dialog, which pulls its own padding
         in to the rows so the divider can run the full width. */
      dialog.edit {
        padding-inline: 0;
      }

      /* Was the padding utilities that put each row back inside the dialog's margins. */
      .padded {
        padding-inline: 30px;
      }

      /*
       * Was the shared 1px rule between dialog sections. border: 0 is not in the
       * original and is needed here: Web Awesome's native layer clears the user-agent
       * groove through a bare selector, so inside a shadow root the groove comes back and
       * draws under the bar. The colour is the surface-border token rather than the
       * sheet's fixed grey.
       */
      .divider {
        height: 1px;
        width: 100%;
        padding: 0;
        margin: 0;
        border: 0;
        background: var(--wa-color-surface-border);
      }

      /* Was the shared dialog-content rule. */
      .dialog-content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      /* Was the shared dialog-content-text rule. Its size came from the bare text
         element rule in the overrides sheet, because the class sets no font-size. */
      .dialog-content-text {
        font-size: 12px;
        color: var(--wa-color-text-normal);
      }

      /* Was the shared dialog-actions rule. */
      .dialog-actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-content: center;
        align-items: center;
      }

      /*
       * Was the text-bold utility on a bare text element, whose 12px likewise came from
       * the overrides sheet rather than from any class. Block rather than inline, which is
       * how all three of these rendered: each is followed by a full-width control that
       * wrapped past it.
       */
      .caption {
        display: block;
        font-size: 12px;
        font-weight: bold;
        color: var(--wa-color-text-normal);
      }

      /* Was the text-center utility around the icon picker. */
      .icon-picker {
        text-align: center;
      }

      /*
       * Was the description textarea's own rule plus what Web Awesome's native layer gave
       * every bare textarea — height, font family, line height, background, border style
       * and width, the focus ring and the text cursor, none of which crosses.
       *
       * The border colour was a hardcoded light/dark pair and is the form-control token,
       * which is what every other field on this screen already reads.
       */
      .textarea {
        width: 100%;
        height: 20vh;
        resize: none;
        margin-top: 5px;
        padding: 16px 14px;
        font-size: 16px;
        font-family: inherit;
        line-height: var(--wa-line-height-normal);
        color: var(--wa-color-text-normal);
        background-color: var(--wa-form-control-background-color);
        border-radius: 5px;
        border-style: var(--wa-form-control-border-style);
        border-width: var(--wa-form-control-border-width);
        border-color: var(--wa-form-control-border-color);
        cursor: text;
        outline: var(--wa-focus-ring-style) var(--wa-focus-ring-width) transparent;
        outline-offset: var(--wa-focus-ring-offset);
      }

      .textarea:focus-visible {
        outline-color: var(--wa-color-focus);
      }

      /* Was the config-container rule with a flex-direction utility beside it. */
      .config-container {
        display: flex;
        flex-direction: row;
        width: 100%;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 10%;
      }

      /*
       * Was the config-row rule, on a flex row holding a caption and a toggle. The caption
       * is the toggle's own label now — that is what gives the control an accessible name
       * — so the row is the toggle, and the two rules below put the label back on the left
       * of the switch and hold it against the far edge, which is where the flex row it
       * replaces had it.
       *
       * 12px because the caption was a bare text element with no size class, so it took
       * the overrides sheet's size for that element.
       */
      .config-toggle {
        display: flex;
        width: 40%;
        font-size: 12px;
      }

      .config-toggle::part(base) {
        width: 100%;
        flex-direction: row-reverse;
        justify-content: space-between;
      }

      .config-toggle::part(label) {
        margin-inline-start: 0;
      }

      wa-input {
        width: 100%;
      }
    `,
  ];

  /** The schema name, which is also what the update endpoint is keyed by. */
  @property({ type: String, attribute: 'db-name' }) accessor dbName = '';

  /** The schema being shown. Owned by the consumer — see the class docblock. */
  @property({ attribute: false }) accessor schemaData: Database | null = null;

  /**
   * Every scope, so the header can say whether this schema is used by one.
   *
   * A property rather than a store subscription because the consumer already selects
   * `databases.scopes` for its own rendering and passes the same array to
   * `keep-edit-view`; a second subscription here would be a second source of one truth.
   */
  @property({ attribute: false }) accessor scopes: KeepDetailsSectionScope[] = [];

  /** False once the schema's four access flags have arrived. */
  @state() private accessor isConfigLoading = true;

  /** The description as the dialog's textarea holds it. */
  @state() private accessor desc = '';

  /** The DQL formula as the dialog's field holds it. */
  @state() private accessor dqlFormulaValue = '@True';

  /** Prevent Design Refresh, which is the one switch that reports straight to the parent. */
  @state() private accessor prohibitRefreshValue = true;

  /** The icon the dialog is offering to save; committed only by Save. */
  @state() private accessor displayIconName = DEFAULT_APP_ICON_NAME;

  /** The dialog's edit buffer. */
  @state() private accessor dbContext: SchemaEditBuffer = DetailsSection.emptyBuffer();

  @state() private accessor editOpen = false;

  @state() private accessor discardOpen = false;

  /** Whether a description over the limit is shown in full. */
  @state() private accessor viewMore = false;

  @query('dialog.edit') private accessor editDialog!: HTMLDialogElement | null;

  @query('dialog.discard') private accessor discardDialog!: HTMLDialogElement | null;

  /** Set once the first `schemaData` has seeded the buffers. See the class docblock. */
  private seeded = false;

  connectedCallback(): void {
    super.connectedCallback();
    // The request body carries the icon's base64 next to its name and the payloads live in
    // a lazily loaded chunk (#772), so there is a window in which the name is known and the
    // bytes are not. Asking on connect closes it as early as this element can; inside it
    // `appIconPayload` answers '' and the saved icon falls back to the stored one, exactly
    // as before. Nothing rendered here reads the map — both icon surfaces are elements that
    // load it for themselves — so there is no state to flip when it lands.
    void loadAppIcons().catch(() => {
      /* nothing here can retry usefully; the two icon elements show their own skeletons */
    });
  }

  /** The buffer before any schema has arrived. Every field is the empty form of its type. */
  private static emptyBuffer(): SchemaEditBuffer {
    return {
      apiName: '',
      description: '',
      nsfPath: '',
      iconName: DEFAULT_APP_ICON_NAME,
      dqlAccess: null,
      openAccess: null,
      allowCode: null,
      allowDecryption: null,
      formulaEngine: undefined,
      dqlFormula: undefined,
      requireRevisionToUpdate: undefined,
      icon: '',
      isActive: 'true',
      applicationAccessApprovers: undefined,
      configuredForms: [],
      excludedViews: undefined,
      owners: [],
      storedProcedures: [],
      prohibitRefresh: true,
    };
  }

  /**
   * The buffer as the current schema would seed it.
   *
   * Six fields are hardcoded rather than read from the schema, and that is not cosmetic:
   * {@link buildUpdatedSchema} takes `owners` and `excludedViews` back out of the buffer,
   * so **saving from this dialog blanks the schema's owner list**. That is what shipped,
   * this pass is behaviour-preserving, and repairing it needs a decision about what the
   * correct payload is. `keep-edit-view` carries the same defect from the same shape.
   */
  private get selectedDB(): SchemaEditBuffer {
    const schema = this.schemaData;
    return {
      apiName: schema?.apiName ?? '',
      description: schema?.description ?? '',
      nsfPath: schema?.nsfPath ?? '',
      iconName: schema?.iconName ?? DEFAULT_APP_ICON_NAME,
      dqlAccess: schema?.dqlAccess,
      openAccess: schema?.openAccess,
      allowCode: schema?.allowCode,
      allowDecryption: schema?.allowDecryption,
      formulaEngine: schema?.formulaEngine,
      dqlFormula: schema?.dqlFormula,
      requireRevisionToUpdate: schema?.requireRevisionToUpdate,
      icon: schema?.icon ?? '',
      isActive: schema?.isActive ?? 'true',
      applicationAccessApprovers: undefined,
      configuredForms: [],
      excludedViews: undefined,
      owners: [],
      storedProcedures: [],
      prohibitRefresh: this.prohibitRefreshValue,
    };
  }

  /** The schema's DQL formula, or the default the summary and the dialog both show. */
  private get formula(): string {
    const dqlFormula = this.schemaData?.dqlFormula;
    return dqlFormula && dqlFormula.formula ? dqlFormula.formula : '@True';
  }

  /** Whether any scope points at this schema. */
  private get isInUse(): boolean {
    const schema = this.schemaData;
    if (!schema) return false;
    return this.scopes.some(
      (scope) => `${scope.nsfPath}:${scope.schemaName}` === `${schema.nsfPath}:${schema.schemaName}`,
    );
  }

  /**
   * The name of the state the dot reports.
   *
   * The original built this in parentheses and then sliced them back off for the tooltip,
   * which was its only reader.
   */
  private get usage(): string {
    return this.isInUse ? 'Used by Scopes' : 'Not used by Scopes';
  }

  // Untyped `PropertyValues`, because most of what these two read is private state and a
  // `PropertyValues<this>` map is keyed by the public surface only.
  protected willUpdate(changed: PropertyValues): void {
    if (!this.seeded && changed.has('schemaData') && this.schemaData) {
      this.seedFromSchema();
      this.seeded = true;
    }
    this.syncConfigLoading();

    // Raising the discard dialog lowers the editor. Done here rather than from `updated`,
    // where the original's effect did it: a property set after an update has completed
    // schedules a second one, which Lit warns about and which makes the two dialogs move in
    // separate frames. Set during `willUpdate` it lands in the same changed-property map,
    // so both dialogs are dealt with by the one pass below.
    if (changed.has('discardOpen') && this.discardOpen) this.editOpen = false;
  }

  /** The buffers as the first schema leaves them. See the class docblock on staleness. */
  private seedFromSchema(): void {
    const schema = this.schemaData;
    this.desc = schema?.description ?? '';
    this.dqlFormulaValue = this.formula;
    this.prohibitRefreshValue = schema?.prohibitRefresh === undefined ? true : schema.prohibitRefresh;
    this.displayIconName = checkIcon(schema?.iconName ?? '')
      ? (schema?.iconName as string)
      : DEFAULT_APP_ICON_NAME;
    // Reads prohibitRefreshValue, so it goes last.
    this.dbContext = this.selectedDB;
  }

  /**
   * Lower the loading state once the four access flags have arrived, and repair a buffer
   * that was seeded before they did.
   *
   * The comparisons are against `null` alone, as they were: a schema that simply omits
   * these keys reads as ready, which is why the summary does not sit on a spinner for a
   * record that will never carry them.
   */
  private syncConfigLoading(): void {
    const schema = this.schemaData;
    if (!schema) return;

    const flagsArrived =
      schema.openAccess !== null &&
      schema.dqlAccess !== null &&
      schema.allowCode !== null &&
      schema.allowDecryption !== null;
    if (!flagsArrived) return;

    const bufferBlank =
      this.dbContext.openAccess === null &&
      this.dbContext.dqlAccess === null &&
      this.dbContext.allowCode === null &&
      this.dbContext.allowDecryption === null;
    if (bufferBlank) this.dbContext = this.selectedDB;

    this.isConfigLoading = false;
  }

  /**
   * Drive the two native dialogs from the two flags.
   *
   * The order is the one the original was careful about: a discard dialog that is going up
   * enters the top layer **before** the editor comes down, so it ends as the only entry
   * there. Both are guarded on the way up because `showModal()` on an already-open dialog
   * throws; `close()` on a closed one is a no-op and needs no guard.
   */
  protected updated(changed: PropertyValues): void {
    const discardChanged = changed.has('discardOpen');
    if (discardChanged && this.discardOpen) this.openModal(this.discardDialog);

    if (changed.has('editOpen')) {
      if (this.editOpen) this.openModal(this.editDialog);
      else this.editDialog?.close();
    }

    if (discardChanged && !this.discardOpen) this.discardDialog?.close();
  }

  private openModal(dialog: HTMLDialogElement | null): void {
    if (dialog && !dialog.open) dialog.showModal();
  }

  /** Keep a composed control event inside this element. */
  private stopEvent(event: Event): void {
    event.stopPropagation();
  }

  private handleToggle(key: ToggleKey, event: Event): void {
    event.stopPropagation();
    this.dbContext = { ...this.dbContext, [key]: !this.dbContext[key] };
  }

  private handleDescriptionInput(event: Event): void {
    event.stopPropagation();
    const value = (event.target as HTMLTextAreaElement).value ?? '';
    this.dbContext = { ...this.dbContext, description: value };
    this.desc = value;
  }

  private handleDqlFormulaInput(event: Event): void {
    event.stopPropagation();
    const value = (event.target as HTMLInputElement).value ?? '';
    // The engine comes from the schema, not from the buffer — as it did before.
    this.dbContext = {
      ...this.dbContext,
      dqlFormula: { formulaType: this.schemaData?.formulaEngine, formula: value },
    };
    this.dqlFormulaValue = value;
  }

  /**
   * Prevent Design Refresh, which is the one switch that does not wait for Save.
   *
   * It reports straight to the consumer, and the summary row above reads the property
   * rather than this buffer, so the checkmark moves when the consumer's copy does. The
   * first press of a schema that has never carried the flag sets it false whatever the
   * switch shows, which is what the original computed; from then on it toggles normally
   * because the consumer's copy now holds a boolean.
   */
  private handleProhibitRefreshToggle(event: Event): void {
    event.stopPropagation();
    const schema = this.schemaData;
    const next = schema?.prohibitRefresh === undefined ? false : !this.prohibitRefreshValue;
    this.prohibitRefreshValue = next;
    this.emit<KeepDetailsSectionSchemaChangeDetail>('schema-change', {
      schemaData: { ...schema, prohibitRefresh: next },
    });
  }

  private handleIconSelect(event: CustomEvent<KeepIconSelectDetail>): void {
    event.stopPropagation();
    this.displayIconName = event.detail.iconName;
  }

  /**
   * The request body: the buffer's fields, the schema's lists, and the icon resolved from
   * the name the picker last reported.
   *
   * `owners` and `excludedViews` come out of the buffer, where they are hardcoded — see
   * {@link selectedDB}.
   */
  private buildUpdatedSchema(): Record<string, unknown> {
    const schema = this.schemaData;
    const buffer = this.dbContext;
    const forms = schema?.forms ? schema.forms.filter((form) => form.formModes.length > 0) : [];

    return {
      apiName: buffer.apiName,
      schemaName: this.dbName,
      nsfPath: buffer.nsfPath,
      description: buffer.description,
      isActive: buffer.isActive,
      icon: appIconPayload(this.displayIconName) || schema?.icon,
      iconName: this.displayIconName,
      formulaEngine: buffer.formulaEngine,
      allowCode: buffer.allowCode,
      dqlAccess: buffer.dqlAccess,
      openAccess: buffer.openAccess,
      allowDecryption: buffer.allowDecryption,
      dqlFormula: buffer.dqlFormula,
      requireRevisionToUpdate: buffer.requireRevisionToUpdate,
      agents: schema?.agents,
      views: schema?.views,
      excludedViews: buffer.excludedViews,
      owners: buffer.owners,
      forms: forms.map((form) => form),
      prohibitRefresh: this.prohibitRefreshValue,
    };
  }

  private handleClickSave(): void {
    store.dispatch(
      updateSchema(this.buildUpdatedSchema(), (schemaData: any) =>
        this.emit<KeepDetailsSectionSchemaChangeDetail>('schema-change', { schemaData }),
      ),
    );
    this.editOpen = false;
  }

  /** Throw the dialog's edits away and put every buffer back to the current schema. */
  private clearEdits(): void {
    const schema = this.schemaData;
    this.editOpen = false;
    this.discardOpen = false;
    this.dbContext = this.selectedDB;
    this.dqlFormulaValue = this.formula;
    this.desc = schema?.description ?? '';
    this.displayIconName = checkIcon(schema?.iconName ?? '')
      ? (schema?.iconName as string)
      : DEFAULT_APP_ICON_NAME;
  }

  /** One row of the read-only configuration summary. */
  private renderConfigRow(label: string, labelOn: boolean, iconOn: boolean, tip?: string) {
    const caption = html`<span class="config-label ${labelOn ? '' : 'label-unchecked'}"
      >${label}</span
    >`;
    return html`
      <div class="config">
        <div class="config-line">
          <div class="config-name">
            ${tip
              ? html`<keep-tooltip content=${tip} placement="bottom">${caption}</keep-tooltip>`
              : caption}
          </div>
          <div class="checkbox-container">
            <wa-icon
              class="checkbox ${iconOn ? '' : 'unchecked'}"
              library=${FA_LIBRARY}
              name=${iconOn ? 'circle-check' : 'ban'}
              canvas="auto"
              label=${iconOn ? 'Enabled' : 'Disabled'}
            ></wa-icon>
          </div>
        </div>
      </div>
    `;
  }

  /** One switch in the dialog, captioned by its own label so the control has a name. */
  private renderToggle(label: string, checked: boolean, onChange: (event: Event) => void) {
    return html`
      <wa-switch
        class="config-toggle"
        size="s"
        .checked=${live(checked)}
        @change=${onChange}
        @input=${this.stopEvent}
        >${label}</wa-switch
      >
    `;
  }

  private renderSummary() {
    const schema = this.schemaData;
    const prohibitRefresh = schema?.prohibitRefresh;
    const refreshOn = prohibitRefresh === undefined || prohibitRefresh === null || !!prohibitRefresh;
    // Three of these rows grey their caption from dqlAccess rather than from the flag the
    // glyph beside them reports, so the caption and the glyph can disagree. Reproduced —
    // see the report accompanying this conversion.
    const dqlAccess = !!schema?.dqlAccess;
    return html`
      <div class="list-config">
        ${this.renderConfigRow('DQL Access', dqlAccess, dqlAccess)}
        ${this.renderConfigRow(
          'In $DATA Scope',
          dqlAccess,
          !!schema?.openAccess,
          'Include this in $DATA scope',
        )}
        ${this.renderConfigRow('Enable Code', dqlAccess, !!schema?.allowCode)}
        ${this.renderConfigRow(
          'Require Revision',
          !!schema?.requireRevisionToUpdate,
          !!schema?.requireRevisionToUpdate,
        )}
        ${this.renderConfigRow('Prevent Design Refresh', refreshOn, refreshOn)}
        <div class="config">
          <div class="formula-box">
            <span class="formula-title">DQL Formula</span>
            <span class="formula-value">${this.formula}</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderEditDialog() {
    const buffer = this.dbContext;
    return html`
      <dialog class="dialog edit" aria-label="Edit Schema">
        <div class="padded">
          <keep-form-dialog-header
            heading="Edit Schema"
            @header-close=${() => {
              this.discardOpen = true;
            }}
          ></keep-form-dialog-header>
        </div>
        <hr class="divider" />
        <div class="dialog-content padded">
          <div>
            <span class="caption">Icon</span>
            <div class="icon-picker">
              <keep-icon-dropdown
                .iconName=${this.displayIconName}
                @icon-select=${this.handleIconSelect}
              ></keep-icon-dropdown>
            </div>
          </div>
          <div>
            <label class="caption" for="schema-description">Description</label>
            <textarea
              id="schema-description"
              class="textarea"
              .value=${live(this.desc)}
              @input=${this.handleDescriptionInput}
            ></textarea>
          </div>
          <div>
            <span class="caption">Configuration</span>
            <div class="config-container">
              ${this.renderToggle('DQL Access', !!buffer.dqlAccess, (event) =>
                this.handleToggle('dqlAccess', event),
              )}
              ${this.renderToggle('In $DATA Scope', !!buffer.openAccess, (event) =>
                this.handleToggle('openAccess', event),
              )}
              ${this.renderToggle('Enable Code', !!buffer.allowCode, (event) =>
                this.handleToggle('allowCode', event),
              )}
              ${this.renderToggle('Require Revision', !!buffer.requireRevisionToUpdate, (event) =>
                this.handleToggle('requireRevisionToUpdate', event),
              )}
              ${this.renderToggle(
                'Prevent Design Refresh',
                this.prohibitRefreshValue,
                this.handleProhibitRefreshToggle,
              )}
            </div>
          </div>
          <wa-input
            id="dql-formula"
            label="DQL Formula"
            .value=${live(this.dqlFormulaValue)}
            @input=${this.handleDqlFormulaInput}
          ></wa-input>
        </div>
        <div class="dialog-actions padded">
          <keep-button
            variant="neutral"
            appearance="outlined"
            @click=${() => {
              this.discardOpen = true;
            }}
            >Cancel</keep-button
          >
          <keep-button @click=${this.handleClickSave}>Save</keep-button>
        </div>
      </dialog>
    `;
  }

  private renderDiscardDialog() {
    return html`
      <dialog class="dialog discard" aria-label="Discard Changes?">
        <keep-form-dialog-header
          heading="Discard Changes?"
          @header-close=${() => {
            this.discardOpen = false;
          }}
        ></keep-form-dialog-header>
        <div class="dialog-content">
          <span class="dialog-content-text"
            >Are you sure you want to discard the changes you made?</span
          >
        </div>
        <div class="dialog-actions">
          <keep-button
            variant="neutral"
            appearance="outlined"
            @click=${() => {
              this.discardOpen = false;
            }}
            >No</keep-button
          >
          <keep-button @click=${this.clearEdits}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }

  render() {
    const schema = this.schemaData;
    const description = schema?.description ?? '';
    const long = description.length > DESCRIPTION_LIMIT;
    const usage = this.usage;

    return html`
      <div class="title">
        <span class="icon-container">
          <keep-app-icon
            class="schema-icon"
            name=${schema?.iconName ?? ''}
            alt="db-icon"
          ></keep-app-icon>
          <span class="status-icon">
            <keep-tooltip content=${usage} placement="bottom" without-arrow>
              <span
                class="status-dot ${this.isInUse ? 'in-use' : 'not-in-use'}"
                role="img"
                aria-label=${usage}
              ></span>
            </keep-tooltip>
          </span>
        </span>
        <span class="api-name">
          <span class="api-schema">${this.dbName}</span>
          <button
            class="edit-icon"
            type="button"
            aria-label="Edit Schema"
            @click=${() => {
              this.editOpen = true;
            }}
          >
            <wa-icon library=${FA_LIBRARY} name="pen-to-square" canvas="auto"></wa-icon>
          </button>
        </span>
        <span class="api-nsf">${schema?.nsfPath ?? ''}</span>
      </div>
      <hr class="rule" />
      <div class="information">
        <div class="heading-block">
          <span class="heading">Description</span>
          <div class="description">
            ${long && !this.viewMore ? `${description.slice(0, DESCRIPTION_LIMIT)}...` : description}
          </div>
          <div class="expander-row">
            ${long
              ? html`
                  <button
                    class="expander"
                    type="button"
                    aria-expanded=${this.viewMore ? 'true' : 'false'}
                    @click=${() => {
                      this.viewMore = !this.viewMore;
                    }}
                  >
                    ${this.viewMore ? 'View Less' : 'View More'}
                    <wa-icon
                      library=${FA_LIBRARY}
                      name=${this.viewMore ? 'chevron-up' : 'chevron-down'}
                      canvas="auto"
                    ></wa-icon>
                  </button>
                `
              : nothing}
          </div>
          <div class="view-buttons"></div>
        </div>
        <div class="heading-block">
          <span class="heading">File Path</span>
          <span class="description">${schema?.nsfPath ?? ''}</span>
        </div>
        <div class="heading-block">
          <span class="heading">Configuration</span>
          ${this.isConfigLoading
            ? html`<wa-spinner class="config-spinner" aria-hidden="true"></wa-spinner>`
            : this.renderSummary()}
        </div>
      </div>
      ${this.renderEditDialog()} ${this.renderDiscardDialog()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-details-section': DetailsSection;
  }
}
