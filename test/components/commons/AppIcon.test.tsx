/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { AppIcon } from '../../../src/components/commons/AppIcon';
import {
  appIconUri,
  loadAppIcons,
  resetAppIconsForTest,
} from '../../../src/services/app-icons';

/**
 * The three states #772 introduced at every icon site, and why they are distinct:
 *
 *   unknown name  → the caller's fallback, decided on the first render because the *names*
 *                   are still bundled eagerly. An unknown `iconName` is a permanent fact
 *                   about backend data, not a loading state, and must not shimmer.
 *   known, unloaded → a skeleton. Rendering `<img>` here paints a broken-image glyph.
 *   known, loaded → the icon.
 *
 * Collapsing the first two is the tempting simplification and the wrong one: it makes
 * every card with a stale `iconName` pulse forever.
 */
describe('AppIcon', () => {
  afterEach(() => {
    cleanup();
    resetAppIconsForTest();
  });

  it('renders the fallback for a name that is not a known icon', () => {
    render(<AppIcon name="no-such-icon" fallback={<span data-testid="fallback" />} />);

    expect(screen.getByTestId('fallback')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders nothing at all for an unknown name with no fallback', () => {
    const { container } = render(<AppIcon name={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('does not shimmer for an unknown name — that state never resolves', () => {
    const { container } = render(
      <AppIcon name="no-such-icon" fallback={<span data-testid="fallback" />} />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders a placeholder, not an image, while the payloads are in flight', () => {
    const { container } = render(<AppIcon name="beach" alt="db-icon" />);

    expect(screen.queryByAltText('db-icon')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('swaps the placeholder for the icon once the payloads land', async () => {
    const { container } = render(<AppIcon name="beach" alt="db-icon" />);

    await loadAppIcons();
    await waitFor(() => expect(screen.getByAltText('db-icon')).toBeTruthy());

    expect(screen.getByAltText('db-icon').getAttribute('src')).toBe(appIconUri('beach'));
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('keeps the caller class on the element in both states', async () => {
    const { container } = render(<AppIcon name="beach" alt="db-icon" className="h-30px" />);
    expect(container.querySelector('.h-30px')).toBeTruthy();

    await loadAppIcons();
    await waitFor(() => expect(screen.getByAltText('db-icon')).toBeTruthy());

    expect(screen.getByAltText('db-icon').className).toContain('h-30px');
  });

  it('renders through the component given as `as`', async () => {
    const Styled = (props: any) => <img {...props} data-testid="styled" />;
    render(<AppIcon name="beach" alt="db-icon" as={Styled} />);

    await loadAppIcons();
    await waitFor(() => expect(screen.getByTestId('styled')).toBeTruthy());
  });
});
