/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-app-status';
import type AppStatus from '../../../src/components/keep-elements/keep-app-status';

const TAG = 'keep-app-status';

const statusDiv = (el: AppStatus) => el.shadowRoot!.querySelector('div')!;
const statusCircle = (el: AppStatus) => el.shadowRoot!.querySelector('circle')!;

describe('keep-app-status', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('defaults the status property to false', async () => {
    const el = await mountLit<AppStatus>(TAG);
    expect(el.status).toBe(false);
  });

  it('renders the wrapper div and svg circle', async () => {
    const el = await mountLit<AppStatus>(TAG);
    expect(statusDiv(el)).toBeTruthy();
    expect(el.shadowRoot!.querySelector('svg')).toBeTruthy();
    expect(statusCircle(el)).toBeTruthy();
  });

  it('renders the inactive state by default', async () => {
    const el = await mountLit<AppStatus>(TAG);
    expect(statusDiv(el).textContent!.trim()).toBe('Inactive');
    expect(statusCircle(el).getAttribute('fill')).toBe('#6C7882');
  });

  it('sets the inactive host colour custom properties by default', async () => {
    const el = await mountLit<AppStatus>(TAG);
    expect(el.style.getPropertyValue('--status-color')).toBe('#6C7882');
    expect(el.style.getPropertyValue('--status-bg-color')).toBe('#E6EBF5');
  });

  it('renders the active state when status is true', async () => {
    const el = await mountLit<AppStatus>(TAG, { status: true });
    expect(statusDiv(el).textContent!.trim()).toBe('Active');
    expect(statusCircle(el).getAttribute('fill')).toBe('#003122');
  });

  it('sets the active host colour custom properties when status is true', async () => {
    const el = await mountLit<AppStatus>(TAG, { status: true });
    expect(el.style.getPropertyValue('--status-color')).toBe('#000');
    expect(el.style.getPropertyValue('--status-bg-color')).toBe('#A1E596');
  });

  it('updates render and host colours when status toggles', async () => {
    const el = await mountLit<AppStatus>(TAG);
    expect(statusDiv(el).textContent!.trim()).toBe('Inactive');

    el.status = true;
    await el.updateComplete;

    expect(statusDiv(el).textContent!.trim()).toBe('Active');
    expect(statusCircle(el).getAttribute('fill')).toBe('#003122');
    expect(el.style.getPropertyValue('--status-color')).toBe('#000');
    expect(el.style.getPropertyValue('--status-bg-color')).toBe('#A1E596');
  });
});
