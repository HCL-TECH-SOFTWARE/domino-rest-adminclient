/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-mail';
import type Mail from '../../../src/components/keep-elements/keep-mail';
import { FA_LIBRARY } from '../../../src/services/icon-library';

/**
 * `keep-mail` replaces `components/mail/Mail.tsx`, which had no test — the screen is parked
 * behind LABS-1214 (#698) and no route reaches it. So nothing here is carried over; these
 * are the first assertions the screen has ever had, and they exist because the parked route
 * means a regression in it cannot be found by using the app.
 *
 * What they pin is the part a conversion loses silently: that the glyph still resolves
 * through the bundled Font Awesome library rather than Web Awesome's CDN, that it stays
 * unlabelled (the heading beside it says the same thing), and that the heading is a real
 * heading. Sizes and colours are not assertable — the suite runs with `css: false`.
 */

const TAG = 'keep-mail';

const glyph = (el: Mail) => el.shadowRoot!.querySelector('wa-icon')!;
const heading = (el: Mail) => el.shadowRoot!.querySelector('h1')!;

describe('keep-mail', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the envelope glyph over the heading, in that order', async () => {
    const el = await mountLit<Mail>(TAG);
    const page = el.shadowRoot!.querySelector('.page')!;
    expect([...page.children].map((child) => child.tagName.toLowerCase())).toEqual([
      'wa-icon',
      'h1',
    ]);
  });

  it('resolves the glyph through the bundled Font Awesome library, not the CDN', async () => {
    const el = await mountLit<Mail>(TAG);
    // A wa-icon with no library falls through to Web Awesome's own resolver, which fetches
    // from ka-f.fontawesome.com — unreachable for a self-hosted admin UI and blocked by the
    // deployment CSP. The attribute is the only thing keeping it off that path.
    expect(glyph(el).getAttribute('library')).toBe(FA_LIBRARY);
    expect(glyph(el).getAttribute('name')).toBe('envelope');
    expect(glyph(el).hasAttribute('src')).toBe(false);
  });

  it('keeps the 1em canvas the React original rendered', async () => {
    // Web Awesome's default canvas is `fixed`, a 1.25em-wide by 1em-tall box. The React
    // icon entry point defaulted to `auto` so converted sites kept the 1em box both legacy
    // icon sets drew; omitting it here would silently widen the glyph by a quarter.
    const el = await mountLit<Mail>(TAG);
    expect(glyph(el).getAttribute('canvas')).toBe('auto');
  });

  it('leaves the glyph unlabelled so it is not announced twice', async () => {
    const el = await mountLit<Mail>(TAG);
    // wa-icon renders aria-hidden when it has no label. The heading already says "Mail".
    expect(glyph(el).hasAttribute('label')).toBe(false);
  });

  it('names the screen with a level-one heading', async () => {
    const el = await mountLit<Mail>(TAG);
    // The whole content of the route. Without a heading a screen-reader user landing on
    // /mail has nothing to orient by (#713); the React original used a plain span.
    expect(heading(el).textContent?.trim()).toBe('Mail');
  });

  it('renders no light-DOM slot — the screen has no children to project', async () => {
    const el = await mountLit<Mail>(TAG);
    expect(el.shadowRoot!.querySelector('slot')).toBeNull();
  });
});
