/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/radio-group/radio-group.js';
import '@awesome.me/webawesome/dist/components/radio/radio.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import type { Consent } from '../../store/consents/types';
import './keep-filter-drawer';
import './keep-checkbox';
import './keep-input-date';

/** The value the two expiry filters and the status filter start at. */
const ALL = 'All';

/** One expiry filter: a mode, and the day it compares against when the mode is `Custom`. */
export interface KeepConsentFilterExpiry {
  /** `All` | `None` | `Custom`. `ConsentsTable` switches on these strings verbatim. */
  expiration: string;
  /** Only read when {@link expiration} is neither `All` nor `None`. */
  date: Date;
}

/** Payload of {@link ConsentFilter}'s `filter-change` event — the whole applied filter. */
export interface KeepConsentFilterChangeDetail {
  /** `All` | `Active`. */
  status: string;
  /** Show only consents whose `client_id` resolves to a named application. */
  showWithApps: boolean;
  /** When the authorisation code expires. */
  expiration: KeepConsentFilterExpiry;
  /** When the refresh token expires. */
  tokenExpiration: KeepConsentFilterExpiry;
  /** OAuth scopes to keep. Empty means every scope. */
  scopes: string[];
}

/**
 * A date field speaks ISO `YYYY-MM-DD` in *local* time, but the one-argument `Date`
 * constructor parses that same string as **UTC** — which lands on the previous day anywhere
 * west of Greenwich. Both helpers therefore go through the local year/month/day components
 * rather than through an ISO round trip.
 */
const dateValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDateValue = (value: string, fallback: Date) => {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : fallback;
};

/** The distinct scopes across every consent, in first-seen order. */
const collectScopes = (consents: readonly Pick<Consent, 'scope'>[]): string[] =>
  Array.from(new Set(consents.flatMap((consent) => consent.scope.split(','))));

/**
 * The OAuth consents list's filter drawer. Tag: `keep-consent-filter`.
 *
 * Replaces `consents/ConsentFilterContainer.tsx`. Five sections — status, whether the consent
 * names an application, two expiry filters and the set of scopes — over the shared
 * {@link ../keep-filter-drawer} shell, with the same rule as its sibling: nothing the user
 * picks reaches the table until they press **Show Results**.
 *
 * ## Where the state lives, and why it is split
 *
 * The *applied* filter belongs to `keep-consents-table`, which holds it and filters its rows
 * with it. It arrives here as {@link status}, {@link showWithApps}, {@link expiration},
 * {@link tokenExpiration} and {@link scopes}, and a decision leaves as `filter-change`. The
 * table also owns the consent records, so the scope checkboxes are built from
 * {@link consents} rather than from a second subscription to the same slice.
 *
 * The *drawer flag* is the opposite case: no surviving parent selects `drawer.consentsDrawer`
 * — `Consents.tsx` only dispatches the toggle that opens it — so this element owns it
 * outright through a {@link StoreController} reading the boolean rather than the slice, so
 * change detection is exact instead of firing on every unrelated store move.
 *
 * The *draft* is neither: it is the in-drawer edit, kept in {@link draft} until applied.
 *
 * ## Four differences from the original, all deliberate
 *
 * 1. **The panel is the shared one.** It was a Material `Drawer` with a hand-rolled close
 *    glyph and a bold "Filter" caption inside the scroll area. The shell's drawer supplies
 *    both — a labelled header with a close button that Escape and the overlay also reach —
 *    so the glyph and the caption are gone rather than duplicated.
 * 2. **Cancel now cancels.** The original seeded four of its five drafts with a hook that
 *    runs once, and the container was rendered unconditionally and merely hidden, so a
 *    cancelled edit stayed in the controls and described a list it had not filtered. The
 *    whole draft is re-seeded from the applied values on each *open* — which is what the
 *    original already did for its scope list alone.
 * 3. **Dismissing the drawer reconciles the flag.** The original passed the *toggle* as its
 *    `onClose`, so a dismissal from a state the store disagreed with flipped it the wrong
 *    way. The handler here only closes when the flag says it is open.
 * 4. **Two pieces of dead code are dropped**: a `useEffect` duplicated verbatim, and a
 *    `setReset` prop that no line of the component ever called.
 *
 * ## Accessibility
 *
 * Each radio section heading is now the group's own label rather than a loose span, so the
 * groups have accessible names and the native radiogroup relationship the Material version
 * rendered without. The scope checkboxes label themselves — the scope was a sibling span
 * before, so every one of them was an unnamed control — and they are wrapped in a group named
 * by the same heading the sighted user reads. Opening the drawer moves focus into the first
 * group; the original tried to and could not, because the ref it focused was attached to no
 * element and was therefore always null.
 *
 * @fires filter-change - `CustomEvent<KeepConsentFilterChangeDetail>`
 */
