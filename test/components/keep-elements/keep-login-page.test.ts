/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import {
  set401Error,
  setErrorMessage,
  setIdpLogin,
  setLoginError,
  logout,
} from '../../../src/store/account/reducer';
// `setLoginError` twice on purpose: the store setup below needs the real creator, and the
// assertions need the spy the element actually calls, which is the action module's copy.
import {
  getIdpList,
  getKeepIdpActive,
  login,
  setLoginError as setLoginErrorSpy,
} from '../../../src/store/account/action';
import { initiateAuthorizationRequest } from '../../../src/components/login/pkce';
import '../../../src/components/keep-elements/keep-login-page';
import type LoginPage from '../../../src/components/keep-elements/keep-login-page';

/**
 * The login screen (#806 wave 6), converted from `components/login/LoginPage.tsx`.
 *
 * This is the port of three suites — `LoginPage.form`, `LoginPage.validity` and
 * `LoginPage.layout` — onto the element. Everything they asserted is here, except two things
 * that could not survive and are called out where they were:
 *
 * 1. **"imports neither Formik nor Yup".** The Formik half is kept below. The Yup half is
 *    gone on purpose: yup is the schema behind `FormController` now (#807), i.e. the actual
 *    validator, which is the opposite of the decorative pairing that guard was written
 *    against — there, the rules ran over values the user had never touched.
 * 2. **The class-name assertions on the page's boxes.** `.login-page-grid` and friends were
 *    document-scope classes; a class rule in that sheet cannot reach into a shadow root, so
 *    the rules are deleted and the structure is asserted through the shadow root instead.
 *
 * Everything else moves across unchanged in meaning: which fields each mode renders, the
 * three auth paths, the 401 marking, the error alert, the submit control Enter needs, and
 * the passkey prefill.
 *
 * **Layout fidelity is not asserted and cannot be.** `vitest.config.ts` sets `css: false`
 * and jsdom has no layout engine, so nothing here can tell a 60/40 grid from anything else.
 * The 767/768/769px behaviour and both colour modes need a browser.
 */

vi.mock('../../../src/store/account/action', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/store/account/action')>();
  return {
    ...actual,
    getIdpList: vi.fn(async () => []),
    getKeepIdpActive: vi.fn(async () => false),
    // Returns a thunk, so the real `login` never reaches the network. Asserting on the
    // arguments is the point: they are what the form hands over.
    login: vi.fn(() => async () => {}),
    // Spied but otherwise real, so the store still moves.
    setLoginError: vi.fn(actual.setLoginError),
  };
});

vi.mock('../../../src/components/login/pkce', () => ({
  initiateAuthorizationRequest: vi.fn(async () => true),
}));

const passkeyLogin = vi.fn(async () => new Response('{}', { status: 200 }));
const passkeyRegister = vi.fn(async () => new Response('{}', { status: 200 }));
vi.mock('../../../src/components/login/KeepWebAuthN', () => ({
  WebAuthn: class {
    login = passkeyLogin;
    register = passkeyRegister;
  },
}));

const TAG = 'keep-login-page';

/** Obviously fake. Nothing in this file may be a value anyone could type in anger. */
const USERNAME = 'not-a-real-user';
const SECRET = 'not-a-real-secret';

const IDP = {
  name: 'Corporate SSO',
  wellKnown: 'https://idp.example/.well-known/openid-configuration',
  adminui_config: { active: true, client_id: 'admin-ui' },
};

const realLocation = window.location;

/** The passkey and OIDC buttons render only under https; the jsdom document is http. */
const asHttps = () => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, protocol: 'https:', href: 'https://host.example/admin/ui/' },
  });
};

/** Let the mount fetches, the store writes and the renders they cause all settle. */
const settle = async (el: LoginPage) => {
  for (let i = 0; i < 6; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  }
};

const mount = async () => {
  const el = await mountLit<LoginPage>(TAG);
  await settle(el);
  return el;
};

type WaInput = HTMLElement & { value: string; hint: string };

/** The `wa-input` the page gives this id, or `null` when the mode does not render it. */
const field = (el: LoginPage, id: string) =>
  el.shadowRoot!.querySelector(`#${id}`) as WaInput | null;

const waInput = (el: LoginPage, id: string) => {
  const found = field(el, id);
  expect(found, `no wa-input with id="${id}"`).not.toBeNull();
  return found!;
};

/** Whether the page has marked this field as failing. */
const isInvalid = (el: LoginPage, id: string) =>
  field(el, id)?.getAttribute('aria-invalid') === 'true';

/** Type the way a user does, so Web Awesome updates its value and the form sees the input. */
const type = async (el: LoginPage, id: string, value: string) => {
  const native = waInput(el, id).shadowRoot!.querySelector('input')!;
  native.value = value;
  native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  native.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  await settle(el);
};

