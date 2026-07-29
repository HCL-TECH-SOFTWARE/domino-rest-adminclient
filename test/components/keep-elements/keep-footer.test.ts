/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-footer';
import type Footer from '../../../src/components/keep-elements/keep-footer';
import { BUILD_VERSION } from '../../../src/config.dev';

const TAG = 'keep-footer';

const bar = (el: Footer) => el.shadowRoot!.querySelector('footer.bar')!;
const texts = (el: Footer) =>
  [...el.shadowRoot!.querySelectorAll('.copyright')].map((n) => n.textContent!.trim());

/** The tag `stampBuildVersion()` injects at build time; absent under `vite dev`. */
const stampDailyBuild = (content: string) => {
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'admin-ui-daily-build-version');
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
  return meta;
};

describe('keep-footer', () => {
  afterEach(() => {
    document.head.querySelectorAll('meta[name="admin-ui-daily-build-version"]').forEach((m) => m.remove());
    cleanupLit();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a contentinfo landmark rather than a bare div', async () => {
    const el = await mountLit<Footer>(TAG);
    // A native <footer> outside any other landmark is exposed as contentinfo, so no
    // role attribute is needed (#713).
    expect(bar(el)).toBeTruthy();
    expect(bar(el).tagName).toBe('FOOTER');
  });

  it('names the current year in the copyright line', async () => {
    const el = await mountLit<Footer>(TAG);
    expect(texts(el)[0]).toContain(String(new Date().getFullYear()));
    expect(texts(el)[0]).toContain('HCL America Inc.');
  });

  it('omits the daily build number when the meta tag is absent', async () => {
    const el = await mountLit<Footer>(TAG);
    // The React original rendered the string "undefined" here.
    expect(texts(el)[1]).toBe(`Build ${BUILD_VERSION}`);
    expect(texts(el)[1]).not.toContain('undefined');
  });

  it('appends the daily build number when the meta tag is present', async () => {
    stampDailyBuild('20260729');
    const el = await mountLit<Footer>(TAG);
    expect(texts(el)[1]).toBe(`Build ${BUILD_VERSION} 20260729`);
  });
});
