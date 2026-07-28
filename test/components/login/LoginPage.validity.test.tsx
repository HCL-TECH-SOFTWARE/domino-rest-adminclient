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
 * The marking is now `aria-invalid`, set from the page's own state (#743). These assert
 * the attribute rather than a rule matching: jsdom has no layout or cascade to check.
 */

// `getIdpList` / `getKeepIdpActive` fetch on mount. Stub them so the page settles into
// password mode without network access; everything else in the module stays real.
vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  getIdpList: vi.fn(async () => []),
  getKeepIdpActive: vi.fn(async () => false),
}));

const ACCOUNT = { error: false, error401: false, idpLogin: false, errorMessage: '' };

/**
 * The `wa-input` the page gives this id.
 *
 * It used to be one shadow root further down, inside a `keep-input-text` wrapper whose
 * only job was to render it. The wrapper is gone (#743) and the page renders `wa-input`
 * directly, so the id is on the control itself.
 */
const waInput = (id: string) => {
  const host = document.getElementById(id) as HTMLElementTagNameMap['wa-input'] | null;
  expect(host, `no wa-input with id="${id}"`).not.toBeNull();
  return host!;
};

/** Whether the page has marked this field as failing. */
const isInvalid = (id: string) => waInput(id).getAttribute('aria-invalid') === 'true';

/**
 * Type the way a user does, so WebAwesome updates its value and React sees the input.
 *
 * `act` because the fields are controlled now: the input event sets React state, and the
 * click handler asserted against afterwards closes over it. Without flushing, the handler
 * still holds the values from the render before this call.
 */
const type = async (id: string, value: string) => {
  await act(async () => {
    const native = waInput(id).shadowRoot!.querySelector('input')!;
    native.value = value;
    native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    native.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  });
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
    await type('form-username', 'someone');

    await clickLogIn();

    expect(isInvalid('section-password')).toBe(true);
    expect(isInvalid('form-username')).toBe(false);
  });

  it('marks the username field when only the username is blank', async () => {
    await renderPage();
    await type('section-password', 'a-password');

    await clickLogIn();

    expect(isInvalid('form-username')).toBe(true);
    expect(isInvalid('section-password')).toBe(false);
  });

  it('marks both fields when both are blank', async () => {
    await renderPage();

    await clickLogIn();

    expect(isInvalid('form-username')).toBe(true);
    expect(isInvalid('section-password')).toBe(true);
  });

  it('marks neither field when both are filled', async () => {
    // The false-positive half of the bug: `setAttribute(name, false)` still added the
    // attribute, so a valid field rendered as invalid.
    await renderPage();
    await type('form-username', 'someone');
    await type('section-password', 'a-password');

    await clickLogIn();

    expect(isInvalid('form-username')).toBe(false);
    expect(isInvalid('section-password')).toBe(false);
  });

  it('sets no data-user-invalid attribute on either field', async () => {
    await renderPage();
    await clickLogIn();

    expect(waInput('form-username').hasAttribute('data-user-invalid')).toBe(false);
    expect(waInput('section-password').hasAttribute('data-user-invalid')).toBe(false);
  });
});