@customElement('keep-consent-filter')
export default class ConsentFilter extends KeepElement {
  static styles = css`
    /*
     * The page's border-box reset is a universal selector in WebAwesome's wa-native layer,
     * and a universal selector does not cross a shadow boundary. The shell restates it for
     * the panel; these sections are in *this* root, so they need it here too.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: contents;
    }

    /*
     * Every section heading was a span carrying big-text, m-0 and p-0 — 18px at the
     * inherited weight. Three of the five are a radio group's own label now, and
     * WebAwesome's default label weight is semibold, so the weight is restated to keep them
     * looking as they did. The bottom margin is WebAwesome's own 0.5em pinned to the 10px
     * the section gap gave it.
     */
    wa-radio-group::part(form-control-label) {
      font-size: 18px;
      font-weight: var(--wa-font-weight-normal);
      margin-block-end: 10px;
    }

    /* The other two, which head a switch and a checkbox list rather than a radio group. */
    .header {
      font-size: 18px;
      margin: 0;
      padding: 0;
    }

    /*
     * The radio-group utility: display flex, gap 0, padding 0. Material's own FormGroup
     * supplied the column direction, which is WebAwesome's default orientation.
     */
    wa-radio-group::part(form-control-input) {
      gap: 0;
      padding: 0;
    }

    /* Section .toggle-area. */
    .toggle-area {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }

    /*
     * Section .scope-group, plus the flex-flow-row-wrap and full-width utilities the markup
     * carried alongside it. The block declared "flex-wrap: 1", which is not a value that
     * property has and was dropped at parse; the wrapping the list has always had came from
     * the utility, so that is what is restated.
     */
    .scope-group {
      display: flex;
      flex-flow: row wrap;
      width: 100%;
    }

    /* The half-width utility on each checkbox, i.e. two scopes per row. */
    .scope {
      width: 50%;
    }
  `;

  /** The status filter the table is applying: `All` or `Active`. An input only. */
  @property({ type: String }) accessor status = ALL;

  /** Whether the table is hiding consents with no named application. An input only. */
  @property({ type: Boolean, attribute: 'show-with-apps' }) accessor showWithApps = false;

  /** The code-expiry filter the table is applying. An input only. */
  @property({ attribute: false }) accessor expiration: KeepConsentFilterExpiry = {
    expiration: ALL,
    date: new Date(),
  };

  /** The token-expiry filter the table is applying. An input only. */
  @property({ attribute: false }) accessor tokenExpiration: KeepConsentFilterExpiry = {
    expiration: ALL,
    date: new Date(),
  };

  /** The scopes the table is keeping. An input only. */
  @property({ attribute: false }) accessor scopes: string[] = [];

  /**
   * The consent records the checkbox list is built from. Owned by the table, which already
   * holds them to render its rows.
   */
  @property({ attribute: false }) accessor consents: readonly Consent[] = [];

  /** The in-drawer edit, discarded by Cancel and published by Show Results. */
  @state() accessor draft: KeepConsentFilterChangeDetail = {
    status: ALL,
    showWithApps: false,
    expiration: { expiration: ALL, date: new Date() },
    tokenExpiration: { expiration: ALL, date: new Date() },
    scopes: [],
  };

  /**
   * The drawer flag. A primitive rather than the `drawer` slice, so the controller's
   * `Object.is` check is exact and an unrelated drawer opening does not re-render this one.
   */
  private readonly drawer = new StoreController(this, (state) => state.drawer.consentsDrawer);

  /** Previous flag, so {@link willUpdate} sees the edge rather than the level. */
  private wasOpen = false;

