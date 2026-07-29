/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import ConsentItem from '../../../../src/components/applications/kanban/ConsentItem';
import { toggleDeleteConsent } from '../../../../src/store/consents/action';

vi.mock('../../../../src/store/consents/action', () => ({
  toggleDeleteConsent: vi.fn(() => ({ type: 'TOGGLE_DELETE_CONSENT' })),
}));

const DAY = 86_400_000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

function makeConsent(overrides: Record<string, unknown> = {}) {
  return {
    username: 'CN=Ann Lee/O=Acme',
    scope: 'read,write',
    client_id: 'app-123',
    unid: 'unid-1',
    redirect_uri: 'https://example.test/cb',
    code_expires_at: at(7 * DAY),
    refresh_token_expires_at: at(30 * DAY),
    scope_claim: '',
    scope_description: '',
    scope_logo_url: '',
    ...overrides,
  } as any;
}

const apps = [{ appId: 'app-123', appName: 'Timesheets' }];

function renderConsentItem(
  consent = makeConsent(),
  { expand = false, users = [] as any[] } = {},
) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  document.body.appendChild(table);
  return renderWithProviders(<ConsentItem consent={consent} expand={expand} />, {
    container: tbody,
    preloadedState: { apps: { apps }, users: { users } },
  });
}

/** The `fill` of each status dot, in render order: code expiry, then token expiry. */
const dotColours = () =>
  Array.from(document.querySelectorAll('circle')).map((c) => c.getAttribute('fill'));

describe('ConsentItem — identity', () => {
  it('renders a data row and a details row', () => {
    renderConsentItem();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('falls back to the raw username when no directory match exists', () => {
    renderConsentItem();
    expect(screen.getByText('CN=Ann Lee/O=Acme')).toBeInTheDocument();
  });

  it('prefers the internet address from the directory', () => {
    renderConsentItem(makeConsent(), {
      users: [{ ann: { FullName: ['CN=Ann Lee/O=Acme'], InternetAddress: ['ann@acme.test'] } }],
    });
    expect(screen.getByText('ann@acme.test')).toBeInTheDocument();
  });

  it('names the granting app', () => {
    renderConsentItem();
    expect(screen.getByText('Timesheets')).toBeInTheDocument();
  });

  it('shows a dash when the app is unknown', () => {
    renderConsentItem(makeConsent({ client_id: 'gone' }));
    // Scoped to the app-name cell specifically: an unparseable expiry also renders '-', so
    // an unscoped `getByText('-')` would still pass if this cell rendered the app name
    // correctly and some other cell happened to show a dash instead.
    const cell = document.querySelector('td.app-name');
    expect(cell?.textContent).toBe('-');
  });
});

describe('ConsentItem — expiry dots', () => {
  it('is green when both expiries are far off', () => {
    renderConsentItem();
    expect(dotColours()).toEqual(['#0FA068', '#0FA068']);
  });

  it('warns amber within a day of expiry', () => {
    renderConsentItem(makeConsent({ code_expires_at: at(DAY / 2) }));
    expect(dotColours()[0]).toBe('#FFCD41');
  });

  it('goes red once expired', () => {
    renderConsentItem(makeConsent({ code_expires_at: at(-DAY) }));
    expect(dotColours()[0]).toBe('#C3335F');
  });

  it('tracks the token expiry independently', () => {
    renderConsentItem(makeConsent({ refresh_token_expires_at: at(-DAY) }));
    expect(dotColours()).toEqual(['#0FA068', '#C3335F']);
  });

  it('shows a dash for an unparseable expiry', () => {
    renderConsentItem(makeConsent({ code_expires_at: 'not-a-date' }));
    // Scoped to the two expiration-value spans (as opposed to their bold labels) inside
    // the expiration cell, and asserted against both: an unscoped `getAllByText('-')` would
    // also pass if the dash came from the app-name cell instead, and checking only the
    // code-expiry span would not rule out a bug that renders '-' for every expiry.
    const expirationCell = document.querySelector('td.expiration')!;
    const [codeExpiryText, tokenExpiryText] = Array.from(
      expirationCell.querySelectorAll('span.small-text:not(.text-bold)'),
    ).map((el) => el.textContent);
    expect(codeExpiryText).toBe('-');
    expect(tokenExpiryText).not.toBe('-');
  });
});

describe('ConsentItem — details', () => {
  it('starts collapsed', () => {
    renderConsentItem();
    expect(screen.queryByText('https://example.test/cb')).not.toBeInTheDocument();
  });

  it('reveals the redirect url and scopes when expanded', () => {
    renderConsentItem();
    fireEvent.click(document.querySelector('td.expand button')!);
    expect(screen.getByText('https://example.test/cb')).toBeInTheDocument();
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('write')).toBeInTheDocument();
  });

  it('collapses again', async () => {
    renderConsentItem();
    const cell = document.querySelector('td.expand')!;
    fireEvent.click(cell.querySelector('button')!);
    expect(screen.getByText('https://example.test/cb')).toBeInTheDocument();
    fireEvent.click(cell.querySelector('button')!);
    // MUI's Collapse only unmounts its `unmountOnExit` children once the exit transition's
    // `onExited` fires, which happens on a real (short, auto-computed) timeout rather than
    // synchronously with the click. Immediately after the second click the content is still
    // present — and, notably, `toBeVisible()` cannot tell: jest-dom's implementation checks
    // `display`/`visibility`/`opacity`, not the inline `height: 0` MUI sets mid-transition, so
    // that assertion would report the row visible either way. `waitFor` uses real timers (no
    // `vi.useFakeTimers()`) to observe the transition actually complete.
    await waitFor(() =>
      expect(screen.queryByText('https://example.test/cb')).not.toBeInTheDocument(),
    );
  });

  it('starts expanded when the table asks it to', () => {
    renderConsentItem(makeConsent(), { expand: true });
    expect(screen.getByText('https://example.test/cb')).toBeInTheDocument();
  });

  it('opens the redirect url in a new tab', () => {
    renderConsentItem(makeConsent(), { expand: true });
    const link = screen.getByText('https://example.test/cb') as HTMLAnchorElement;
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});

describe('ConsentItem — revoking', () => {
  it('asks to delete the consent with its app, user and scope', () => {
    renderConsentItem();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(toggleDeleteConsent).toHaveBeenCalledWith(
      'unid-1',
      'Timesheets',
      'CN=Ann Lee/O=Acme',
      'read,write',
    );
  });

  it('passes an empty app name when the app is unknown', () => {
    renderConsentItem(makeConsent({ client_id: 'gone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(toggleDeleteConsent).toHaveBeenCalledWith(
      'unid-1',
      '',
      'CN=Ann Lee/O=Acme',
      'read,write',
    );
  });
});
