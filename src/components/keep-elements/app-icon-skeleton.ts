/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';

/**
 * The one icon placeholder. It used to be half of a pair: this module and a styled span
 * of the same name in `components/commons/AppIcon.tsx`, which existed only because a
 * document-level rule cannot reach inside these shadow roots. That component is now
 * `keep-app-icon` and shares this one, so the pair has collapsed (#806).
 *
 * Used by every element that paints an app icon: `keep-app-icon` itself, `keep-default-card`
 * (whose `icon` property is empty until the caller can resolve it), `keep-nsf-card` and
 * `keep-icon-dropdown` (which load the payloads themselves), and `keep-slim-database-card`.
 * All need it for the same reason — #772 put the 219 KB icon map behind a dynamic
 * `import()`, so there is a window where the name is known and the payload is not.
 */
export const appIconSkeletonStyles = css`
  @keyframes app-icon-skeleton-sweep {
    to {
      background-position: 0 0;
    }
  }

  .app-icon-skeleton {
    display: inline-block;
    aspect-ratio: 1;
    border-radius: 8px;
    /* The base is the border token, not a surface token: a surface-coloured tile is
       invisible against the surface it sits on, which in light mode leaves only the
       highlight band showing and reads as a stray diagonal stripe. */
    background-color: var(--wa-color-surface-border);
    background-image: linear-gradient(
      90deg,
      transparent 20%,
      var(--wa-color-surface-raised) 50%,
      transparent 80%
    );
    background-size: 300% 100%;
    background-position: 100% 0;
    animation: app-icon-skeleton-sweep 1.4s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .app-icon-skeleton {
      animation: none;
      background-image: none;
    }
  }
`;

/** The placeholder itself. Sized by the host element's own `.app-icon-skeleton` rule. */
export const appIconSkeleton = () => html`<div class="app-icon-skeleton" aria-hidden="true"></div>`;
