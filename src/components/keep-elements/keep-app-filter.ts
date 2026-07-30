/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/radio-group/radio-group.js';
import '@awesome.me/webawesome/dist/components/radio/radio.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { toggleAppFilterDrawer } from '../../store/drawer/action';
import { fetchMyApps } from '../../store/applications/action';
import './keep-drawer';
import './keep-button';

/** The value every filter starts at, and the value Reset returns it to. */
const ALL = 'All';

/** The two things this drawer filters on. Keys match the table's own state names. */
export type KeepAppFilterKey = 'status' | 'appSecret';

/** Payload of {@link AppFilter}'s `filter-change` event — one entry per section. */
export interface KeepAppFilterChangeDetail {
  /** `All` | `Active` | `Inactive`. */
  status: string;
  /** `All` | `App secret` | `App secret generated` | `App secret not generated` | `PKCE`. */
  appSecret: string;
}

interface FilterSection {
  readonly key: KeepAppFilterKey;
  readonly label: string;
  readonly options: readonly string[];
}

/**
 * The sections, in the order the original listed them. Both were a Material radio group
 * whose options were spelled out one component at a time; the strings are the same, and
 * `AppsTable`'s two `switch` statements still match on them verbatim.
 */
const SECTIONS: readonly FilterSection[] = [
  { key: 'status', label: 'Status', options: [ALL, 'Active', 'Inactive'] },
  {
    key: 'appSecret',
    label: 'Authentication method',
    options: [ALL, 'App secret', 'App secret generated', 'App secret not generated', 'PKCE'],
  },
];

/**
 * The Applications list's filter drawer. Tag: `keep-app-filter`. Exposed to React as
 * `KeepAppFilter`.
 *
 * Replaces `applications/AppFilterContainer.tsx`. Two radio groups, a footer of three
 * buttons, and the rule that nothing the user picks reaches the table until they press
 * **Show Results**.
 *
 * ## Where the state lives, and why it is split
 *
 * The *applied* filters belong to `AppsTable`: it holds them, it filters its rows with them,
 * and it is still a React component this wave. They arrive here as {@link status} and
 * {@link appSecret}, and a decision leaves as `filter-change`. Putting a store subscription
 * for them in this leaf would fight the wrapper, which re-applies every declared property on
 * every parent render with no dirty check.
 *
 * The *drawer flag* is the opposite case: no surviving parent selects `drawer.appFilterDrawer`
 * — `Kanban.tsx` only dispatches the toggle that opens it — so this element owns it outright
 * through a {@link StoreController}. The selector reads the boolean rather than the slice, so
 * `Object.is` change detection is exact instead of re-rendering on every unrelated store move.
 *
 * The *draft* is neither: it is the in-drawer edit, kept in {@link draft} until applied.
 *
 * ## Cancel now cancels (behaviour change)
 *
 * The original seeded its draft with `useState(status)`, which runs once. Since the container
 * was rendered unconditionally and merely hidden, the draft was never re-seeded — so pressing
 * **Cancel** left the abandoned edit sitting in the radio buttons, and re-opening the drawer
 * showed a selection that did not describe the list behind it. The draft is re-seeded from the
 * applied values on each *open* here, which is the pattern the consents filter already used
 * for its scope list, and which makes Cancel mean what it says.
 *
 * ## Closing the drawer by escape or overlay
 *
 * Also new, also a fix. The React version passed no close handler, so dismissing the drawer
 * with Escape or a click outside hid the panel while leaving `appFilterDrawer` true in the
 * store — after which the Filter button toggled it to false and appeared to do nothing. The
 * hide handler here reconciles the flag, and is guarded so the close *we* initiate does not
 * toggle it straight back on.
 *
 * ## Accessibility
 *
 * Each section heading is now the radio group's own label rather than a loose `span`, so the
 * groups have accessible names and the native `fieldset`/`role=radiogroup` relationship that
 * the Material version rendered without. Opening the drawer moves focus into the first group
 * — the original tried to and could not: the ref it focused was never attached to an element,
 * so it was always null.
 *
 * ## What the shadow boundary cost
 *
 * All of it. Four Linaria blocks (`DrawerFormContainer`, `FilterContainer`, `Section`,
 * `ButtonsContainer`) and eight utility classes from `styles.css` reached these nodes through
 * the light DOM as class selectors, and a class selector does not cross a shadow boundary.
 * They are restated below, reading `--wa-*` custom properties — which do cross, and stay
 * mode-aware — wherever the original used a literal.
 */
