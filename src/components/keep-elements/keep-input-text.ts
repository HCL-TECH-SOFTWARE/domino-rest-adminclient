import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/input/input.js';

@customElement('keep-input-text')
export default class InputText extends KeepElement {
  /*
   * On `:state(user-invalid)` below (#742).
   *
   * WebAwesome 3.x publishes validity as CSS *custom states*: its form controls call
   * `customStates.set('user-invalid', …)`, which writes into `ElementInternals.states` and
   * is matched by `:state()`. The selector this replaces — `wa-input` with a
   * `data-user-invalid` attribute — is the Shoelace 2.x convention, and nothing in
   * WebAwesome's runtime ever sets that attribute, so the rule never matched once.
   *
   * The note lives out here rather than inside the `css` template because comments inside
   * a tagged template are string content: Vite minifies real stylesheets but not these, so
   * anything written in there ships to every user.
   */
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
  @property({ type: String }) hint = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) required = false;

  render() {
    return html`
        <wa-input
            label="${this.label}"
            style="${this.getAttribute('style') || ''}"
            hint="${this.hint}"
            placeholder="${this.placeholder}"
            ?required="${this.required}"
        >
            <slot></slot>
        </wa-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-input-text': InputText;
  }
}
