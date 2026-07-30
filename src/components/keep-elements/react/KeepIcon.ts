/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../../services/icon-library';

/** Web Awesome's `.wa-size-*` utilities, which are `font-size` classes. */
export type KeepIconSize = 'xs' | 's' | 'm' | 'l' | 'xl';

/** `wa-icon`'s canvas — the box the glyph is centred in. Orthogonal to `font-size`. */
export type KeepIconCanvas = 'fixed' | 'auto' | 'square' | 'roomy';

/**
 * The React spelling of `<wa-icon library="fa">` — the single icon entry point for `.tsx`
 * (#718). Lit templates keep writing the tag directly; there is nothing to wrap for them.
 *
 * **`library` is not a prop.** It is applied here and cannot be overridden from a call
 * site. A `<wa-icon>` with no library falls through to Web Awesome's stock resolver, which
 * fetches from `ka-f.fontawesome.com`; baking the value in makes that unreachable from
 * `.tsx` rather than merely discouraged. `services/icon-library` is imported for its
 * registration side effect, so an icon cannot render before its resolver exists no matter
 * which route loads first.
 *
 * **Not `@lit/react`'s `createComponent`,** unlike the 46 wrappers beside it. Those wrap
 * Lit elements this repo owns, where `createComponent` buys property binding and typed
 * custom events. `wa-icon` takes string attributes and fires nothing this app listens for,
 * so it would buy a render-time prop diff and a dependency on a third-party element class
 * for no gain.
 *
 * ## Sizing
 *
 * `wa-icon` has no `size` property — its API is `name`, `family`, `variant`, `canvas`,
 * `src`, `label`, `library`, `rotate`, `flip` and `animation`. The glyph derives its box
 * from `font-size`, which is why `canvas` is documented as scaling with it. So {@link
 * KeepIconProps.size} maps to Web Awesome's own `.wa-size-*` utilities
 * (`styles/utilities/size.css`, reached through the `webawesome.css` imported by
 * `index.tsx`), each of which sets `font-size` from a `--wa-font-size-*` token.
 *
 * Sizing cannot be an inline style regardless: production CSP sends `style-src-attr
 * 'none'` and `test/csp-inline-styles.test.ts` pins the count at zero.
 *
 * **Do not pass `size` at a call site whose own class already sets `font-size`.** The
 * `.wa-size-*` rules live in `@layer wa-utilities` and no app stylesheet declares a layer,
 * so every app rule outranks them whatever its specificity — passing both is not an
 * override, it is a rule that silently does nothing.
 *
 * MUI's `SvgIcon` defaulted to a fixed 24px. With this app's `--wa-font-size-scale: 0.85`
 * the nearest token is `xl` (~22px), which is what an unsized MUI icon should become — and
 * unlike 24px it now tracks the type ramp.
 *
 * ## Canvas
 *
 * `canvas` defaults to **`auto`** here, not to Web Awesome's own default.
 *
 * Web Awesome's default is `fixed`, a **1.25em × 1em** box — Font Awesome's fixed-width
 * behaviour, which pads every glyph to a common width so icons line up in a column. Both
 * of the legacy icon sets this replaces rendered a **1em × 1em** square instead, setting
 * `width: 1em; height: 1em` on the graphic itself. Keeping the Web Awesome default would
 * therefore have widened all ~115 converted sites by 25 % — a layout change nothing asked
 * for, and one the test suite cannot see because it runs with `css: false`.
 *
 * `auto` keeps the 1em height and lets the width follow the glyph, which is the closest
 * match. Pass `canvas="fixed"` back where column alignment actually matters — a menu or a
 * nav rail — which is a deliberate choice at a call site rather than a silent default.
 */
export interface KeepIconProps {
  /** Font Awesome glyph name — must be registered in `services/icon-library` ICONS. */
  name: string;
  /**
   * Accessible name. Web Awesome renders the glyph `aria-hidden` without one, which is
   * correct beside a visible text label and wrong when the icon is the only content.
   */
  label?: string;
  /** Omit when the call site's own class sets `font-size` — see the note above. */
  size?: KeepIconSize;
  /** Defaults to `auto`, matching the 1em box both replaced icon sets rendered. */
  canvas?: KeepIconCanvas;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

export const KeepIcon = ({
  name,
  label,
  size,
  canvas = 'auto',
  className,
  onClick
}: KeepIconProps) => {
  const classes = [size && `wa-size-${size}`, className].filter(Boolean).join(' ');
  return React.createElement('wa-icon', {
    library: FA_LIBRARY,
    name,
    label,
    canvas,
    className: classes || undefined,
    onClick
  });
};