  /**
   * Re-seed the draft, and move focus, on the edge where the drawer opens.
   *
   * The comparison is explicit rather than a changed-properties lookup because the flag
   * arrives through a `StoreController`, which drives re-renders with a bare
   * `requestUpdate()` and so puts nothing in that map. It runs before the render rather than
   * after it because seeding the draft *is* a property set: done afterwards it would schedule
   * a second update, where here it folds into the one already in flight.
   */
  protected willUpdate(): void {
    if (this.wasOpen === this.drawer.value) return;
    this.wasOpen = this.drawer.value;
    if (!this.wasOpen) return;
    this.draft = {
      status: this.status,
      showWithApps: this.showWithApps,
      expiration: { ...this.expiration },
      tokenExpiration: { ...this.tokenExpiration },
      scopes: [...this.scopes],
    };
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
   * The shell's three events, and every control's own, are this element's internals.
   * `filter-change` is its whole outbound contract, so everything that brought a handler here
   * is stopped at this boundary — a radio group's `change`, a switch's and a checkbox's, and
   * the shell's `filter-apply` / `filter-cancel` — all of which are composed and would
   * otherwise land in the host page with no useful target.
   */
  private _stop(event: Event): void {
    event.stopPropagation();
  }

  private _handleStatus(event: Event): void {
    this._stop(event);
    const { value } = event.target as HTMLElement & { value: string | null };
    this.draft = { ...this.draft, status: value ?? ALL };
  }

  private _handleShowWithApps(event: Event): void {
    this._stop(event);
    const { checked } = event.target as HTMLElement & { checked: boolean };
    this.draft = { ...this.draft, showWithApps: checked };
  }

  private _handleExpiryMode(event: Event, key: 'expiration' | 'tokenExpiration'): void {
    this._stop(event);
    const { value } = event.target as HTMLElement & { value: string | null };
    this.draft = {
      ...this.draft,
      [key]: { expiration: value ?? ALL, date: this.draft[key].date },
    };
  }

  private _handleExpiryDate(event: Event, key: 'expiration' | 'tokenExpiration'): void {
    this._stop(event);
    const { value } = (event as CustomEvent<{ value: string }>).detail;
    this.draft = {
      ...this.draft,
      [key]: {
        expiration: this.draft[key].expiration,
        date: parseDateValue(value, this.draft[key].date),
      },
    };
  }

  private _handleScope(event: Event, scope: string): void {
    this._stop(event);
    const { checked } = event.target as HTMLElement & { checked: boolean };
    const scopes = checked
      ? Array.from(new Set([...this.draft.scopes, scope]))
      : this.draft.scopes.filter((s) => s !== scope);
    this.draft = { ...this.draft, scopes };
  }

  /**
   * Show Results: publish the draft and close.
   *
   * Unlike the applications filter, this dispatches no refetch — the original did not either,
   * and the table re-filters the consents it already has.
   */
  private _apply(event: Event): void {
    this._stop(event);
    this.emit<KeepConsentFilterChangeDetail>('filter-change', {
      ...this.draft,
      expiration: { ...this.draft.expiration },
      tokenExpiration: { ...this.draft.tokenExpiration },
      scopes: [...this.draft.scopes],
    });
    this.drawer.dispatch(toggleConsentsDrawer());
  }

  /**
   * Cancel: close and publish nothing. The draft is re-seeded on the next open.
   *
   * Escape, the overlay and the drawer's own close button arrive here too — the shell reports
   * all four the same way, because they mean the same thing. Guarded, because the drawer also
   * finishes hiding after {@link _apply} has already cleared the flag, and toggling again
   * would re-open it.
   */
  private _cancel(event: Event): void {
    this._stop(event);
    if (this.drawer.value) this.drawer.dispatch(toggleConsentsDrawer());
  }

  private _renderExpiry(key: 'expiration' | 'tokenExpiration', label: string) {
    const current = this.draft[key];
    const custom = current.expiration !== ALL && current.expiration !== 'None';
    return html`
      <section class="section">
        <wa-radio-group
          label=${label}
          size="s"
          .value=${current.expiration}
          @change=${(event: Event) => this._handleExpiryMode(event, key)}
          @input=${this._stop}
        >
          <wa-radio value="All">All</wa-radio>
          <wa-radio value="None">None</wa-radio>
          <wa-radio value="Custom">Custom</wa-radio>
        </wa-radio-group>
        ${custom
          ? html`
              <keep-input-date
                label=${label}
                .value=${dateValue(current.date)}
                @date-change=${(event: Event) => this._handleExpiryDate(event, key)}
              ></keep-input-date>
            `
          : nothing}
      </section>
    `;
  }

  render() {
    const scopes = collectScopes(this.consents);
    return html`
      <keep-filter-drawer
        label="Filter"
        ?open=${this.drawer.value}
        @filter-apply=${this._apply}
        @filter-cancel=${this._cancel}
      >
        <section class="section">
          <wa-radio-group
            label="Status"
            size="s"
            .value=${this.draft.status}
            @change=${this._handleStatus}
            @input=${this._stop}
          >
            <wa-radio value="All">All</wa-radio>
            <wa-radio value="Active">Active</wa-radio>
          </wa-radio-group>
        </section>
        <hr class="divider" />
        <section class="section">
          <span class="header">App name</span>
          <!--
            The sentence was a bare text node beside the switch, so the control itself had no
            accessible name at all. It is the switch's own label now, which names it — and
            moves it from the left of the toggle to the right, where WebAwesome puts a label.
          -->
          <div class="toggle-area">
            <!--
              The property, not the attribute: wa-switch reads its checked *attribute* once,
              in its constructor, as the value a form reset would restore. Bound as an
              attribute this control would come up in whatever state it was first rendered in
              and never move again.
            -->
            <wa-switch
              size="s"
              .checked=${this.draft.showWithApps}
              @change=${this._handleShowWithApps}
              @input=${this._stop}
            >
              Show only consents with application
            </wa-switch>
          </div>
        </section>
        <hr class="divider" />
        ${this._renderExpiry('expiration', 'Expiration')}
        <hr class="divider" />
        ${this._renderExpiry('tokenExpiration', 'Token Expiration')}
        <hr class="divider" />
        <section class="section">
          <span class="header" id="scopes-heading">Scopes</span>
          <div class="scope-group" role="group" aria-labelledby="scopes-heading">
            ${scopes.map(
              (scope) => html`
                <keep-checkbox
                  class="scope"
                  size="m"
                  ?checked=${this.draft.scopes.includes(scope)}
                  @change=${(event: Event) => this._handleScope(event, scope)}
                  >${scope}</keep-checkbox
                >
              `,
            )}
          </div>
        </section>
      </keep-filter-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-consent-filter': ConsentFilter;
  }
}
