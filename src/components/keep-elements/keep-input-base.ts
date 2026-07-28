/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css } from 'lit';
import { property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { getLogger } from '../../services/log-service';
import '@awesome.me/webawesome/dist/components/input/input.js';

const log = getLogger('components/keep-input-base');

type WaInput = HTMLElementTagNameMap['wa-input'];

/**
 * Shared base for the single-line text inputs — `keep-input-text` and
 * `keep-input-password` — which differ only in the `<wa-input>` they render.
 *
 * It exists to give them a **public value and validity API** (#743). Before this, the one
 * consumer that needed either reached through two shadow roots for it:
 *
 *     usernameRef.current?.shadowRoot.querySelector('wa-input')?.value
 *
 * `LoginPage` did that 11 times, twice as an unguarded *write*, and carried a local helper
 * encoding the WebAwesome quirk documented on {@link reportUserValidity}. Both properly
 * belong to the element: a consumer should not have to know that a `keep-input-text`
 * contains a `wa-input`, nor which of WebAwesome's two validation entry points sets the
 * state its own stylesheet keys on.
 *
 * ### On `:state(user-invalid)` in the styles below (#742)
 *
 * WebAwesome 3.x publishes validity as CSS *custom states*: its form controls call
 * `customStates.set('user-invalid', …)`, which writes into `ElementInternals.states` and
 * is matched by `:state()`. The selector this replaced — `wa-input` with a
 * `data-user-invalid` attribute — is the Shoelace 2.x convention, and nothing in
 * WebAwesome's runtime ever sets that attribute, so the rule never matched once.
 *
 * The note lives out here rather than inside the `css` template because comments inside a
 * tagged template are string content: Vite minifies real stylesheets but not these, so
 * anything written in there ships to every user.
 */
export abstract class KeepInputBase extends KeepElement {
  static styles = css`
    :host {
      color-scheme: inherit;
    }
    text {
      font-size: var(--wa-font-size-s);
    }

    wa-input:state(user-invalid)::part(base) {
      border-color: var(--wa-color-danger-600);
      box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-300);
    }

    /* Dark mode: white label and brand-tinted input text so a
       pre-filled value isn't pure white on the dark background. */
    :host-context(body[data-theme="dark"]) wa-input::part(form-control-label),
    :host-context(body[data-theme="dark"]) wa-input::part(label) {
      color: #ffffff !important;
    }
    :host-context(body[data-theme="dark"]) wa-input::part(input) {
      color: var(--wa-color-brand-50) !important;
      -webkit-text-fill-color: var(--wa-color-brand-50) !important;
      caret-color: var(--wa-color-brand-50);
    }
  `;

  @property({ type: String }) label = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) required = false;

  /**
   * The field's current text.
   *
   * Reactive and two-way, following `keep-input-date`: subclasses bind it into the control
   * with `.value="${this.value}"` and route the control's `input` event to
   * {@link handleInput}, which writes the user's typing back. Reading it therefore works
   * before first render and without touching the shadow root, and assigning it — the
   * passkey prefill's one use — sets the control on the next update.
   */
  @property({ type: String }) value = '';

  /** The `<wa-input>` this element wraps. `null` before the first render completes. */
  protected get control(): WaInput | null {
    return this.shadowRoot?.querySelector('wa-input') ?? null;
  }

  /** Bind as `@input` on the control so typing updates {@link value}. */
  protected handleInput() {
    this.value = this.control?.value ?? '';
  }

  /**
   * Whether the field satisfies its constraints, leaving the `user-invalid` state alone.
   *
   * A field whose control has not rendered yet reports invalid. That should not happen
   * from an event handler, and blocking is the safe reading for the only thing this
   * answers — whether a form may be submitted.
   */
  checkValidity(): boolean {
    return this.control?.checkValidity() ?? false;
  }

  /**
   * Set (or clear, with `''`) an error that no constraint attribute can express — a server
   * rejecting a username/password *pair*, say. WebAwesome's `CustomErrorValidator` folds it
   * into the same validity flags as `required`, so {@link reportUserValidity} styles it.
   */
  setCustomValidity(message: string): void {
    this.control?.setCustomValidity(message);
  }

  /**
   * Validate, and leave a failing field in the `user-invalid` custom state that the
   * `:state(user-invalid)` rule above styles. Returns whether the field is valid.
   *
   * Two details of WebAwesome's API drive the implementation (#742):
   *
   * 1. `hasInteracted` is set first because `setCustomStates()` computes
   *    `user-invalid = !valid && hasInteracted`. WebAwesome's own `reportValidity()` sets
   *    that flag *after* it runs validation, so a single call leaves a field `invalid` but
   *    never `user-invalid`.
   * 2. `checkValidity()` rather than `reportValidity()`: it walks the same
   *    `updateValidity() → setValidity() → setCustomStates()` path without moving focus or
   *    opening a validation bubble, so it is safe to call on every field of a form at once.
   *
   * Hence the name — this reports validity *to the user*, but not the way the native
   * `reportValidity()` does, and pretending otherwise would mislead every caller.
   */
  reportUserValidity(): boolean {
    const control = this.control;
    if (!control) {
      log.error('cannot validate: the wa-input has not rendered yet', { id: this.id, label: this.label });
      return false;
    }
    control.hasInteracted = true;
    return control.checkValidity();
  }
}