@customElement('keep-app-filter')
export default class AppFilter extends KeepElement {
  static styles = css`
    /*
     * The page's border-box reset is a universal selector in WebAwesome's wa-native layer,
     * and a universal selector does not cross a shadow boundary. Without it the divider's
     * padding would be added to its height rather than counted inside it.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: contents;
    }

    /* DrawerFormContainer, plus the w-35vw utility that every call site passed with it. */
    .drawer-form {
      display: flex;
      flex-direction: column;
      width: 35vw;
      height: 100%;
      max-height: 100vh;
      overflow: hidden;
    }

    @media only screen and (max-width: 768px) {
      .drawer-form {
        width: 100vw;
      }
    }

    /* FilterContainer. Its .title rule is dropped: nothing in the markup ever had it. */
    .filter {
      display: flex;
      flex-direction: column;
      padding: 20px;
      gap: 10px;
    }

    /* Section. Its .header, .text, .toggle-area and .scope-group rules are dropped for the
       same reason — they belong to the consents filter, which shares the block verbatim. */
    .section {
      padding-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /*
     * The heading was a span carrying the big-text utility, i.e. 18px at the inherited
     * weight. It is the group's label now, and WebAwesome's default label weight is
     * semibold, so the weight is restated to keep the heading looking as it did. The
     * bottom margin is WebAwesome's own 0.5em pinned to the 10px the Section gap gave it.
     */
    wa-radio-group::part(form-control-label) {
      font-size: 18px;
      font-weight: var(--wa-font-weight-normal);
      margin-block-end: 10px;
    }

    /*
     * The radio-group utility: display flex, gap 0, padding 0. Material's own FormGroup
     * supplied the column direction, which is WebAwesome's default orientation.
     */
    wa-radio-group::part(form-control-input) {
      gap: 0;
      padding: 0;
    }

    /*
     * The divider was an hr carrying divider, pt-5, pb-10, mb-10 and no-background. The
     * visible line is not the utility's own background — no-background is declared later in
     * the sheet and cancels it — but the border-bottom WebAwesome's wa-native layer puts on
     * every hr, which is a bare element selector and so does not cross the boundary either.
     * Restated with the same token, which keeps it mode-aware.
     */
    .divider {
      width: 100%;
      height: 1px;
      padding: 5px 0 10px;
      margin: 0 0 10px;
      border: none;
      border-bottom: solid var(--wa-border-width-s) var(--wa-color-surface-border);
      background: none;
    }

    /* ButtonsContainer. */
    .buttons {
      display: flex;
      justify-content: flex-end;
      padding-top: 20px;
      gap: 20px;
    }
  `;

  /**
   * The status filter the table is currently applying: `All`, `Active` or `Inactive`.
   *
   * An input only. It seeds {@link draft} when the drawer opens; it is never written from
   * in here, because the table owns it.
   */
  @property({ type: String }) accessor status = ALL;

  /**
   * The authentication-method filter the table is currently applying. Same contract as
   * {@link status}.
   */
  @property({ type: String, attribute: 'app-secret' }) accessor appSecret = ALL;

  /** The in-drawer edit, discarded by Cancel and published by Show Results. */
  @state() accessor draft: KeepAppFilterChangeDetail = { status: ALL, appSecret: ALL };

  /**
   * The drawer flag. A primitive rather than the `drawer` slice, so the controller's
   * `Object.is` check is exact and an unrelated drawer opening does not re-render this one.
   */
  private readonly drawer = new StoreController(this, (state) => state.drawer.appFilterDrawer);

  /** Previous flag, so {@link willUpdate} sees the edge rather than the level. */
  private wasOpen = false;

