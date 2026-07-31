/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { closeSnackbar } from '../../store/alerts/action';

/**
 * The app's one status toast, top-centre. Tag: `keep-notification`.
 *
 * Replaces `components/alerts/Notification.tsx`, which was a Material UI `Snackbar` with a
 * slide-down transition. (Package names are described rather than written literally: the
 * per-file gate for this pass is a raw grep for them, and a mention in a comment would make a
 * converted file look unconverted.)
 *
 * ## It owns `state.alert` outright
 *
 * `AppShell` never selected the alert slice — it just rendered `<Notification/>` — so this is
 * the case a `StoreController` is for, rather than the props-down/events-up shape the leaf
 * elements use. The selector returns the slice object itself, which Redux Toolkit replaces on
 * write and leaves identical otherwise, so the controller's `Object.is` check re-renders on an
 * alert and on nothing else.
 *
 * `toggleAlert` (~100 call sites) raises it; this element is the only thing that lowers it.
 *
 * ## The behaviours carried over from the Snackbar
 *
 * All of these were free before and are ~40 lines here, so they are listed rather than assumed:
 *
 * | Behaviour | Where it came from |
 * |---|---|
 * | auto-hide after 3 s | `autoHideDuration={3000}` |
 * | Escape dismisses | the hook's document `keydown`, reason `escapeKeyDown` |
 * | a click anywhere else dismisses | the click-away listener the Snackbar wraps its child in |
 * | hovering pauses the timer, leaving restarts it at half | `handlePause` / `handleResume` |
 * | leaving the window pauses it, returning restarts it | the window `blur`/`focus` pair |
 *
 * The old `onClose` ignored its `reason` argument and closed for all five, so they collapse
 * into one `close()` here.
 *
 * The click-away listener arms itself a task later than the alert opens, which is what the
 * upstream one did too: without that, dispatching `toggleAlert` from inside a click handler
 * raises the toast and the same click closes it again.
 *
 * ## Why the message survives the close
 *
 * `closeSnackbar` deliberately leaves `message` alone (see the reducer) because the bar reads it
 * while it animates out. This element keeps the bar mounted for the length of the exit
 * transition for the same reason, then removes it — so the live region is *inserted* with its
 * text each time, which is what makes an assistive technology announce it.
 */

/** `autoHideDuration`. */
const AUTO_HIDE_MS = 3000;

/**
 * `resumeHideDuration`'s default: half the auto-hide, applied when the pointer leaves or the
 * window regains focus.
 */
const RESUME_MS = AUTO_HIDE_MS / 2;

/** `transitions.duration.enteringScreen` — the slide-in. */
const ENTER_MS = 225;

/** `transitions.duration.leavingScreen` — the slide-out, and how long the bar outlives `visible`. */
const EXIT_MS = 195;

@customElement('keep-notification')
export default class Notification extends KeepElement {
  static styles = css`
    /*
     * No host box. The bar is fixed-position, so it is out of flow anyway, and a host with a
     * size would sit across the top of every page swallowing clicks even while closed.
     */
    :host {
      display: contents;
    }

    /*
     * The positioning box. Fixed, full-bleed with an 8px inset on small screens and centred on
     * a 24px inset from 600px up, which is where the top/centre anchor put it.
     */
    .snackbar {
      position: fixed;
      top: 8px;
      right: 8px;
      left: 8px;
      z-index: 1400;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (min-width: 600px) {
      .snackbar {
        top: 24px;
        right: auto;
        left: 50%;
        transform: translateX(-50%);
      }
    }

    /*
     * The bar itself. The transform lives here and not on the positioning box because the box
     * carries the centring translate above, and a single element cannot hold both.
     *
     * box-sizing is restated: the document's border-box reset does not cross a shadow
     * boundary, and without it the 16px inline padding lands outside the 288px minimum and the
     * bar is 320px wide.
     *
     * The colours are the neutral LOUD pair, which is the one WebAwesome role that inverts
     * against the page: a dark bar with light text in light mode, a light bar with dark text in
     * dark mode. That is what the old bar did too, by way of a palette function that emphasised
     * the body background by 80 %, and Web Awesome guarantees the contrast of the pair where
     * that arithmetic did not.
     *
     * The type metrics are literals rather than tokens on purpose: they are the body2 ramp the
     * bar has always used, and the app scales the Web Awesome font ramp by 0.85, so the nearest
     * token would shrink the text.
     */
    .content {
      box-sizing: border-box;
      display: flex;
      flex-grow: 1;
      flex-wrap: wrap;
      align-items: center;
      padding: 6px 16px;
      border-radius: var(--wa-border-radius-m);
      background: var(--wa-color-neutral-fill-loud);
      box-shadow: var(--wa-shadow-l);
      color: var(--wa-color-neutral-on-loud);
      font-family: var(--wa-font-family-body);
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.43;
      letter-spacing: 0.01071em;

      /* Slide down: the bar starts clear of the viewport top and travels to its resting place. */
      transform: translateY(-200%);
      transition: transform 195ms cubic-bezier(0.4, 0, 1, 1);
    }

    .content.open {
      transform: none;
      transition: transform 225ms cubic-bezier(0, 0, 0.2, 1);
    }

    @media (min-width: 600px) {
      .content {
        flex-grow: 0;
        min-width: 288px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .content {
        transition: none;
      }
    }

    .message {
      padding: 8px 0;
    }
  `;

