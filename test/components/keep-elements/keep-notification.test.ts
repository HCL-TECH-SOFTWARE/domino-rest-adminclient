/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { closeSnackbar, toggleAlert } from '../../../src/store/alerts/reducer';
// Value import, not `import type`: the assertions read `.styles` off the class, and the default
// import registers the element as a side effect either way.
import Notification, {
  NOTIFICATION_TIMING,
} from '../../../src/components/keep-elements/keep-notification';

const TAG = 'keep-notification';
const { AUTO_HIDE_MS, RESUME_MS, ENTER_MS, EXIT_MS } = NOTIFICATION_TIMING;

/**
 * The app's one status toast. It takes no props: `state.alert` arrives through
 * `StoreController`, so these tests drive the real store.
 *
 * `Notification.tsx` had no test of its own, so nothing was carried over — the behaviours
 * asserted here are the ones the framework `Snackbar` provided for free and this element now
 * implements itself.
 */
describe('keep-notification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.dispatch(closeSnackbar());
  });

  afterEach(() => {
    cleanupLit();
    vi.useRealTimers();
    store.dispatch(closeSnackbar());
  });

  const mount = () => mountLit<Notification>(TAG);

  const bar = (el: Notification) => el.shadowRoot!.querySelector('.content');
  const text = (el: Notification) =>
    el.shadowRoot!.querySelector('.message')?.textContent?.trim();

  /**
   * A store dispatch reaches the element through `StoreController.requestUpdate()`, and the
   * enter class lands one animation frame later again — so settling drains both.
   */
  const settle = async (el: Notification) => {
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(0);
      await el.updateComplete;
    }
  };

  const raise = async (el: Notification, message: string) => {
    store.dispatch(toggleAlert(message));
    await settle(el);
  };

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders nothing at all while no alert is up', async () => {
    const el = await mount();
    expect(bar(el)).toBeNull();
  });

  it('shows the message when the store raises one', async () => {
    const el = await mount();
    await raise(el, 'Saved');
    expect(text(el)).toBe('Saved');
  });

  it('announces itself as an alert', async () => {
    // The live region is *inserted* with its text rather than revealed, which is what makes an
    // assistive technology read it out.
    const el = await mount();
    await raise(el, 'Saved');
    expect(bar(el)!.getAttribute('role')).toBe('alert');
  });

  it('slides in a frame after it appears, so the transition has a start value', async () => {
    // The only test that needs a real frame to pass, so it advances one by hand rather than
    // making `settle` eat 16ms out of every auto-hide window below.
    const el = await mount();
    store.dispatch(toggleAlert('Saved'));
    await el.updateComplete;
    expect(bar(el)!.classList.contains('open')).toBe(false);

    await vi.advanceTimersByTimeAsync(16);
    await el.updateComplete;
    expect(bar(el)!.classList.contains('open')).toBe(true);
  });

  it('closes itself after the auto-hide window', async () => {
    const el = await mount();
    await raise(el, 'Saved');
    expect(store.getState().alert.visible).toBe(true);

    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS - 1);
    expect(store.getState().alert.visible).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(store.getState().alert.visible).toBe(false);
  });

  it('keeps the bar mounted for the exit transition, then removes it', async () => {
    // `closeSnackbar` deliberately leaves `message` in the store because the bar reads it while
    // it animates out.
    const el = await mount();
    await raise(el, 'Saved');
    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS);
    await el.updateComplete;

    expect(bar(el)).not.toBeNull();
    expect(bar(el)!.classList.contains('open')).toBe(false);
    expect(text(el)).toBe('Saved');

    await vi.advanceTimersByTimeAsync(EXIT_MS);
    await el.updateComplete;
    expect(bar(el)).toBeNull();
  });

  it('a second alert inside the window replaces the text and keeps the first deadline', async () => {
    // What `toggleAlert` always did, and what #792 fixed the reducer half of: the flag stays
    // true, so nothing restarts the timer.
    const el = await mount();
    await raise(el, 'first');
    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS / 2);
    await raise(el, 'second');
    expect(text(el)).toBe('second');

    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS / 2);
    expect(store.getState().alert.visible).toBe(false);
  });

  it('Escape dismisses it', async () => {
    const el = await mount();
    await raise(el, 'Saved');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(store.getState().alert.visible).toBe(false);
  });

  it('ignores other keys, and Escape when nothing is up', async () => {
    const el = await mount();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(store.getState().alert.visible).toBe(false);

    await raise(el, 'Saved');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(store.getState().alert.visible).toBe(true);
  });

  it('a click anywhere else dismisses it', async () => {
    const el = await mount();
    await raise(el, 'Saved');
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(store.getState().alert.visible).toBe(false);
  });

  it('a click on the bar itself does not', async () => {
    const el = await mount();
    await raise(el, 'Saved');
    bar(el)!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(store.getState().alert.visible).toBe(true);
  });

  it('does not let the click that raised it close it again', async () => {
    // The listener arms a task after opening. Without that, dispatching `toggleAlert` from
    // inside a click handler raises the toast and the same click takes it away.
    const el = await mount();
    store.dispatch(toggleAlert('Saved'));
    await el.updateComplete;
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(store.getState().alert.visible).toBe(true);
  });

  it('pauses the timer while the pointer is over the page, and restarts it at half', async () => {
    // Modelled on the framework hook's pause/resume pair, which is also what the window
    // blur/focus listeners drive.
    const el = await mount();
    await raise(el, 'Saved');

    window.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS * 2);
    expect(store.getState().alert.visible).toBe(true);

    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(RESUME_MS - 1);
    expect(store.getState().alert.visible).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(store.getState().alert.visible).toBe(false);
  });

  it('ignores pause and resume when nothing is up', async () => {
    await mount();
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS * 2);
    expect(store.getState().alert.visible).toBe(false);
  });

  it('drops its listeners and timers when it leaves the document', async () => {
    const el = await mount();
    await raise(el, 'Saved');
    el.remove();

    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS * 2);
    // The timer went with it, so nothing closed the alert behind the app's back.
    expect(store.getState().alert.visible).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(store.getState().alert.visible).toBe(true);
  });

  it('re-raising while the bar is still sliding out cancels the removal', async () => {
    const el = await mount();
    await raise(el, 'first');
    await vi.advanceTimersByTimeAsync(AUTO_HIDE_MS);
    await el.updateComplete;

    await raise(el, 'second');
    await vi.advanceTimersByTimeAsync(EXIT_MS);
    await el.updateComplete;
    expect(text(el)).toBe('second');
  });

  it('carries no CSP-blocked style attribute, and states both transition durations', () => {
    const styles = Notification.styles.toString();
    expect(styles).toContain(`${ENTER_MS}ms`);
    expect(styles).toContain(`${EXIT_MS}ms`);
  });

  it('takes the one Web Awesome colour pair that inverts against the page', () => {
    // A dark bar on a light page and a light bar on a dark one — which is what the palette
    // arithmetic behind the old snackbar produced, with a contrast guarantee it did not have.
    const styles = Notification.styles.toString();
    expect(styles).toContain('var(--wa-color-neutral-fill-loud)');
    expect(styles).toContain('var(--wa-color-neutral-on-loud)');
  });

  it('restates the box-sizing reset, which does not cross the shadow boundary', () => {
    // Without it the 16px inline padding lands outside the 288px minimum and the bar is 320px.
    expect(Notification.styles.toString()).toMatch(/box-sizing:\s*border-box/);
  });
});
