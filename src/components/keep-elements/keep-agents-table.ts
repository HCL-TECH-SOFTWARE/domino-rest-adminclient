/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import './keep-activate-switch';
import './keep-data-table';
import './keep-tooltip';
import { TABLE_STYLE_TEXT } from './keep-data-table.styles';
import { FA_LIBRARY } from '../../services/icon-library';

/**
 * One row: a database agent, in the shape `databases.agents` holds it.
 *
 * The index signature is deliberate. The record travels straight back out through
 * {@link KeepAgentsTableToggleDetail} to `handleDatabaseAgents`, which wants the whole
 * object — this element must not narrow it on the way through.
 */
export interface KeepAgentsTableAgent {
  agentActive: boolean;
  agentAlias: string[];
  agentName: string;
  agentUnid: string;
  [extra: string]: unknown;
}

/** `event.detail` of both `agent-activate` and `agent-deactivate`. */
export interface KeepAgentsTableToggleDetail {
  /** The row's record, by reference. */
  agent: KeepAgentsTableAgent;
}

/** What the Status column means: the tooltip copy, verbatim. */
const STATUS_HELP = 'Activate the Agents that should be accessible\nvia rest API';

/**
 * The agents list on a schema's Agents tab. Tag: `keep-agents-table`.
 *
 * Two columns — the agent's name, and the Active/Inactive pill that turns REST access on.
 * Presentational: `TabAgents` owns the list, the filtering and the activation thunks, so
 * this takes {@link agents} as a property and reports a toggle back as `agent-activate` /
 * `agent-deactivate`.
 *
 * ## Store access
 *
 * None here. `TabAgents` already selects `databases` and `dialog` for its own header
 * controls and hands the rows down, so a subscription in this leaf would fight the React
 * bridge, which re-applies every property on every parent render with no dirty check. The
 * one piece of store state the screen still reads at this depth — `dialog.loading`, which
 * blocks a toggle mid-save — is read by `keep-activate-switch` itself, which owns it.
 *
 * ## Rows are keyed, and that is load-bearing
 *
 * `repeat()` on `agentName`, not a plain `map()`. `keep-activate-switch` snapshots
 * `agentActive` into its own state on its first update and never reads the record again
 * (an activation is optimistic and is never awaited). Positional reuse would therefore
 * leave a pill showing the state of whichever agent occupied that row when the switch was
 * created — visible the moment the list is filtered or the "Show Active" toggle flips. The
 * replaced markup keyed its rows on the same field for the same reason.
 *
 * ## The switch is rendered directly
 *
 * No React bridge in between: this is a Lit parent, so the element module is imported for
 * its registration side effect and the tag is written into the template. Its two events are
 * stopped here rather than allowed to keep bubbling — they are this element's internals,
 * and the record leaves under a name that says which table it came from.
 *
 * ## Styling
 *
 * The `<table>` is rendered here and slotted into `keep-data-table`, so it sits in *this*
 * element's shadow root. Two document-level sheets that style it today stop at that
 * boundary and are restated below: `keep-data-table`'s own slotted-table sheet, adopted
 * from the single exported string rather than copied, and Web Awesome's `wa-native` layer,
 * which reaches tables, rows and cells through bare element selectors.
 *
 * ## Accessibility (#713)
 *
 * Three defects were carried in by the original and are fixed here rather than preserved:
 *
 *  - the table announced itself as the "views and agents table". It is the agents table;
 *    the string was copied to all three of these screens and named none of them (4.1.2).
 *  - neither header cell said which axis it headed. Both are `scope="col"` now (1.3.1).
 *  - the Status tooltip was reachable by pointer only, and its copy was in the
 *    accessibility tree nowhere at all: `keep-tooltip` builds its popup imperatively and
 *    never points an `aria-describedby` at it. The copy is now also in a visually hidden
 *    node that the header cell is described by, and the trigger takes focus so the popup
 *    itself appears for a keyboard user (1.4.13, 4.1.2). The glyph stays presentational —
 *    with the description in place, labelling it too would say the same sentence twice.
 *
 * That hidden node sits outside the `<table>` on purpose. Inside the header cell it would
 * join the cell's text, and the column would announce its whole help sentence as its name
 * on every row of the table. `aria-describedby` resolves within one tree, and the shadow
 * root is that tree, so the reference reaches it where it is.
 *
 * @fires agent-activate - `CustomEvent<KeepAgentsTableToggleDetail>`
 * @fires agent-deactivate - `CustomEvent<KeepAgentsTableToggleDetail>`
 */
