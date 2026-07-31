/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../src/components/keep-elements/keep-consent-item';
import type ConsentItem from '../../../src/components/keep-elements/keep-consent-item';
import { toggleDeleteConsent } from '../../../src/store/consents/action';

vi.mock('../../../src/store/consents/action', () => ({
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
  } as ConsentItem['consent'];
}

const apps = [{ appId: 'app-123', appName: 'Timesheets' }];

/** The directory shape this row reads: one single-key record per user. */
const directory = [
  { ann: { FullName: ['CN=Ann Lee/O=Acme'], InternetAddress: ['ann@acme.test'] } },
];

/**
 * The element renders into the light DOM, so it mounts inside a real `<tbody>` — which is
 * both what the table does and the only place two `<tr>` can legally live.
 */
const tables: HTMLTableElement[] = [];

afterEach(() => {
  tables.forEach((table) => table.remove());
  tables.length = 0;
});

beforeEach(() => {
  vi.mocked(toggleDeleteConsent).mockClear();
});

async function mount(
  consent = makeConsent(),
  { expand = false, users = [] as ConsentItem['users'] } = {},
) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  document.body.appendChild(table);
  tables.push(table);

  const el = document.createElement('keep-consent-item') as ConsentItem;
  Object.assign(el, { consent, apps, users, expand });
  tbody.appendChild(el);
  await el.updateComplete;
  return el;
}

const cell = (selector: string) => document.querySelector(selector)!;
const toggleButton = () => cell('td.expand').querySelector('button')!;
const revokeButton = () =>
  Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent!.trim() === 'Revoke',
  )!;
const textOf = (value: string) =>
  Array.from(document.querySelectorAll('td *')).find((n) => n.textContent!.trim() === value);

/** The `fill` of each status dot, in render order: code expiry, then token expiry. */
const dotColours = () =>
  Array.from(document.querySelectorAll('circle')).map((c) => c.getAttribute('fill'));

