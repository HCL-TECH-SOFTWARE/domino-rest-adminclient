/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { styled } from '@linaria/react';
import { appIconUri, isAppIconName, useAppIcons } from '../../services/app-icons';

/**
 * Placeholder shown in an icon slot while the payload chunk (#772) is in flight.
 *
 * It takes the same `className` as the icon it stands in for, so it inherits that site's
 * box — the tile never resizes when the real icon arrives. Sites whose class sizes an
 * `img` via `width: auto` get the square below instead of collapsing to zero width.
 */
export const AppIconSkeleton = styled.span`
  @keyframes app-icon-skeleton-sweep {
    to {
      background-position: 0 0;
    }
  }

  display: inline-block;
  min-width: 1em;
  min-height: 1em;
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

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-image: none;
  }
`;

type AppIconProps = {
  /** The persisted `iconName`. Anything outside the 86 known names renders `fallback`. */
  name: string | undefined | null;
  alt?: string;
  className?: string;
  /**
   * Element or component used for the loaded icon — defaults to a plain `img`. Sites with
   * a styled image (`DBImage`, …) pass it here so the icon keeps its own styling.
   */
  as?: React.ElementType;
  /** Rendered when `name` is not a known icon. Nothing by default. */
  fallback?: React.ReactNode;
};

/**
 * One of the 86 application icons, resolved from the lazily loaded payload chunk.
 *
 * Three states, and the distinction matters: an *unknown* name is a permanent condition
 * that shows `fallback` immediately (the names are bundled eagerly, so this is decided on
 * the first render), whereas a *known* name whose payload has not arrived yet is a
 * transient one that shows a skeleton and resolves itself.
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  alt = '',
  className,
  as: Image = 'img',
  fallback = null,
}) => {
  const icons = useAppIcons();

  if (!isAppIconName(name)) return <>{fallback}</>;

  const uri = appIconUri(name, icons);
  if (!uri) return <AppIconSkeleton className={className} aria-hidden="true" />;

  return <Image className={className} src={uri} alt={alt} />;
};

export default AppIcon;
