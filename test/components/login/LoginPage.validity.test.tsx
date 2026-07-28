/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

/**
 * #742 regression test for the bug this page actually showed a user.
 *
 * `handleClickLogIn` used to branch on whether the *element* existed rather than on
 * whether it was valid:
 *
 *   if (usernameRef.current?.shadowRoot.querySelector('wa-input')) { mark username }
 *   else if (passwordRef.current?.shadowRoot.querySelector('wa-input')) { mark password }
 *
 * The username element always exists, so the `else if` was unreachable: typing a username
 * and leaving the password blank marked the **username** field invalid and left the
 * password field untouched. It marked it by hand with
 * `setAttribute('data-user-invalid', username.length === 0)`, which put the attribute on
 * the element whatever the value — `"false"` included — because `[attr]` matches presence.
 *
 * These tests drive the real elements and assert WebAwesome's own custom states, which is
 * what the `:state(user-invalid)` styling keys on. jsdom does not implement the `:state()`
 * selector, so they check the state is set, not that a rule matched.
 */

// `getIdpList` / `getKeepIdpActive` fetch on mount. Stub them so the page settles into
// password mode without network access; everything else in the module stays real.
vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  getIdpList: vi.fn(async () => []),
  getKeepIdpActive: vi.fn(async () => false),
}));

const ACCOUNT = { error: false, error401: false, idpLogin: false, errorMessage: '' };

/** The inner `wa-input` of a `keep-input-*` wrapper, found by the id the page gives it. */
const waInput = (id: string) => {
  const host = document.getElementById(id);
  expect(host, `no keep-input element with id="${id}"`).not.toBeNull();
  return host!.shadowRoot!.querySelector('wa-input')!;
};

/** Type into a field the way a user does, so WebAwesome updates its own value. */
const type = (id: string, value: string) => {
  const input = waInput(id);
  const native = input.shadowRoot!.querySelector('input')!;
  native.value = value;
  native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

/**
 * Click LOG IN and flush what follows. `act` wraps the async tail too: when both fields are
 * valid the handler goes on to dispatch the real `login` thunk, whose resolution sets state
 * after the click has returned.
 */
const clickLogIn = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('LOG IN'));
  });
};

describe('LoginPage validity marking (#742)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const renderPage = async () => {
    const { default: LoginPage } = await import('../../../src/components/login/LoginPage');
    let result!: ReturnType<typeof renderWithProviders>;
    // The mount effects resolve the (stubbed) idp list and the passkey probe, each of which
    // sets state. Flushing them inside act() keeps the page settled before assertions and
    // keeps React from warning about updates outside act.
    await act(async () => {
      result = renderWithProviders(<LoginPage />, { preloadedState: { account: ACCOUNT }, route: '/' });
    });
    return result;
  };

  it('renders both fields', async () => {
    await renderPage();
    expect(waInput('form-username')).toBeTruthy();
    expect(waInput('section-password')).toBeTruthy();
  });

  it('marks the password field — not the username — when only the password is blank', async () => {
    await renderPage();
    type('form-username', 'someone');

    await clickLogIn();

    expect(waInput('section-password').customStates.has('user-invalid')).toBe(true);
    expect(waInput('form-username').customStates.has('user-invalid')).toBe(false);
  });

  it('marks the username field when only the username is blank', async () => {
    await renderPage();
    type('section-password', 'a-password');

    await clickLogIn();

    expect(waInput('form-username').customStates.has('user-invalid')).toBe(true);
    expect(waInput('section-password').customStates.has('user-invalid')).toBe(false);
  });

  it('marks both fields when both are blank', async () => {
    await renderPage();

    await clickLogIn();

    expect(waInput('form-username').customStates.has('user-invalid')).toBe(true);
    expect(waInput('section-password').customStates.has('user-invalid')).toBe(true);
  });

  it('marks neither field when both are filled', async () => {
    // The false-positive half of the bug: `setAttribute(name, false)` still added the
    // attribute, so a valid field rendered as invalid.
    await renderPage();
    type('form-username', 'someone');
    type('section-password', 'a-password');

    await clickLogIn();

    expect(waInput('form-username').customStates.has('user-invalid')).toBe(false);
    expect(waInput('section-password').customStates.has('user-invalid')).toBe(false);
  });

  it('sets no data-user-invalid attribute on either field', async () => {
    await renderPage();
    await clickLogIn();

    expect(waInput('form-username').hasAttribute('data-user-invalid')).toBe(false);
    expect(waInput('section-password').hasAttribute('data-user-invalid')).toBe(false);
  });
});
