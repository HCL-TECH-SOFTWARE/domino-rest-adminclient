/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
import { KeepIcon } from '../../../src/components/keep-elements/react/KeepIcon';
import { FA_LIBRARY } from '../../../src/services/icon-library';

afterEach(cleanup);

/**
 * The rendered custom element, typed for property reads.
 *
 * React 19 sets a **property** rather than an attribute whenever the custom element is
 * already upgraded and carries a matching one — and `KeepIcon` imports `icon.js`, so
 * `wa-icon` is always defined before it renders. `name`, `label` and `library` are Web
 * Awesome reactive properties that do not reflect, so the rendered markup is bare
 * `<wa-icon class="…">` and every assertion below has to read the property. `class` is the
 * one thing that really is an attribute.
 */
const renderIcon = (props: Parameters<typeof KeepIcon>[0]) => {
  const { container } = render(<KeepIcon {...props} />);
  return container.querySelector('wa-icon')! as HTMLElement & {
    name?: string;
    label?: string;
    library?: string;
  };
};

describe('KeepIcon', () => {
  it('renders a wa-icon', () => {
    expect(renderIcon({ name: 'trash' }).tagName.toLowerCase()).toBe('wa-icon');
  });

  it('passes the glyph name through', () => {
    expect(renderIcon({ name: 'trash' }).name).toBe('trash');
  });

  it('sets the glyph as a property, which Web Awesome then reflects', async () => {
    // Pinned because the timing is a trap. React sets the *property* synchronously; the
    // matching attribute does not exist until Lit's first update, which is async. Read the
    // DOM in between — which is what a naive `getAttribute` assertion does — and every
    // attribute reads as absent. Assert the property for synchronous checks; await
    // `updateComplete` before asserting markup.
    const el = renderIcon({ name: 'trash' }) as HTMLElement & {
      name?: string;
      updateComplete: Promise<unknown>;
    };
    expect(el.getAttributeNames()).toEqual([]);
    expect(el.name).toBe('trash');

    await el.updateComplete;
    expect(el.getAttribute('name')).toBe('trash');
  });

  describe('canvas', () => {
    /**
     * Web Awesome's own default is `fixed`, a 1.25em × 1em box. `MuiSvgIcon` and
     * `react-icons` both rendered 1em × 1em, so taking the Web Awesome default would have
     * widened every converted call site by 25 %. `css: false` means no test here can see
     * that, so the default is pinned instead.
     */
    it('defaults to auto, not to Web Awesome’s wider fixed canvas', async () => {
      const el = renderIcon({ name: 'trash' }) as HTMLElement & { updateComplete: Promise<unknown> };
      await el.updateComplete;
      expect(el.getAttribute('canvas')).toBe('auto');
    });

    it('lets a call site ask for fixed-width alignment', async () => {
      const el = renderIcon({ name: 'trash', canvas: 'fixed' }) as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      await el.updateComplete;
      expect(el.getAttribute('canvas')).toBe('fixed');
    });
  });

  /**
   * The reason this component exists. A `<wa-icon>` with no `library` falls through to Web
   * Awesome's stock resolver and fetches from ka-f.fontawesome.com — permitted by the
   * `connect-src` wildcard, so it neither fails nor reports. `library` is deliberately not
   * a prop, so no call site can reintroduce that.
   */
  it('always sets the bundled library, and takes no prop that could unset it', () => {
    expect(renderIcon({ name: 'trash' }).library).toBe(FA_LIBRARY);
    // @ts-expect-error `library` is not part of the public prop surface
    expect(renderIcon({ name: 'trash', library: 'default' }).library).toBe(FA_LIBRARY);
  });

  it('sets no accessible name unless asked', () => {
    expect(renderIcon({ name: 'trash' }).label).toBeFalsy();
  });

  it('passes an accessible name through', () => {
    expect(renderIcon({ name: 'trash', label: 'Delete' }).label).toBe('Delete');
  });

  describe('sizing', () => {
    // `wa-icon` has no size property; the glyph's box comes from `font-size`. These map to
    // Web Awesome's own `.wa-size-*` utilities rather than an inline style, which the
    // production CSP (`style-src-attr 'none'`) forbids outright.
    it('maps size to the matching Web Awesome utility class', () => {
      expect(renderIcon({ name: 'trash', size: 'xl' }).className).toBe('wa-size-xl');
    });

    it('supports every step of the scale', () => {
      for (const size of ['xs', 's', 'm', 'l', 'xl'] as const) {
        expect(renderIcon({ name: 'trash', size }).className).toBe(`wa-size-${size}`);
      }
    });

    it('sets no class at all when neither size nor className is given', () => {
      // Not `class=""` — an empty class attribute is noise in the DOM and in snapshots.
      expect(renderIcon({ name: 'trash' }).hasAttribute('class')).toBe(false);
    });

    it('never emits a style attribute', () => {
      // `test/csp-inline-styles.test.ts` holds the repo-wide count at zero; this pins the
      // one component most likely to reach for one, since sizing is its whole job.
      expect(renderIcon({ name: 'trash', size: 'l' }).hasAttribute('style')).toBe(false);
    });
  });

  describe('className', () => {
    it('passes a call-site class through', () => {
      expect(renderIcon({ name: 'trash', className: 'big-text' }).className).toBe('big-text');
    });

    it('composes the size utility with a call-site class, size first', () => {
      // Order is not cosmetic: both are single-class selectors, so if the call site's rule
      // and the utility both set font-size the winner is decided elsewhere — see the
      // component docblock on cascade layers. Pinned so the composition cannot silently flip.
      expect(renderIcon({ name: 'trash', size: 'm', className: 'big-text' }).className).toBe(
        'wa-size-m big-text'
      );
    });
  });

  it('forwards a click handler', () => {
    const onClick = vi.fn();
    fireEvent.click(renderIcon({ name: 'trash', onClick }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
