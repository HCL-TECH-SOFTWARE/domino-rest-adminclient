/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { handleDatabaseAgents } from '../../store/databases/action';
import type { Database } from '../../store/databases/types';
import type {
  KeepAgentsTableAgent,
  KeepAgentsTableToggleDetail,
} from './keep-agents-table';
import type { KeepSearchChangeDetail } from './keep-search-input';
import './keep-agents-table';
import './keep-button';
import './keep-form-dialog-header';
import './keep-search-input';
import './keep-switch';

/**
 * The whole Agents tab of a schema: the filter box, the two bulk-activation controls, the
 * Show Active filter, the agents table and the "deactivate everything" confirmation.
 * Tag: `keep-agents-tab`. Exposed as `KeepAgentsTab` while `FormsContainer` is still React.
 *
 * ## Store access
 *
 * Two controllers, because this component owns the state outright: `FormsContainer` selects
 * `databasesOverview`, `updateSchemaError`, `scopes` and `styles.themeMode` and none of the
 * four values read here, so there is no parent copy for the React bridge to re-apply on
 * every render and fight with.
 *
 * The replaced component selected the databases slice twice over — once for
 * `agents`/`scopePull`, once for `activeAgents` — which is one subscription's worth of
 * information split across two hook calls. It is one controller here. The second reads
 * `dialog.loading` as a primitive rather than the slice, so an unrelated dialog flag moving
 * does not re-render the table.
 *
 * ## Two derived lists, not two pieces of state
 *
 * The original kept `lists` (all agents, or only the active ones) in state and rebuilt it
 * from an effect, and kept `filtered` in state and rebuilt it on each keystroke. Both are
 * pure functions of the store plus {@link showActive} / {@link searchKey}, so both are
 * getters here. That also retires a real staleness bug: `filtered` was a snapshot taken
 * when the key was typed, so an activation arriving from the server while a search was
 * showing left the list rendering records the store had already replaced.
 *
 * What is deliberately *not* changed: a non-empty search key is matched against **all**
 * agents, so searching ignores the Show Active filter, and the search results are left in
 * store order while the unfiltered list is sorted by name. Both are the original's
 * behaviour and both look like oversights; changing them belongs in a change that says so.
 *
 * ## Styling
 *
 * Everything the replaced markup drew came from the light DOM and therefore stops at this
 * shadow boundary: the `TopNavigator` and `ButtonsPanel` blocks in the source file and
 * `styles/layout`, the `.flex-container` rule that lived in `FormsContainer`'s own block,
 * the `.dialog*` and `.short-vertical` classes in `styles/styles.css`, the box-sizing
 * reset, and the button styling the component library injected for the two bulk controls.
 * All of it is restated below, reading tokens rather than literals so it stays mode-aware.
 *
 * ## Accessibility (#713)
 *
 * - The two bulk controls are real buttons with `type="button"`, disabled through the
 *   attribute rather than through a class that only greyed the text. Previously a
 *   `disabled` class and a `disabled` prop were kept in step by hand.
 * - The confirmation is named and described for assistive tech. `aria-label` rather than
 *   `aria-labelledby`, because the heading lives in `keep-form-dialog-header`'s shadow root
 *   and an IDREF cannot cross a shadow boundary.
 * - The body copy was a `text` element — an SVG tag in an HTML document, so the browser
 *   treated it as an unknown inline element. It is a paragraph now.
 * - Escape is handled: the native `cancel` event puts the flag back, so the dialog cannot
 *   be dismissed into a state where the component still believes it is open.
 */