  /**
   * Re-seed the draft, and move focus, on the edge where the drawer opens.
   *
   * Two things about the shape. The comparison is explicit rather than a
   * `changedProperties.has(…)` because the flag arrives through a `StoreController`, which
   * drives re-renders with a bare `requestUpdate()` and so puts nothing in the
   * changed-properties map. And it runs in `willUpdate` rather than `updated` because
   * seeding the draft *is* a property set: done after the render it would schedule a second
   * one (Lit says so, loudly, in dev mode), where here it folds into the render already in
   * flight. Focus still lands after it — `focusFirstField` awaits `updateComplete`, which at
   * this point is the promise for that same in-flight update.
   */
  protected willUpdate(): void {
    if (this.wasOpen === this.drawer.value) return;
    this.wasOpen = this.drawer.value;
    if (!this.wasOpen) return;
    this.draft = { status: this.status, appSecret: this.appSecret };
    void this.focusFirstField();
  }

  /**
   * Move focus to the first radio group, as opening the drawer does.
   *
   * Public so a Lit parent can re-focus the drawer without reaching into the shadow root.
   * WebAwesome's own `focus()` picks the checked radio if there is one and the first enabled
   * radio otherwise, which is the correct arrival point either way.
   */
  async focusFirstField(): Promise<void> {
    await this.updateComplete;
    this.renderRoot.querySelector('wa-radio-group')?.focus();
  }

  /**
   * A radio group's `change` is a native event: it bubbles and it is composed, so without
   * this it would cross the boundary and land in the host page as an anonymous change with
   * no useful target. `filter-change` is this element's whole outbound contract.
   */
  private _handleSectionChange(event: Event, key: KeepAppFilterKey): void {
    event.stopPropagation();
    const { value } = event.target as HTMLElement & { value: string | null };
    this.draft = { ...this.draft, [key]: value ?? ALL };
  }

  /** The `input` that precedes each `change`, stopped for the same reason. */
  private _stopBubble(event: Event): void {
    event.stopPropagation();
  }

  /** Show Results: refresh the list, publish the draft, close. */
  private _apply(): void {
    this.drawer.dispatch(fetchMyApps());
    this.emit<KeepAppFilterChangeDetail>('filter-change', { ...this.draft });
    this.drawer.dispatch(toggleAppFilterDrawer());
  }

  /**
   * Reset: clear both filters and close. It deliberately does *not* refetch — the original
   * did not either, and the table re-filters the apps it already has.
   */
  private _reset(): void {
    const cleared: KeepAppFilterChangeDetail = { status: ALL, appSecret: ALL };
    this.draft = cleared;
    this.emit<KeepAppFilterChangeDetail>('filter-change', { ...cleared });
    this.drawer.dispatch(toggleAppFilterDrawer());
  }

  /** Cancel: close and publish nothing. The draft is re-seeded on the next open. */
  private _close(): void {
    this.drawer.dispatch(toggleAppFilterDrawer());
  }

  /**
   * Escape, the overlay and the drawer's own close button all end here. Guarded, because
   * the drawer also finishes hiding after {@link _apply}, {@link _reset} and
   * {@link _close} have already cleared the flag — toggling again would re-open it.
   */
  private _handleHide(): void {
    if (this.drawer.value) this._close();
  }

  private _renderSection(section: FilterSection) {
    return html`
      <section class="section">
        <wa-radio-group
          label=${section.label}
          size="s"
          .value=${this.draft[section.key]}
          @change=${(event: Event) => this._handleSectionChange(event, section.key)}
          @input=${this._stopBubble}
        >
          ${section.options.map(
            (option) => html`<wa-radio value=${option}>${option}</wa-radio>`,
          )}
        </wa-radio-group>
      </section>
    `;
  }

  render() {
    return html`
      <keep-drawer label="Filter" ?open=${this.drawer.value} .closeFn=${() => this._handleHide()}>
        <div class="drawer-form">
          <div class="filter">
            ${SECTIONS.map(
              (section, index) => html`
                ${index === 0 ? nothing : html`<hr class="divider" />`}${this._renderSection(
                  section,
                )}
              `,
            )}
            <hr class="divider" />
            <div class="buttons">
              <keep-button variant="neutral" appearance="outlined" @click=${() => this._reset()}>
                Reset
              </keep-button>
              <keep-button variant="danger" @click=${() => this._close()}>Cancel</keep-button>
              <keep-button @click=${() => this._apply()}>Show Results</keep-button>
            </div>
          </div>
        </div>
      </keep-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-app-filter': AppFilter;
  }
}