const buttonLabelled = (el: LoginPage, label: string) =>
  [...el.shadowRoot!.querySelectorAll('keep-button')].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLElement | undefined;

const click = async (el: LoginPage, label: string) => {
  const button = buttonLabelled(el, label);
  expect(button, `no button labelled "${label}"`).toBeDefined();
  button!.click();
  await settle(el);
};

const loginForm = (el: LoginPage) => el.shadowRoot!.querySelector('form') as HTMLFormElement;

describe('keep-login-page', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    store.dispatch(logout());
    store.dispatch(set401Error(false));
    store.dispatch(setIdpLogin(false));
    store.dispatch(setLoginError(false));
    store.dispatch(setErrorMessage(''));
    vi.mocked(getIdpList).mockResolvedValue([] as never);
    vi.mocked(getKeepIdpActive).mockResolvedValue(false as never);
    vi.mocked(initiateAuthorizationRequest).mockResolvedValue(true as never);
    vi.mocked(login).mockClear();
    vi.mocked(setLoginErrorSpy).mockClear();
    passkeyLogin.mockReset();
    passkeyLogin.mockResolvedValue(new Response('{}', { status: 200 }));
    passkeyRegister.mockReset();
    passkeyRegister.mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    cleanupLit();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    store.dispatch(logout());
    // `keep-alert` is a top-layer popover toast: it moves itself to `document.body`, which is
    // outside what cleanupLit clears, so it would leak into the next test's assertions.
    document.querySelectorAll('keep-alert').forEach((el) => el.remove());
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('which fields each mode renders', () => {
    it('shows username and password in password mode', async () => {
      const el = await mount();
      expect(field(el, 'form-username')).not.toBeNull();
      expect(field(el, 'section-password')).not.toBeNull();
      expect(field(el, 'form-oidc')).toBeNull();
    });

    it('drops the password field in passkey mode', async () => {
      asHttps();
      const el = await mount();
      await click(el, 'LOG IN WITH PASSKEY');
      expect(field(el, 'form-username')).not.toBeNull();
      expect(field(el, 'section-password')).toBeNull();
    });

    it('drops both text fields in OIDC mode and shows the dropdown', async () => {
      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      vi.mocked(getKeepIdpActive).mockResolvedValue(true as never);
      const el = await mount();

      await click(el, 'LOG IN WITH OIDC');

      expect(field(el, 'form-username')).toBeNull();
      expect(field(el, 'section-password')).toBeNull();
      expect(field(el, 'form-oidc')).not.toBeNull();
    });

    it('drops the passkey sign-up row outside password mode', async () => {
      asHttps();
      const el = await mount();
      expect(el.shadowRoot!.querySelector('.signup-button')).not.toBeNull();
      await click(el, 'LOG IN WITH PASSKEY');
      expect(el.shadowRoot!.querySelector('.signup-button')).toBeNull();
    });

    it('hides the passkey buttons outside a secure context', async () => {
      // WebAuthn needs one, and the jsdom document is served over http.
      const el = await mount();
      expect(buttonLabelled(el, 'LOG IN WITH PASSKEY')).toBeUndefined();
      expect(el.shadowRoot!.querySelector('.signup-button')).toBeNull();
    });

    it('offers no OIDC button when the server has no providers to offer', async () => {
      // `displayKeepIdp` is true here because the list came back empty, which is the case
      // the button is *for* — the built-in provider.
      const el = await mount();
      expect(buttonLabelled(el, 'LOG IN WITH OIDC')).toBeDefined();

      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      vi.mocked(getKeepIdpActive).mockResolvedValue(false as never);
      const other = await mount();
      expect(buttonLabelled(other, 'LOG IN WITH OIDC')).toBeUndefined();
    });

    it('leaves no element hidden by the retired classes', async () => {
      // The mechanism this replaced toggled `.hidden`/`.removed` through getElementById. A
      // field is either rendered or it is not.
      asHttps();
      const el = await mount();
      await click(el, 'LOG IN WITH PASSKEY');
      expect(el.shadowRoot!.querySelectorAll('.hidden, .removed')).toHaveLength(0);
    });

    it('restores the stored login type on mount', async () => {
      localStorage.setItem('login_type', 'passkey');
      asHttps();
      const el = await mount();
      expect(field(el, 'section-password')).toBeNull();
    });
  });

  describe('password login', () => {
    it('dispatches login with what the user typed', async () => {
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);

      await click(el, 'LOG IN');

      expect(login).toHaveBeenCalledWith(
        { username: USERNAME, password: SECRET },
        expect.any(Function),
      );
    });

    it('records the login type and asks the host to leave once the server accepts', async () => {
      const el = await mount();
      const left = vi.fn();
      el.addEventListener('login-success', left);
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);
      await click(el, 'LOG IN');

      // The success callback the thunk invokes. The element cannot navigate (#926), so this
      // event is the step that used to be `navigate('/')`.
      const onSuccess = vi.mocked(login).mock.calls[0][1];
      onSuccess();

      expect(localStorage.getItem('login_type')).toBe('password');
      expect(left).toHaveBeenCalledTimes(1);
    });

    it('does not dispatch login when the password is blank', async () => {
      const el = await mount();
      await type(el, 'form-username', USERNAME);

      await click(el, 'LOG IN');

      expect(login).not.toHaveBeenCalled();
    });

    it('does not dispatch login when both fields are blank', async () => {
      const el = await mount();
      await click(el, 'LOG IN');
      expect(login).not.toHaveBeenCalled();
    });

    it('keeps the password field a password field, with its reveal toggle', async () => {
      // The whole reason this screen gets its own conversion review. Losing either the type
      // or the toggle is invisible in a green suite and obvious to a user.
      const el = await mount();
      const password = waInput(el, 'section-password');
      expect(password.getAttribute('type')).toBe('password');
      expect(password.hasAttribute('password-toggle')).toBe(true);
    });
  });

  describe('validity marking (#742)', () => {
    // The bug this screen actually showed a user: the branch tested whether the *element*
    // existed rather than whether it held anything, so a blank password marked the username.
    it('marks the password field — not the username — when only the password is blank', async () => {
      const el = await mount();
      await type(el, 'form-username', USERNAME);

      await click(el, 'LOG IN');

      expect(isInvalid(el, 'section-password')).toBe(true);
      expect(isInvalid(el, 'form-username')).toBe(false);
    });

    it('marks the username field when only the username is blank', async () => {
      const el = await mount();
      await type(el, 'section-password', SECRET);

      await click(el, 'LOG IN');

      expect(isInvalid(el, 'form-username')).toBe(true);
      expect(isInvalid(el, 'section-password')).toBe(false);
    });

    it('marks both fields when both are blank', async () => {
      const el = await mount();

      await click(el, 'LOG IN');

      expect(isInvalid(el, 'form-username')).toBe(true);
      expect(isInvalid(el, 'section-password')).toBe(true);
    });

    it('marks neither field when both are filled', async () => {
      // The false-positive half of the bug: setting the attribute to `false` still added it,
      // so a valid field rendered as invalid.
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);

      await click(el, 'LOG IN');

      expect(isInvalid(el, 'form-username')).toBe(false);
      expect(isInvalid(el, 'section-password')).toBe(false);
    });

    it('sets no data-user-invalid attribute on either field', async () => {
      const el = await mount();
      await click(el, 'LOG IN');

      expect(waInput(el, 'form-username').hasAttribute('data-user-invalid')).toBe(false);
      expect(waInput(el, 'section-password').hasAttribute('data-user-invalid')).toBe(false);
    });

    it('announces the failure rather than only colouring it', async () => {
      // The message rides in `hint`, which wa-input points aria-describedby at.
      const el = await mount();
      await click(el, 'LOG IN');
      expect(waInput(el, 'form-username').hint).toBe('Enter your username');
      expect(waInput(el, 'section-password').hint).toBe('Enter your password');
    });

    it('clears a field message when that field is edited', async () => {
      // Narrower than the version this replaces, which cleared the whole map on any edit:
      // typing a username while the password box is still empty no longer hides the
      // password's message. FormController clears one field at a time.
      const el = await mount();
      await click(el, 'LOG IN');

      await type(el, 'form-username', USERNAME);

      expect(isInvalid(el, 'form-username')).toBe(false);
      expect(isInvalid(el, 'section-password')).toBe(true);
    });
  });

  describe('passkey login', () => {
    it('authenticates with the username alone', async () => {
      asHttps();
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await click(el, 'LOG IN WITH PASSKEY');
      await click(el, 'LOG IN');

      expect(passkeyLogin).toHaveBeenCalledWith({ name: USERNAME });
      expect(login).not.toHaveBeenCalled();
      expect(localStorage.getItem('login_type')).toBe('passkey');
    });

    it('does not authenticate with a blank username', async () => {
      asHttps();
      const el = await mount();
      await click(el, 'LOG IN WITH PASSKEY');
      await click(el, 'LOG IN');
      expect(passkeyLogin).not.toHaveBeenCalled();
    });

    it('keeps the typed username when the mode changes', async () => {
      // The values live in the form controller, not in the element that renders them, so a
      // mode change — which unmounts the field — cannot lose them.
      asHttps();
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await click(el, 'LOG IN WITH PASSKEY');
      expect(waInput(el, 'form-username').value).toBe(USERNAME);
    });

    it('reports a rejected passkey rather than failing silently', async () => {
      // A fresh Response per call: a body can only be read once.
      passkeyLogin.mockImplementation(
        async () =>
          new Response(JSON.stringify({ status: 401, message: 'no credential' }), {
            status: 200,
          }),
      );
      asHttps();
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await click(el, 'LOG IN WITH PASSKEY');
      await click(el, 'LOG IN');

      expect(store.getState().alert.message).toBe('no credential');
      expect(store.getState().account.authenticated).toBe(false);
    });

    it('authenticates the session when the passkey is accepted', async () => {
      passkeyLogin.mockImplementation(
        async () => new Response(JSON.stringify({ access_token: 'not-a-real-token' }), { status: 200 }),
      );
      asHttps();
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await click(el, 'LOG IN WITH PASSKEY');
      await click(el, 'LOG IN');

      expect(store.getState().account.authenticated).toBe(true);
      expect(JSON.parse(localStorage.getItem('user_token')!)).toEqual({
        access_token: 'not-a-real-token',
      });
    });
  });

  describe('passkey sign-up', () => {
    const signUp = async (el: LoginPage) => {
      const button = el.shadowRoot!.querySelector('.signup-button') as HTMLButtonElement;
      expect(button, 'no sign-up control').not.toBeNull();
      button.click();
      await settle(el);
    };

    it('is a real button, not a span inside one', async () => {
      // It used to be a `<span onClick>` inside a `<button>` that also wrapped an anchor —
      // invalid nesting, and no keyboard path to the only thing that did anything.
      asHttps();
      const el = await mount();
      const button = el.shadowRoot!.querySelector('.signup-button') as HTMLButtonElement;
      expect(button.localName).toBe('button');
      expect(button.type).toBe('button');
      expect(button.textContent?.trim()).toBe('Sign up with Passkey');
      // `type="button"`, because a button in a form defaults to submit and this one would
      // otherwise be the form's first submit control — which is how Enter in a field came to
      // submit the sign-up button and navigate the credentials away (#809).
      expect(el.shadowRoot!.querySelector('a[href="https://passkey.org"] button')).toBeNull();
    });

    it('registers the passkey once the credentials are accepted', async () => {
      passkeyRegister.mockImplementation(
        async () => new Response(JSON.stringify({ username: USERNAME }), { status: 200 }),
      );
      asHttps();
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);

      await signUp(el);

      expect(localStorage.getItem('use_keep_webauth')).toBe('true');
      expect(localStorage.getItem('keep_user')).toBe(USERNAME);
      expect(store.getState().account.authenticated).toBe(true);
    });

    it('validates before it authenticates', async () => {
      asHttps();
      const el = await mount();

      await signUp(el);

      expect(passkeyRegister).not.toHaveBeenCalled();
      expect(isInvalid(el, 'form-username')).toBe(true);
      expect(isInvalid(el, 'section-password')).toBe(true);
    });

    it('reports a rejected password as a message, not as an object', async () => {
      // `toggleAlert` takes a string; the catch receives `unknown`, so passing it straight
      // through renders the alert as "[object Object]" for anything not already a string.
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify({ status: 401, message: 'nope' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })),
      );
      asHttps();
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);

      await signUp(el);

      expect(store.getState().alert.message).toBe('nope');
      expect(passkeyRegister).not.toHaveBeenCalled();
    });

    it('is disabled when the built-in provider is not on offer', async () => {
      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      vi.mocked(getKeepIdpActive).mockResolvedValue(false as never);
      asHttps();
      const el = await mount();
      const button = el.shadowRoot!.querySelector('.signup-button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });

  describe('OIDC login', () => {
    beforeEach(() => {
      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      vi.mocked(getKeepIdpActive).mockResolvedValue(true as never);
    });

    it('starts the authorization request for the selected provider', async () => {
      const el = await mount();
      await click(el, 'LOG IN WITH OIDC');

      await click(el, 'LOG IN');

      expect(initiateAuthorizationRequest).toHaveBeenCalledWith(
        IDP.wellKnown,
        IDP.adminui_config.client_id,
        expect.stringContaining('/admin/ui/callback'),
        '',
      );
    });

    it('stores what the callback page needs', async () => {
      const el = await mount();
      await click(el, 'LOG IN WITH OIDC');
      await click(el, 'LOG IN');

      expect(localStorage.getItem('oidc_config_url')).toBe(IDP.wellKnown);
      expect(localStorage.getItem('client_id')).toBe('admin-ui');
      expect(sessionStorage.getItem('redirect_uri')).toContain('/admin/ui/callback');
    });

    it('requests the .default scope when the provider declares an application id uri', async () => {
      vi.mocked(getIdpList).mockResolvedValue([
        { ...IDP, adminui_config: { ...IDP.adminui_config, application_id_uri: 'api://admin-ui/' } },
      ] as never);
      const el = await mount();
      await click(el, 'LOG IN WITH OIDC');

      await click(el, 'LOG IN');

      expect(initiateAuthorizationRequest).toHaveBeenCalledWith(
        IDP.wellKnown,
        'admin-ui',
        expect.any(String),
        'api://admin-ui/.default',
      );
    });

    it('opens the error dialog when the request cannot be started', async () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      vi.mocked(initiateAuthorizationRequest).mockResolvedValue(false as never);
      const el = await mount();
      await click(el, 'LOG IN WITH OIDC');

      await click(el, 'LOG IN');

      // The stubs in setupTests are shared across every dialog in the tree, so this counts
      // calls made against this page's dialog rather than the total.
      const dialog = el
        .shadowRoot!.querySelector('keep-api-error-dialog')!
        .shadowRoot!.querySelector('dialog');
      expect(showModal.mock.contexts).toContain(dialog);
    });

    it('records nothing when no configured provider matches the selection', async () => {
      // `keep-dropdown` seeds its own selection from the first choice, so this should not be
      // reachable — it is guarded because the alternative is a TypeError two frames down.
      const el = await mount();
      await click(el, 'LOG IN WITH OIDC');
      const dropdown = el.shadowRoot!.querySelector('#form-oidc') as HTMLElement & {
        selected?: string;
      };
      dropdown.selected = 'A provider nobody configured';
      await settle(el);

      await click(el, 'LOG IN');

      expect(initiateAuthorizationRequest).not.toHaveBeenCalled();
    });
  });

  describe('rejected credentials', () => {
    /**
     * `error401` is true on the *first* render here, which is the case both previous versions
     * dropped silently: the host dispatches a token renewal on mount and a 401 from it lands
     * in the same commit, and each wrote to a `wa-input` that had not rendered yet.
     */
    const mountRejected = async () => {
      store.dispatch(set401Error(true));
      return mount();
    };

    it('marks both fields when the server returns 401', async () => {
      // Neither field is empty-invalid — the server rejected the *pair* — so this is the
      // page's own error, not a required violation.
      const el = await mountRejected();

      expect(isInvalid(el, 'form-username')).toBe(true);
      expect(isInvalid(el, 'section-password')).toBe(true);
      expect(waInput(el, 'form-username').hint).toBe('Incorrect username or password');
      expect(waInput(el, 'section-password').hint).toBe('Incorrect username or password');
    });

    it('clears the rejection as soon as a field is edited', async () => {
      const el = await mountRejected();
      await type(el, 'form-username', USERNAME);

      expect(isInvalid(el, 'form-username')).toBe(false);
      expect(isInvalid(el, 'section-password')).toBe(false);
    });

    it('leaves the fields alone when the 401 came from an IdP login', async () => {
      store.dispatch(setIdpLogin(true));
      const el = await mountRejected();
      expect(isInvalid(el, 'form-username')).toBe(false);
    });

    it('clears the rejection on the next attempt', async () => {
      // Otherwise one bad password leaves both fields red for the rest of the session.
      const el = await mountRejected();
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);

      await click(el, 'LOG IN');

      expect(isInvalid(el, 'form-username')).toBe(false);
      expect(isInvalid(el, 'section-password')).toBe(false);
      expect(login).toHaveBeenCalledOnce();
    });
  });

  describe('the login error alert', () => {
    /**
     * The alert is queried from this element's shadow root, not the document (#952). It used
     * to relocate itself into `document.body` on first show; it does not any more, and the
     * Popover API — which is what actually put it in the top layer — never needed it to.
     */
    it('is shown for a failed login', async () => {
      store.dispatch(setLoginError(true));
      store.dispatch(setErrorMessage('401 error: bad credentials'));
      const el = await mount();

      const alert = el.shadowRoot!.querySelector('keep-alert') as HTMLElement & {
        message: string;
        heading: string;
      };
      expect(alert).not.toBeNull();
      expect(alert.message).toBe('401 error: bad credentials');
      expect(alert.heading).toBe('Error logging in!');
    });

    it('is rendered but silent when there is no error', async () => {
      // The element is always in the tree now and shows itself on demand, rather than being
      // conditionally rendered for keep-alert to auto-show off a message binding (#952). So
      // "not shown" is an empty message, not an absent element.
      const el = await mount();
      const alert = el.shadowRoot!.querySelector('keep-alert') as HTMLElement & {
        message: string;
      };
      expect(alert, 'the alert element should always be rendered').not.toBeNull();
      expect(alert.message).toBe('');
    });

    it('is cleared when the user edits the password', async () => {
      store.dispatch(setLoginError(true));
      const el = await mount();
      vi.mocked(setLoginErrorSpy).mockClear();

      await type(el, 'section-password', SECRET);

      expect(setLoginErrorSpy).toHaveBeenCalledWith(false);
    });

    it('is cleared when the username is edited too', async () => {
      // The half the version this replaces missed for years: only the username was wired to
      // the handler that did this.
      store.dispatch(setLoginError(true));
      const el = await mount();
      vi.mocked(setLoginErrorSpy).mockClear();

      await type(el, 'form-username', USERNAME);

      expect(setLoginErrorSpy).toHaveBeenCalledWith(false);
    });
  });

  /**
   * #809 — Enter in a field did not log anyone in.
   *
   * ⚠️ **The keystroke itself cannot be tested here, and these do not pretend to.**
   *
   * jsdom does not implement form association for custom elements: `formAssociated` is true
   * and `attachInternals()` returns an object, but `internals.form` is always `null` and a
   * `wa-input` never appears in `form.elements`. So Web Awesome's `submitOnEnter` cannot find
   * the form, gives up, and a synthetic `keydown` produces nothing — in jsdom, and only in
   * jsdom. Driving it with one would have measured the environment.
   *
   * What is split out instead is the *search* — that the form offers exactly one control
   * matching Web Awesome's own predicate — and the *consequence*, `requestSubmit`, which is
   * the literal call it makes once the search succeeds. The join between them is
   * `internals.form`, which belongs to the library. **Enter in a real browser is still a
   * manual check.**
   */
  describe('submitting with Enter (#809)', () => {
    const submitByEnter = async (el: LoginPage) => {
      const form = loginForm(el);
      const submitter = [...form.elements].find(
        (control) =>
          (control as HTMLButtonElement).type === 'submit' && !control.matches(':disabled'),
      ) as HTMLButtonElement | undefined;
      // Fail loudly rather than submitting with no submitter, which is a different code path
      // and would keep passing after a regression.
      expect(submitter, 'no submit control for Enter to find').toBeDefined();
      form.requestSubmit(submitter);
      await settle(el);
    };

    it('logs in with what the user typed', async () => {
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);

      await submitByEnter(el);

      expect(login).toHaveBeenCalledWith(
        { username: USERNAME, password: SECRET },
        expect.any(Function),
      );
    });

    it('does not navigate away, which is what used to lose the credentials', async () => {
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await type(el, 'section-password', SECRET);

      const submitted = vi.fn();
      loginForm(el).addEventListener('submit', submitted);
      await submitByEnter(el);

      expect(submitted).toHaveBeenCalledTimes(1);
      expect(submitted.mock.calls[0][0].defaultPrevented).toBe(true);
    });

    it('takes the same validation path as the button', async () => {
      const el = await mount();
      await type(el, 'form-username', USERNAME);

      await submitByEnter(el);

      expect(login).not.toHaveBeenCalled();
      expect(isInvalid(el, 'section-password')).toBe(true);
    });

    it('respects the current mode rather than always attempting a password login', async () => {
      asHttps();
      const el = await mount();
      await type(el, 'form-username', USERNAME);
      await click(el, 'LOG IN WITH PASSKEY');

      await submitByEnter(el);

      expect(passkeyLogin).toHaveBeenCalledWith({ name: USERNAME });
      expect(login).not.toHaveBeenCalled();
    });

    it('offers exactly one control for the search to select', async () => {
      // Web Awesome's own predicate, copied from `internal/submit-on-enter.ts`, so this fails
      // if the form stops offering what that function looks for, whatever the reason.
      const el = await mount();
      const submitters = [...loginForm(el).elements].filter(
        (control) =>
          (control as HTMLButtonElement).type === 'submit' && !control.matches(':disabled'),
      );

      expect(submitters).toHaveLength(1);
      // localName decides the branch: "button" is requestSubmit'd, anything else is click'ed,
      // and a click on the LOG IN button would double-fire against its own handler.
      expect(submitters[0].localName).toBe('button');
    });

    it('keeps that control hidden, and says so in its own styles', async () => {
      // #937: Web Awesome gives bare buttons a display from an author-origin layer, which
      // outranks the user-agent rule and turned this control into a dark square under LOG IN.
      // That layer cannot reach into this shadow root — but the rule is stated here anyway,
      // because nothing else in the file would say the control depends on it.
      const el = await mount();
      const submitter = loginForm(el).querySelector('button[type="submit"]')!;
      expect(submitter.hasAttribute('hidden')).toBe(true);
      expect(submitter.getAttribute('aria-hidden')).toBe('true');

      const styleText = (
        el.constructor as unknown as { styles: { cssText: string } }
      ).styles.cssText;
      expect(styleText).toMatch(/\[hidden\]\s*\{\s*display:\s*none/);
    });
  });

  describe('passkey prefill', () => {
    beforeEach(() => {
      localStorage.setItem('use_keep_webauth', 'true');
      localStorage.setItem('keep_user', 'remembered-user');
    });

    it('fills the username from the last passkey registration', async () => {
      const el = await mount();
      expect(waInput(el, 'form-username').value).toBe('remembered-user');
    });

    it('survives a trip through OIDC mode, which unmounts the field', async () => {
      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      vi.mocked(getKeepIdpActive).mockResolvedValue(true as never);
      const el = await mount();
      await click(el, 'LOG IN WITH OIDC');
      expect(field(el, 'form-username')).toBeNull();

      await click(el, 'LOG IN WITH PASSWORD');

      expect(waInput(el, 'form-username').value).toBe('remembered-user');
    });

    it('does not fill anything when no passkey is registered', async () => {
      localStorage.removeItem('use_keep_webauth');
      const el = await mount();
      expect(waInput(el, 'form-username').value).toBe('');
    });

    it('does not fill anything when the server no longer accepts passkeys', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
      const el = await mount();
      expect(waInput(el, 'form-username').value).toBe('');
    });
  });

  describe('the theme toggle', () => {
    it('renders the glyph for the current mode, with an accessible name', async () => {
      const el = await mount();
      const toggle = el.shadowRoot!.querySelector('keep-tooltip button') as HTMLElement;
      expect(toggle).not.toBeNull();
      // The graphic is inside wa-icon's own shadow root, so the glyph name is what can be
      // asserted here — narrower than "some svg exists", not weaker.
      const icon = toggle.querySelector('wa-icon') as HTMLElement & { name?: string };
      expect(icon).not.toBeNull();
      expect(icon.name).toBe('sun');
      expect(icon.getAttribute('label')).toBe('Switch to Dark Mode');
    });

    it('switches the stored theme and the glyph', async () => {
      const el = await mount();
      const toggle = el.shadowRoot!.querySelector('.theme-toggle') as HTMLButtonElement;
      toggle.click();
      await settle(el);

      expect(localStorage.getItem('theme')).toBe('dark');
      expect((toggle.querySelector('wa-icon') as HTMLElement & { name?: string }).name).toBe(
        'moon',
      );

      toggle.click();
      await settle(el);
      expect(localStorage.getItem('theme')).toBe('default');
    });

    it('starts dark when that is what was stored', async () => {
      localStorage.setItem('theme', 'dark');
      const el = await mount();
      const icon = el.shadowRoot!.querySelector('wa-icon') as HTMLElement & { name?: string };
      expect(icon.name).toBe('moon');
    });

    it('is not a direct child of the grid', async () => {
      // The regression this exists for: the tooltip element was a direct child of the layout,
      // so the 60/40 grid auto-placed *it* into cell one, pushing the form panel into column
      // two and the background image onto a second row. It sits in an absolutely positioned
      // slot now, which is not a grid item at all. jsdom cannot check that — `css: false`,
      // and no layout engine — so this asserts the structural precondition instead.
      const el = await mount();
      const tooltip = el.shadowRoot!.querySelector('keep-tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip!.parentElement!.className).toBe('theme-toggle-slot');
    });
  });

  describe('the page layout', () => {
    it('renders the form panel and the background panel, in that order', async () => {
      const el = await mount();
      const panels = [...el.shadowRoot!.children]
        .map((child) => child.className)
        .filter((name) => /^(form-panel|castle-panel)$/.test(name));
      expect(panels).toEqual(['form-panel', 'castle-panel']);
    });

    it('always renders the background panel, leaving the breakpoint to CSS', async () => {
      // It used to be gated on a media-query hook, so the page re-rendered on resize and the
      // panel left the DOM entirely. It is hidden by a media query now.
      const el = await mount();
      expect(el.shadowRoot!.querySelectorAll('.castle-panel')).toHaveLength(1);
    });

    it('opens the passkey.org link with rel="noreferrer"', async () => {
      asHttps();
      const el = await mount();
      const link = el.shadowRoot!.querySelector(
        'a[href="https://passkey.org"]',
      ) as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.target).toBe('_blank');
      // `target="_blank"` without this hands the opened page a `window.opener` reference.
      expect(link.rel).toBe('noreferrer');
    });

    it('carries the build stamp', async () => {
      const el = await mount();
      expect(el.shadowRoot!.querySelector('.copyright')!.textContent).toContain(
        'HCL America Inc.',
      );
    });
  });

  describe('what the shadow root has to restate', () => {
    const styleText = () =>
      (customElements.get(TAG) as unknown as { styles: { cssText: string } }).styles.cssText;

    it('restates the invalid-field styling, which a document sheet cannot reach', async () => {
      // The rule that paints an invalid field lives in keep-overrides.css and stops at the
      // shadow boundary, so without this a rejected credential is announced and not shown.
      expect(styleText()).toContain("wa-input[aria-invalid='true']::part(base)");
    });

    it('restates the box-sizing reset as a declaration, not as inherit', async () => {
      // `inherit` is not equivalent: a declaration on a descendant beats an inherited value,
      // and the percentage columns here are sized with padding on both of them.
      expect(styleText()).toMatch(/box-sizing:\s*border-box/);
      expect(styleText()).not.toMatch(/box-sizing:\s*inherit/);
    });

    it('restates the heading reset Web Awesome supplies from a document layer', async () => {
      expect(styleText()).toMatch(/\.logo h1 \{[^}]*margin:\s*0/);
    });
  });
});