describe('keep-consent-item — identity', () => {
  it('registers the custom element', () => {
    expect(customElements.get('keep-consent-item')).toBeTruthy();
  });

  it('renders a data row and a details row', async () => {
    await mount();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('renders those rows in the table, not in a shadow root of its own', async () => {
    // The rows are dressed by keep-data-table's slotted-table sheet and by Web Awesome's
    // table region, and neither can reach into a third tree between the table and its rows.
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(document.querySelectorAll('tbody keep-consent-item tr')).toHaveLength(2);
  });

  it('falls back to the raw username when no directory match exists', async () => {
    await mount();
    expect(cell('td.user').textContent!.trim()).toBe('CN=Ann Lee/O=Acme');
  });

  it('prefers the internet address from the directory', async () => {
    await mount(makeConsent(), { users: directory });
    expect(cell('td.user').textContent!.trim()).toBe('ann@acme.test');
  });

  it('ignores a directory match whose internet address is blank', async () => {
    await mount(makeConsent(), {
      users: [{ ann: { FullName: ['CN=Ann Lee/O=Acme'], InternetAddress: [''] } }],
    });
    expect(cell('td.user').textContent!.trim()).toBe('CN=Ann Lee/O=Acme');
  });

  it('survives a directory that has not loaded yet', async () => {
    await mount(makeConsent(), { users: null });
    expect(cell('td.user').textContent!.trim()).toBe('CN=Ann Lee/O=Acme');
  });

  it('names the granting app', async () => {
    await mount();
    expect(cell('td.app-name').textContent!.trim()).toBe('Timesheets');
  });

  it('shows a dash when the app is unknown', async () => {
    // Scoped to the app-name cell specifically: an unparseable expiry also renders '-', so
    // an unscoped search would still pass if this cell rendered the app name correctly and
    // some other cell happened to show a dash instead.
    await mount(makeConsent({ client_id: 'gone' }));
    expect(cell('td.app-name').textContent!.trim()).toBe('-');
  });
});

describe('keep-consent-item — expiry dots', () => {
  it('is green when both expiries are far off', async () => {
    await mount();
    expect(dotColours()).toEqual(['#0FA068', '#0FA068']);
  });

  it('warns amber within a day of expiry', async () => {
    await mount(makeConsent({ code_expires_at: at(DAY / 2) }));
    expect(dotColours()[0]).toBe('#FFCD41');
  });

  it('goes red once expired', async () => {
    await mount(makeConsent({ code_expires_at: at(-DAY) }));
    expect(dotColours()[0]).toBe('#C3335F');
  });

  it('tracks the token expiry independently', async () => {
    await mount(makeConsent({ refresh_token_expires_at: at(-DAY) }));
    expect(dotColours()).toEqual(['#0FA068', '#C3335F']);
  });

  it('explains an imminent expiry, and stays quiet otherwise', async () => {
    await mount(makeConsent({ code_expires_at: at(DAY / 2) }));
    const tips = Array.from(document.querySelectorAll('keep-tooltip'));
    expect(tips[0].getAttribute('content')).toBe('Expiring in less than a day');
    expect(tips[1].getAttribute('content')).toBe('');
  });

  it('shows a dash for an unparseable expiry', async () => {
    // Scoped to the two expiration-value spans (as opposed to their bold labels) inside the
    // expiration cell, and asserted against both: an unscoped search would also pass if the
    // dash came from the app-name cell instead, and checking only the code-expiry span would
    // not rule out a bug that renders '-' for every expiry.
    await mount(makeConsent({ code_expires_at: 'not-a-date' }));
    const [codeExpiryText, tokenExpiryText] = Array.from(
      cell('td.expiration').querySelectorAll('span.small-text:not(.text-bold)'),
    ).map((el) => el.textContent);
    expect(codeExpiryText).toBe('-');
    expect(tokenExpiryText).not.toBe('-');
  });

  it('labels both expiries', async () => {
    await mount();
    expect(
      Array.from(cell('td.expiration').querySelectorAll('span.text-bold')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['Expiration:', 'Token Expiration:']);
  });
});

describe('keep-consent-item — details', () => {
  it('starts collapsed', async () => {
    await mount();
    expect(textOf('https://example.test/cb')).toBeUndefined();
  });

  it('reveals the redirect url and scopes when expanded', async () => {
    const el = await mount();
    toggleButton().click();
    await el.updateComplete;
    expect(textOf('https://example.test/cb')).toBeTruthy();
    expect(textOf('read')).toBeTruthy();
    expect(textOf('write')).toBeTruthy();
  });

  it('collapses again', async () => {
    // The transition this used to run inside was the reason the old test had to wait for the
    // content to leave the DOM. There is no transition now, so it goes on the next update.
    const el = await mount();
    toggleButton().click();
    await el.updateComplete;
    expect(textOf('https://example.test/cb')).toBeTruthy();

    toggleButton().click();
    await el.updateComplete;
    expect(textOf('https://example.test/cb')).toBeUndefined();
  });

  it('hides the empty detail row rather than leaving it standing (#976)', async () => {
    // It used to stand: the transition this conversion replaced collapsed the row's contents
    // and left the row and its cell behind, padding included, so every closed consent was
    // followed by a 41px empty band with a border of its own and a list read as rows already
    // opened onto nothing. The conversion reproduced that deliberately; #976 is the report
    // that it looks wrong, and this is where the decision changed.
    //
    // Hidden rather than removed, because the disclosure button points `aria-controls` at
    // this row and that reference has to resolve in both states.
    const el = await mount();
    const details = document.querySelector('td[colspan="5"]')!.closest('tr')!;
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(details.hasAttribute('hidden'), 'the collapsed detail row must be hidden').toBe(true);

    toggleButton().click();
    await el.updateComplete;
    expect(details.hasAttribute('hidden'), 'the expanded detail row must not be hidden').toBe(
      false,
    );
  });

  it('keeps the hidden row reachable from aria-controls', async () => {
    // The suite runs with `css: false` and jsdom has no layout, so nothing here can assert
    // that the row takes up no space — that was measured in Chrome, and the rule that does
    // it (`keep-consent-item tr[hidden]`) lives in `consentItemStyles`. What is testable is
    // the half that would break the screen reader: hiding a row by removing it would leave
    // `aria-controls` pointing at an id that no longer exists.
    await mount();
    const controlled = document.getElementById(toggleButton().getAttribute('aria-controls')!);
    expect(controlled, 'aria-controls must resolve while the row is collapsed').toBeTruthy();
    expect(controlled!.hasAttribute('hidden')).toBe(true);
  });

  it('starts expanded when the table asks it to', async () => {
    await mount(makeConsent(), { expand: true });
    expect(textOf('https://example.test/cb')).toBeTruthy();
  });

  it('leaves a row alone until Expand all actually moves', async () => {
    // The flag is an edge, not a level: a row the user collapsed itself stays collapsed
    // when the table re-asserts a value it was already at.
    const el = await mount(makeConsent(), { expand: true });
    toggleButton().click();
    await el.updateComplete;
    expect(textOf('https://example.test/cb')).toBeUndefined();

    el.expand = true;
    await el.updateComplete;
    expect(textOf('https://example.test/cb')).toBeUndefined();
  });

  it('follows Collapse all', async () => {
    const el = await mount(makeConsent(), { expand: true });
    el.expand = false;
    await el.updateComplete;
    expect(textOf('https://example.test/cb')).toBeUndefined();
  });

  it('opens the redirect url in a new tab', async () => {
    await mount(makeConsent(), { expand: true });
    const link = document.querySelector('a')!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('names its disclosure button and says which row it controls', async () => {
    // The control was an unnamed button around a labelled glyph, which announced the icon
    // and said nothing about state.
    const el = await mount();
    expect(toggleButton().getAttribute('aria-label')).toBe('Show consent details');
    expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(toggleButton().getAttribute('aria-controls')!)).toBeTruthy();

    toggleButton().click();
    await el.updateComplete;
    expect(toggleButton().getAttribute('aria-label')).toBe('Hide consent details');
    expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('turns the chevron over with the row', async () => {
    const el = await mount();
    const icon = () => cell('td.expand').querySelector('wa-icon')!;
    expect(icon().getAttribute('name')).toBe('chevron-down');
    toggleButton().click();
    await el.updateComplete;
    expect(icon().getAttribute('name')).toBe('chevron-up');
  });
});

describe('keep-consent-item — revoking', () => {
  it('asks to delete the consent with its app, user and scope', async () => {
    await mount();
    revokeButton().click();
    expect(toggleDeleteConsent).toHaveBeenCalledWith(
      'unid-1',
      'Timesheets',
      'CN=Ann Lee/O=Acme',
      'read,write',
    );
  });

  it('passes an empty app name when the app is unknown', async () => {
    await mount(makeConsent({ client_id: 'gone' }));
    revokeButton().click();
    expect(toggleDeleteConsent).toHaveBeenCalledWith(
      'unid-1',
      '',
      'CN=Ann Lee/O=Acme',
      'read,write',
    );
  });

  it('dispatches the raw username even when the cell shows the resolved one', async () => {
    // With no directory match the raw and resolved usernames are the same string, so neither
    // of the two tests above can tell which one the handler actually sends. This fixture
    // pulls the two values apart and asserts both ends: the cell resolves to the directory's
    // internet address, but the dispatch still carries the raw `consent.username`. The
    // replaced component read the record directly in its click handler, never the resolved
    // local computed for display, so this is deliberate-looking divergence, not a defect.
    await mount(makeConsent(), { users: directory });
    expect(cell('td.user').textContent!.trim()).toBe('ann@acme.test');
    revokeButton().click();
    expect(toggleDeleteConsent).toHaveBeenCalledWith(
      'unid-1',
      'Timesheets',
      'CN=Ann Lee/O=Acme',
      'read,write',
    );
  });
});