@customElement('keep-agents-table')
export default class AgentsTable extends KeepElement {
  static styles = [
    unsafeCSS(TABLE_STYLE_TEXT),
    css`
      :host {
        display: block;
      }

      /*
       * The page's border-box reset is Web Awesome's wa-native layer: html{border-box}
       * plus a universal box-sizing:inherit. Neither a universal selector nor a bare
       * element selector crosses a shadow boundary, so without this the name column would
       * measure 550px *plus* the 60px of horizontal padding the slotted-table sheet gives
       * every cell.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * The rest of wa-native's table region, restated for the same reason. The sheet
       * adopted above already carries width, border-collapse, cell padding and text
       * alignment; these are the declarations nothing else supplies, and each one is on
       * the screen today:
       *
       *  - the hairline rule above every body row (the token resolves at :root, so it
       *    still reads correctly in both themes from in here);
       *  - cell content aligned to the top of a row whose height is set by the 34px pill
       *    beside it, rather than centred against it;
       *  - header cells one step down the type ramp from the body cells. The token is
       *    relative to 1em, and font-size inherits across the boundary, so it resolves to
       *    the same pixel value here as it did in the light DOM.
       *
       * The table's own padding came from the p-30 utility. It is restated so that this
       * conversion is not what changes it, but it draws nothing either way: CSS 2.2
       * 17.6.2 ignores a table element's padding in the collapsing border model, which is
       * the model the adopted sheet puts this table in.
       */
      table {
        font-variant-numeric: tabular-nums;
        padding: 30px;
        width: 100%;
      }

      tbody tr {
        border-block-start: var(--wa-border-style) var(--wa-border-width-s)
          var(--wa-color-border-quiet);
      }

      th,
      td {
        vertical-align: top;
      }

      thead th {
        font-size: var(--wa-font-size-smaller);
      }

      /* Was a width attribute on the name column's header and body cells. */
      .col-name {
        width: auto;
      }

      /* Push the status column to the right edge, matching the Views table layout. */
      .col-status {
        width: 1%;
        white-space: nowrap;
      }

      /*
       * AgentNameHeader and AgentNameDisplay, which were the same rule twice over. The
       * text-transform came from the body cell only and is inert — nothing in scope
       * uppercases any more — but it is one declaration and dropping it silently is how a
       * conversion acquires a difference nobody can point at.
       */
      .agent-name {
        margin-left: 20px;
        text-transform: none;
      }

      /*
       * StatusHeader. Its third rule, the one selecting a div inside a div inside the
       * header, is not carried over as written because it had stopped matching: it wants
       * a div that is a grandchild of the header, and once the tooltip became a custom
       * element the trigger sat one level deeper than that. The intent is obvious and is
       * what the rule is spelled as here, on the trigger itself — so the glyph is centred
       * against its label rather than sitting on the baseline. That is the one deliberate
       * visual change in this file.
       *
       * The block's remaining rule set a white background and a text-color property on a
       * tooltip class. Dropped: no node in this markup ever carried that class, and
       * text-color is not a CSS property at all. Reproducing it would have meant
       * introducing a hard-coded white into an element that otherwise reads entirely from
       * tokens.
       */
      .status-header {
        cursor: default;
      }

      .status-trigger {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      /* The trigger is a tab stop now, so it needs to show that it has focus. */
      .status-trigger:focus-visible {
        border-radius: var(--wa-border-radius-s);
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * Clipped rather than display:none, which would take the description out of the
       * accessibility tree along with the pixels.
       */
      .visually-hidden {
        block-size: 1px;
        border: 0;
        clip-path: inset(50%);
        inline-size: 1px;
        margin: 0;
        overflow: hidden;
        padding: 0;
        position: absolute;
        white-space: nowrap;
      }
    `,
  ];

  /** The agents to list, in display order. Owned by the parent. */
  @property({ attribute: false }) accessor agents: KeepAgentsTableAgent[] = [];

  private handleToggle(agent: KeepAgentsTableAgent, activate: boolean, event: Event): void {
    // The switch's own events are composed, so without this they would cross this shadow
    // boundary too and the consumer would hear every toggle twice.
    event.stopPropagation();
    this.emit<KeepAgentsTableToggleDetail>(activate ? 'agent-activate' : 'agent-deactivate', {
      agent,
    });
  }

  private renderRow(agent: KeepAgentsTableAgent) {
    return html`
      <tr>
        <td class="col-name"><div class="agent-name">${agent.agentName}</div></td>
        <td class="col-status">
          <keep-activate-switch
            .view=${agent}
            type="agent"
            @toggle-active=${(event: Event) => this.handleToggle(agent, true, event)}
            @toggle-inactive=${(event: Event) => this.handleToggle(agent, false, event)}
          ></keep-activate-switch>
        </td>
      </tr>
    `;
  }

  render() {
    return html`
      <keep-data-table zebra>
        <table aria-label="agents table">
          <thead>
            <tr>
              <th class="col-name" scope="col"><div class="agent-name">Agent Name</div></th>
              <th class="col-status" scope="col" aria-describedby="status-help">
                <div class="status-header">
                  <keep-tooltip content=${STATUS_HELP} placement="bottom" without-arrow>
                    <div class="status-trigger" tabindex="0">
                      <span>Status</span>
                      <wa-icon
                        library=${FA_LIBRARY}
                        name="circle-question"
                        canvas="auto"
                      ></wa-icon>
                    </div>
                  </keep-tooltip>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            ${repeat(
              this.agents,
              (agent) => agent.agentName,
              (agent) => this.renderRow(agent),
            )}
          </tbody>
        </table>
      </keep-data-table>
      <span id="status-help" class="visually-hidden">${STATUS_HELP}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-agents-table': AgentsTable;
  }
}
