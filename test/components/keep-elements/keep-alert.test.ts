/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-alert';
import type Alert from '../../../src/components/keep-elements/keep-alert';

const TAG = 'keep-alert';

const callout = (el: Alert) => el.shadowRoot!.querySelector('wa-callout')!;
const wrapper = (el: Alert) => el.shadowRoot!.querySelector<HTMLElement>('.toast-wrapper')!;
const closeBtn = (el: Alert) => el.shadowRoot!.querySelector<HTMLButtonElement>('.close-btn')!;
const strong = (el: Alert) => el.shadowRoot!.querySelector('strong')!;
const messageEl = (el: Alert) => el.shadowRoot!.querySelector('.message')!;

describe('keep-alert', () => {
  // The component schedules a real auto-dismiss timer via show(); fake timers
  // keep those from leaking across tests. Lit's updateComplete resolves on
  // microtasks, which fake timers leave untouched, so awaits still work.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    cleanupLit();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the default heading, neutral variant and empty message', async () => {
    const el = await mountLit<Alert>(TAG);
    expect(callout(el)).toBeTruthy();
    expect(callout(el).getAttribute('variant')).toBe('neutral');
    expect(strong(el).textContent).toBe('Network error!');
    expect(messageEl(el).textContent).toBe('');
    // No message → the alert stays hidden (no auto-show).
    expect(wrapper(el).classList.contains('visible')).toBe(false);
  });

  it('sets a manual popover attribute when connected', async () => {
    const el = await mountLit<Alert>(TAG);
    expect(el.getAttribute('popover')).toBe('manual');
  });

  it('reflects message, heading and variant into the rendered callout', async () => {
    const el = await mountLit<Alert>(TAG, {
      message: 'Something happened',
      heading: 'Heads up',
      variant: 'success',
    });
    await el.updateComplete;
    expect(callout(el).getAttribute('variant')).toBe('success');
    expect(strong(el).textContent).toBe('Heads up');
    expect(messageEl(el).textContent).toBe('Something happened');
  });

  it('renders an accessible dismiss button', async () => {
    const el = await mountLit<Alert>(TAG);
    const btn = closeBtn(el);
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe('Dismiss notification');
  });

  it('show() makes the alert visible and updates message/variant', async () => {
    const el = await mountLit<Alert>(TAG);
    el.show('Saved!', 'success');
    await el.updateComplete;
    await el.updateComplete;
    expect(wrapper(el).classList.contains('visible')).toBe(true);
    expect(callout(el).getAttribute('variant')).toBe('success');
    expect(messageEl(el).textContent).toBe('Saved!');
  });

  it('auto-shows when message transitions to a non-empty value', async () => {
    const el = await mountLit<Alert>(TAG);
    expect(wrapper(el).classList.contains('visible')).toBe(false);
    el.message = 'Network down';
    await el.updateComplete;
    await el.updateComplete;
    expect(wrapper(el).classList.contains('visible')).toBe(true);
  });

  // ---- #952 ---------------------------------------------------------------------------------

  /**
   * The element used to move itself to `document.body` on first show, "so we're not trapped
   * inside another component's shadow tree". Both remaining call sites render it from a Lit
   * template, and a template holds a `ChildPart` bracketing the nodes it produced — relocating
   * one of those from inside the element's own `updated()` is what broke the React consumer in
   * #902, aimed at a different renderer.
   *
   * The Popover API already does the job the move was there for: `show()` promotes the element
   * into the top layer, out of every ancestor's clipping and stacking context. Measured in
   * Chrome, nested two shadow roots deep inside a 200x60 `overflow: hidden` box with a modal
   * `<dialog>` open — it paints at the top right, above the backdrop, unclipped.
   */
  it('stays where its parent put it when shown', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const el = document.createElement(TAG) as Alert;
    host.appendChild(el);
    await el.updateComplete;

    el.show('Nested toast', 'danger', 5000);
    await el.updateComplete;

    expect(el.parentElement, 'the alert reparented itself out of its host').toBe(host);
    host.remove();
  });

  it('stays where its parent put it when auto-shown by a message change', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const el = document.createElement(TAG) as Alert;
    host.appendChild(el);
    await el.updateComplete;

    el.message = 'Raised declaratively';
    await el.updateComplete;
    await el.updateComplete;

    expect(el.parentElement).toBe(host);
    host.remove();
  });

  it('waits for the close animation, then emits a composed alert-closed event', async () => {
    const el = await mountLit<Alert>(TAG, { message: 'Boom', variant: 'danger' });
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('alert-closed', (e) => events.push(e as CustomEvent));

    closeBtn(el).click();
    // _hide() plays a slide-out animation first and only emits on animationend.
    expect(events).toHaveLength(0);
    expect(wrapper(el).classList.contains('hiding')).toBe(true);

    wrapper(el).dispatchEvent(new Event('animationend'));

    expect(events).toHaveLength(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
    expect(events[0].detail ?? null).toBeNull();
  });
});