/**
 * Source guards. Each of these reintroduces silently: a shadow-root reach compiles and runs,
 * and a form library that validates nothing looks exactly like one that does.
 */
describe('keep-login-page keeps its dependencies out', () => {
  const ROOT = resolve(process.cwd());
  const ELEMENTS = resolve(ROOT, 'src/components/keep-elements');

  /** Comments stripped, so the notes explaining what was removed are not offenders. */
  const code = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  const read = (name: string) => code(readFileSync(join(ELEMENTS, name), 'utf8'));

  const PAGES = ['keep-login-page.ts', 'keep-callback-page.ts'];

  /*
   * A recursive `walk` and a `sourcesUnder` helper stood here to feed the two app-wide MUI
   * ratchets at the bottom of this describe. Both ratchets moved to
   * `test/styles/mui-removed.test.ts` with #709, and nothing else in this file reads more
   * than the two pages named above.
   */

  it('finds the converted pages', () => {
    // A bad path would make every assertion below vacuously pass.
    for (const page of PAGES) expect(read(page).length).toBeGreaterThan(1_000);
  });

  it('imports none of the frameworks the conversion removed', () => {
    // The #806 exit gate, as a raw-text scan — which is why none of these are named as
    // literals in the elements' own prose either.
    const offenders = PAGES.filter((page) =>
      /from '(react|react-redux|formik)'|from '@mui\//.test(read(page)),
    );
    expect(offenders, `these still import a retired framework: ${offenders.join(', ')}`).toEqual(
      [],
    );
  });

  it('reaches through no other element shadow root', () => {
    const offenders = PAGES.filter((page) => /\.shadowRoot/.test(read(page)));
    expect(
      offenders,
      `wa-input and keep-api-error-dialog expose what these need: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('uses wa-input directly rather than a wrapper element', () => {
    // `keep-input-text` / `keep-input-password` existed only to render one `<wa-input>` and
    // forward four properties to it, which put the value and validity of the real control a
    // shadow boundary out of reach.
    const offenders = PAGES.filter((page) => /KeepInput(Text|Password)/.test(read(page)));
    expect(offenders, `use wa-input: ${offenders.join(', ')}`).toEqual([]);
  });

  it('toggles no visibility through getElementById', () => {
    const offenders = PAGES.filter((page) => /getElementById/.test(read(page)));
    expect(offenders, `render conditionally instead: ${offenders.join(', ')}`).toEqual([]);
  });

  it('marks invalid fields with aria-invalid', () => {
    // Not Web Awesome's `:state(user-invalid)`, which needs `hasInteracted` set by hand before
    // `checkValidity()` to appear at all, and is invisible to assistive tech.
    const page = read('keep-login-page.ts');
    expect(page).toMatch(/aria-invalid=/);
    expect(page).not.toMatch(/setCustomValidity|hasInteracted|reportUserValidity/);
  });

  it('leaves nothing behind in components/login but the three helpers', () => {
    // The two screens are gone; what stays is the WebAuthn client, its base64 helper and the
    // PKCE exchange, none of which is a component.
    const remaining = readdirSync(resolve(ROOT, 'src/components/login')).sort();
    expect(remaining).toEqual(['KeepWebAuthN.ts', 'base64url-arraybuffer.ts', 'pkce.js']);
  });

  /*
   * Two app-wide Material UI ratchets used to sit here — "exactly one CssBaseline mount" and
   * "theme.ts has a single importer". They were kept in this file because they had been
   * asserted from the layout suite and deleting that file would have deleted them; they were
   * never about this screen.
   *
   * #709 took both to zero: `AppShell.tsx` was the one mount and the one importer, and
   * `theme.ts` is deleted. A ratchet phrased as "exactly one" fails at the moment its
   * migration finishes, so neither is edited down — both are restated at zero, and as a
   * statement about the framework rather than about a count, in
   * `test/styles/mui-removed.test.ts`.
   */
});