@customElement('keep-agents-tab')
export default class AgentsTab extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      :host {
        display: block;
      }

      /*
       * The page's border-box reset arrives through a universal selector in Web Awesome's
       * native layer, and a universal selector does not cross a shadow boundary.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /* was TopNavigator, styles/layout */
      .top-navigator {
        display: flex;
        padding: 25px 0;
        gap: 10px;
      }

      /* was ButtonsPanel */
      .buttons-panel {
        height: 60px;
        margin: auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-content: center;
      }

      /*
       * The two bulk controls were components from the React component library, so their
       * metrics — the type ramp, the compact padding, the rounded hit area, the flat
       * background — were injected into the document and reach nothing in here. Restated,
       * and the text-transform the originals overrode is simply not set.
       */
      .text-button {
        font: inherit;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.75;
        letter-spacing: 0.02857em;
        min-width: 64px;
        padding: 6px 8px;
        border: 0;
        border-radius: var(--wa-border-radius-s);
        background-color: transparent;
        cursor: pointer;
      }

      .text-button:hover:not(:disabled) {
        background-color: var(--wa-color-neutral-fill-quiet);
      }

      /*
       * The originals had no focus indicator of their own beyond the ripple the library
       * drew, which is not one. WCAG 2.4.7.
       */
      .text-button:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * The green and the red were literals (a dark green and a crimson) repeated across
       * the Forms, Views and Agents tabs. These are the measured, mode-aware equivalents
       * that keep-theme.css pins to the ramp step clearing AA on each surface — see the
       * contrast table there. A literal would have kept the dark-green text on the dark
       * page background it currently sits on.
       */
      .activate {
        color: var(--keep-color-success-text);
        padding: 0 10px 0 0;
      }

      .deactivate {
        color: var(--keep-color-danger-text);
        padding: 0 0 0 10px;
      }

      /*
       * was the .disabled class the render toggled alongside the disabled prop. Keyed off
       * the real state now, so the two cannot disagree.
       */
      .text-button:disabled {
        color: var(--wa-color-text-quiet);
        cursor: default;
      }

      /*
       * .short-vertical from styles/styles.css — the separator rule between the two
       * controls — plus the three adjustments the replaced block scoped to this screen: it
       * is a div where a glyph used to be, so it rejoins the inline flow, and the shared
       * 31px height is taller than these buttons so the glyph's own height wins.
       */
      .short-vertical {
        width: 1px;
        background-color: var(--wa-color-text-loud);
        display: inline-block;
        vertical-align: middle;
        height: 1.4em;
      }

      /* was .flex-container, from the block in FormsContainer */
      .flex-container {
        display: flex;
      }

      /*
       * was the .dialog pair in styles/styles.css. Its border was a light/dark literal
       * pair whose light half was transparent; the surface-border token is what the
       * converted dialogs beside this one already read.
       */
      dialog {
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        width: 30%;
        height: fit-content;
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
        flex-direction: column;
        gap: 30px;
        display: none;
      }

      dialog[open] {
        display: flex;
      }

      /* was .dialog-content */
      .dialog-content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      /* was .dialog-content-text, with margin: 0 because this is a paragraph now. */
      .dialog-content p {
        color: var(--text-color-primary);
        margin: 0;
      }

      /* was .dialog-actions */
      .dialog-actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-content: center;
        align-items: center;
      }
    `,
  ];

  /** The schema whose agents these are. Rewritten by the activation thunk. */
  @property({ attribute: false }) accessor schemaData: Database | undefined;

  /** The database the schema belongs to, as the route spells it. */
  @property({ type: String, attribute: 'db-name' }) accessor dbName = '';

  /** The filter text, verbatim as typed. Empty means "no filter". */
  @state() accessor searchKey = '';

  /** Whether the list is narrowed to the agents that are switched on. */
  @state() accessor showActive = false;

  /** Whether the "deactivate everything" confirmation is showing. */
  @state() accessor confirmingReset = false;

  private readonly databases = new StoreController(this, (state) => state.databases);

  private readonly loading = new StoreController(this, (state) => state.dialog.loading);

  /**
   * The open state last pushed to the native dialog.
   *
   * `updated()` runs on every render, so without an edge trigger an unrelated re-render
   * would re-issue `showModal()` — which throws `InvalidStateError` on a dialog that is
   * already open. Tracking the last applied value also means the open path only ever runs
   * on a false-to-true transition, which is why it needs no second guard of its own.
   */
  private appliedOpen = false;

  /** All agents, or only the active ones — what the Show Active switch selects. */
  private get lists(): KeepAgentsTableAgent[] {
    const { agents, activeAgents } = this.databases.value;
    return this.showActive ? activeAgents : agents;
  }

  /** What the table is handed: the sorted list, or the search hits. */
  private get rows(): KeepAgentsTableAgent[] {
    if (this.searchKey === '') {
      return [...this.lists].sort((a, b) => (a.agentName > b.agentName ? 1 : -1));
    }
    const key = this.searchKey.toLowerCase();
    return this.databases.value.agents.filter(
      (agent: KeepAgentsTableAgent) =>
        agent.agentName && agent.agentName.toLowerCase().indexOf(key) !== -1,
    );
  }

  /** No list to act on, or a save is already in flight. */
  private get bulkDisabled(): boolean {
    return this.lists.length === 0 || this.loading.value;
  }

  private handleSearch(event: CustomEvent<KeepSearchChangeDetail>): void {
    this.searchKey = event.detail.value;
  }

  /**
   * Bound as a field rather than declared as a method, and that is load-bearing.
   *
   * `keep-switch` takes its callback as a property and invokes it from its *own* template,
   * so Lit calls it with `keep-switch` as the receiver. A plain method would therefore
   * toggle a property on the switch instead of on this element.
   */
  private readonly toggleShowActive = (): void => {
    this.showActive = !this.showActive;
  };

  private save(agents: KeepAgentsTableAgent[], active: boolean): void {
    const { schemaData } = this;
    // The thunk posts the whole schema back, so without one there is nothing to send. The
    // parent always passes it; returning is what keeps a missing prop from throwing.
    if (!schemaData) return;
    const slice = this.databases.value;
    this.databases.dispatch(
      handleDatabaseAgents(
        agents,
        slice.activeAgents,
        this.dbName,
        schemaData,
        active,
        slice.agents,
      ),
    );
  }

  private handleActivate(event: CustomEvent<KeepAgentsTableToggleDetail>): void {
    this.save([event.detail.agent], true);
  }

  private handleDeactivate(event: CustomEvent<KeepAgentsTableToggleDetail>): void {
    this.save([event.detail.agent], false);
  }

  private activateAll(): void {
    this.save(this.databases.value.agents, true);
  }

  private askReset(): void {
    this.confirmingReset = true;
  }

  private cancelReset(): void {
    this.confirmingReset = false;
  }

  private deactivateAll(): void {
    this.save(this.databases.value.agents, false);
    this.confirmingReset = false;
  }

  protected updated(): void {
    if (this.confirmingReset === this.appliedOpen) return;
    this.appliedOpen = this.confirmingReset;
    // Rendered unconditionally, and this runs after the render that put it there.
    const dialog = this.shadowRoot!.querySelector('dialog')!;
    if (this.confirmingReset) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }

  render() {
    const disabled = this.bulkDisabled;
    return html`
      <div class="top-navigator">
        <!-- No value property: the field is deliberately uncontrolled, see
             keep-search-input. -->
        <keep-search-input
          placeholder="Search Agents"
          ?disabled=${!this.databases.value.scopePull}
          @search-change=${this.handleSearch}
        ></keep-search-input>
      </div>
      <div class="buttons-panel">
        <div role="group" aria-label="All agents">
          <button
            type="button"
            class="text-button activate"
            ?disabled=${disabled}
            @click=${this.activateAll}
          >
            Activate All
          </button>
          <div class="short-vertical" aria-hidden="true"></div>
          <button
            type="button"
            class="text-button deactivate"
            ?disabled=${disabled}
            @click=${this.askReset}
          >
            Deactivate All
          </button>
        </div>
        <keep-switch .onToggle=${this.toggleShowActive}>Show Active</keep-switch>
      </div>
      <div class="flex-container">
        <keep-agents-table
          .agents=${this.rows}
          @agent-activate=${this.handleActivate}
          @agent-deactivate=${this.handleDeactivate}
        ></keep-agents-table>
      </div>
      <dialog
        aria-label="Reset ALL Agents?"
        aria-describedby="reset-agents-message"
        @cancel=${this.cancelReset}
      >
        <keep-form-dialog-header
          heading="Reset ALL Agents?"
          @header-close=${this.cancelReset}
        ></keep-form-dialog-header>
        <div id="reset-agents-message" class="dialog-content">
          <p>Deactivate all database agents?</p>
        </div>
        <div class="dialog-actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.cancelReset}>
            No
          </keep-button>
          <keep-button @click=${this.deactivateAll}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-agents-tab': AgentsTab;
  }
}
