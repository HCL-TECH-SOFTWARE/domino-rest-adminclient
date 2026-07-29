/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import Error400 from '../../assets/errors/400.svg';
import Error403 from '../../assets/errors/403.png';
import Error404 from '../../assets/errors/404.svg';
import Error500 from '../../assets/errors/500.jpeg';

/** What the page's last request returned. `status: 200` renders the slotted content. */
export interface KeepErrorStatus {
  status: number;
  statusText: string;
}

/** Illustration and whether the state gets the "Oops!" greeting, keyed by status. */
const STATES: Record<number, { image: string; greeting: boolean; message?: string }> = {
  400: { image: Error400, greeting: true },
  403: { image: Error403, greeting: false },
  404: { image: Error404, greeting: true },
  500: {
    image: Error500,
    greeting: false,
    message:
      'Server encountered an unexpected condition that prevented it from fulfilling the request',
  },
};

/**
 * Gate in front of a page: passes its slotted content through on 200, and replaces it with an
 * error state on 400/403/404/500. Any other status renders nothing, as the React version did.
 *
 * Despite the name and report 02's inventory, this was never a React error boundary - there is
 * no `componentDidCatch` and never was. It is a switch over a status code, which is why it
 * converts at all.
 */
@customElement('keep-error-wrapper')
export default class ErrorWrapper extends KeepElement {
  static styles = css`
    :host {
      display: contents;
    }

    /* was ErrorContainer in styles/layout.tsx */
    .error {
      height: calc(100vh - 23px);
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /*
     * The height was the only thing ErrorContainer set; the rest reproduces the bare img rule
     * in styles/keep-overrides.css, which is an element selector on a document stylesheet and
     * so does not cross a shadow boundary. Without it these illustrations lose their plate and
     * render at natural size.
     */
    .image {
      /* Restated because the document's border-box reset does not cross the boundary either;
         without it the 10px padding lands outside the 250px. */
      box-sizing: border-box;
      height: 250px;
      background: #383838;
      border-radius: 8px;
      padding: 10px;
      width: auto;
      display: block;
    }

    /* was Title's inner message rule */
    .message {
      font-size: 20px;
    }

    /* was MasterGreeting */
    .greeting {
      font-size: 32px;
      padding: 15px 0;
    }
  `;

  @property({ attribute: false }) accessor errorStatus: KeepErrorStatus = {
    status: 200,
    statusText: '',
  };

  render() {
    const { status, statusText } = this.errorStatus;
    if (status === 200) return html`<slot></slot>`;

    const state = STATES[status];
    if (!state) return nothing;

    // The illustration takes an empty alt and aria-hidden: it carries no information the
    // message beside it does not already state, and the React version used the same text for
    // both, so assistive tech announced it twice (WCAG 1.1.1) (#713).
    return html`
      <div class="error">
        ${state.greeting ? html`<div class="greeting">Oops!</div>` : nothing}
        <div><span class="message">${state.message ?? statusText}</span></div>
        <img class="image" src=${state.image} alt="" aria-hidden="true" />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-error-wrapper': ErrorWrapper;
  }
}