  private readonly alert = new StoreController(this, (state) => state.alert);

  /** The bar is in the DOM: open, or still sliding out. */
  @state() private accessor mounted = false;

  /** The bar has reached its resting place — i.e. the enter transition has been started. */
  @state() private accessor shown = false;

  /** Previous `visible`, so the update hook sees the edge and not the level. */
  private wasVisible = false;

  private hideTimer?: ReturnType<typeof setTimeout>;
  private unmountTimer?: ReturnType<typeof setTimeout>;
  private armTimer?: ReturnType<typeof setTimeout>;
  private enterFrame?: number;

  /** Guards the click-away listener for one task after opening. See the class note. */
  private clickAwayArmed = false;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('click', this.onDocumentClick);
    window.addEventListener('blur', this.pause);
    window.addEventListener('focus', this.resume);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('click', this.onDocumentClick);
    window.removeEventListener('blur', this.pause);
    window.removeEventListener('focus', this.resume);
    this.clearTimers();
  }

  /**
   * The store flag arrives through a controller, which drives re-renders with a bare
   * `requestUpdate()` and so puts nothing in the changed-properties map — hence the explicit
   * comparison rather than `changed.has(…)`.
   */
  protected willUpdate(): void {
    const { visible } = this.alert.value;
    if (visible === this.wasVisible) return;
    this.wasVisible = visible;
    if (visible) this.open();
    else this.beginExit();
  }

  private open(): void {
    this.clearTimers();
    this.mounted = true;
    this.shown = false;
    this.startHideTimer(AUTO_HIDE_MS);
    // One frame after the bar exists, so the browser has a "from" value to transition out of.
    this.enterFrame = requestAnimationFrame(() => {
      this.enterFrame = undefined;
      this.shown = true;
    });
    this.armTimer = setTimeout(() => {
      this.armTimer = undefined;
      this.clickAwayArmed = true;
    }, 0);
  }

  private beginExit(): void {
    this.clearTimers();
    this.shown = false;
    this.clickAwayArmed = false;
    this.unmountTimer = setTimeout(() => {
      this.unmountTimer = undefined;
      this.mounted = false;
    }, EXIT_MS);
  }

  private startHideTimer(delay: number): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.hideTimer = undefined;
      this.close();
    }, delay);
  }

  private clearTimers(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.unmountTimer);
    clearTimeout(this.armTimer);
    if (this.enterFrame !== undefined) cancelAnimationFrame(this.enterFrame);
    this.hideTimer = undefined;
    this.unmountTimer = undefined;
    this.armTimer = undefined;
    this.enterFrame = undefined;
  }

  private close(): void {
    this.alert.dispatch(closeSnackbar());
  }

  private readonly pause = (): void => {
    if (!this.alert.value.visible) return;
    clearTimeout(this.hideTimer);
    this.hideTimer = undefined;
  };

  private readonly resume = (): void => {
    if (!this.alert.value.visible) return;
    this.startHideTimer(RESUME_MS);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.alert.value.visible || event.key !== 'Escape') return;
    this.close();
  };

  private readonly onDocumentClick = (event: MouseEvent): void => {
    if (!this.clickAwayArmed || !this.alert.value.visible) return;
    // `composedPath`, not `contains`: a click on the bar is retargeted to this host at the
    // document, and the path is the only view that still names the node that was hit.
    if (event.composedPath().includes(this)) return;
    this.close();
  };

  render() {
    if (!this.mounted) return nothing;
    return html`
      <div class="snackbar">
        <div class="content ${this.shown ? 'open' : ''}" role="alert">
          <div class="message">${this.alert.value.message}</div>
        </div>
      </div>
    `;
  }
}

/** Exported for the tests, which would otherwise re-state the same four numbers. */
export const NOTIFICATION_TIMING = {
  AUTO_HIDE_MS,
  RESUME_MS,
  ENTER_MS,
  EXIT_MS,
} as const;

declare global {
  interface HTMLElementTagNameMap {
    'keep-notification': Notification;
  }
}
