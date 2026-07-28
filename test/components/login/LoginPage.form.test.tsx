/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { getIdpList, getKeepIdpActive, login, setLoginError } from '../../../src/store/account/action';
import { initiateAuthorizationRequest } from '../../../src/components/login/pkce';

/**
 * #743 part 2 — the login form itself.
 *
 * Three things went at once, because they were tangled:
 *
 * 1. **Formik + Yup were decorative.** `useFormik` was configured with a `SignupSchema`,
 *    but the values were set by *mutation* (`formik.values.username = username`), the
 *    inputs are custom elements Formik cannot read, `validate` was
 *    `() => dispatch(setLoginError(false))` — a dispatch hook, not a validator — and the
 *    real gate was a hand-written length check. Yup never validated anything a user typed.
 * 2. **11 shadow-DOM reaches**, two of them unguarded writes. They are replaced by the
 *    public element API added in the previous PR.
 * 3. **Visibility by DOM mutation.** A `useEffect` on `authType` added and removed
 *    `.hidden`/`.removed` classes through `document.getElementById`, next to an OIDC
 *    dropdown that was already conditionally rendered.
 *
 * The page had no test of its own before #742; these cover the three auth paths and the
 * error paths, which is what makes the rest of the removal safe.
 *
 * Layout is out of scope here as in the sibling suites: `vitest.config.ts` sets
 * `css: false` and jsdom has no layout engine.
 */

vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  getIdpList: vi.fn(async () => []),
  getKeepIdpActive: vi.fn(async () => false),
  // Returns a thunk, so the real `login` never reaches the network. Asserting on the
  // arguments is the point: they are what the Formik detour used to supply.
  login: vi.fn(() => async () => {}),
  // Spied but otherwise real. The store here is built from identity reducers (see
  // `renderWithProviders`), so dispatching it changes no state to observe; the page
  // calling it is the behaviour under test.
  setLoginError: vi.fn((error: boolean) => ({ type: 'SET_LOGIN_ERROR', payload: error })),
}));

vi.mock('../../../src/components/login/pkce', () => ({
  initiateAuthorizationRequest: vi.fn(async () => true),
}));

const passkeyLogin = vi.fn(async () => new Response('{}', { status: 200 }));
const passkeyRegister = vi.fn(async () => new Response('{}', { status: 200 }));
// A class, not `vi.fn(() => …)`: the page does `new WebAuthn({…})` on every render.
vi.mock('../../../src/components/login/KeepWebAuthN', () => ({
  WebAuthn: class {
    login = passkeyLogin;
    register = passkeyRegister;
  },
}));

const ACCOUNT = { error: false, error401: false, idpLogin: false, errorMessage: '' };

const IDP = {
  name: 'Corporate SSO',
  wellKnown: 'https://idp.example/.well-known/openid-configuration',
  adminui_config: { client_id: 'admin-ui' },
};

/** The `keep-input-*` wrapper the page gives this id, or `null` when the mode hides it. */
const field = (id: string) => document.getElementById(id) as (HTMLElement & {
  value: string;
  reportUserValidity(): boolean;
}) | null;

/** The inner control. Only for driving input and reading WebAwesome's own state. */
const waInput = (id: string) => field(id)!.shadowRoot!.querySelector('wa-input')!;

/** Type the way a user does, so WebAwesome updates its value and the element syncs. */
const type = (id: string, value: string) => {
  const native = waInput(id).shadowRoot!.querySelector('input')!;
  native.value = value;
  native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  native.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
};

const click = async (text: string) => {
  await act(async () => {
    fireEvent.click(screen.getByText(text));
  });
};

describe('LoginPage form (#743 part 2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getIdpList).mockResolvedValue([] as never);
    vi.mocked(getKeepIdpActive).mockResolvedValue(false as never);
    vi.mocked(initiateAuthorizationRequest).mockResolvedValue(true as never);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    // `keep-alert` is a top-layer popover toast: it moves itself to `document.body`, which
    // is outside the container testing-library cleans up, so it would leak into the next
    // test's assertions.
    document.querySelectorAll('keep-alert').forEach((el) => el.remove());
  });

  const renderPage = async (state: Record<string, unknown> = {}) => {
    const { default: LoginPage } = await import('../../../src/components/login/LoginPage');
    let result!: ReturnType<typeof renderWithProviders>;
    // The mount effects resolve the idp list and the passkey probe, each of which sets
    // state; flushing them inside act() settles the page before any assertion.
    await act(async () => {
      result = renderWithProviders(<LoginPage />, {
        preloadedState: { account: { ...ACCOUNT, ...state } },
        route: '/',
      });
    });
    return result;
  };

  /** Put the page in a mode the way a user does — via the three mode buttons. */
  const secureRender = async (state?: Record<string, unknown>) => {
    // The passkey and OIDC buttons render only under https (WebAuthn needs a secure
    // context), and the jsdom document is served over http.
    const real = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...real, protocol: 'https:' },
    });
    const result = await renderPage(state);
    return { ...result, restore: () => Object.defineProperty(window, 'location', { configurable: true, value: real }) };
  };

  describe('which fields each mode renders', () => {
    // Replaces the `useEffect` that toggled `.hidden`/`.removed` by getElementById.
    it('shows username and password in password mode', async () => {
      await renderPage();
      expect(field('form-username')).not.toBeNull();
      expect(field('section-password')).not.toBeNull();
      expect(document.getElementById('form-oidc')).toBeNull();
    });

    it('drops the password field in passkey mode', async () => {
      const { restore } = await secureRender();
      try {
        await click('LOG IN WITH PASSKEY');
        expect(field('form-username')).not.toBeNull();
        expect(field('section-password')).toBeNull();
      } finally {
        restore();
      }
    });

    it('drops both text fields in OIDC mode and shows the dropdown', async () => {
      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      vi.mocked(getKeepIdpActive).mockResolvedValue(true as never);
      await renderPage();

      await click('LOG IN WITH OIDC');

      expect(field('form-username')).toBeNull();
      expect(field('section-password')).toBeNull();
      expect(document.getElementById('form-oidc')).not.toBeNull();
    });

    it('drops the passkey sign-up row outside password mode', async () => {
      const { restore } = await secureRender();
      try {
        expect(screen.queryByText('Sign up with Passkey')).not.toBeNull();
        await click('LOG IN WITH PASSKEY');
        expect(screen.queryByText('Sign up with Passkey')).toBeNull();
      } finally {
        restore();
      }
    });

    it('leaves no element hidden by the retired classes', async () => {
      // The old mechanism. A field is either rendered or it is not.
      const { restore } = await secureRender();
      try {
        await click('LOG IN WITH PASSKEY');
        expect(document.querySelectorAll('.hidden, .removed')).toHaveLength(0);
      } finally {
        restore();
      }
    });
  });

  describe('password login', () => {
    it('dispatches login with what the user typed', async () => {
      await renderPage();
      type('form-username', 'someone');
      type('section-password', 'a-password');

      await click('LOG IN');

      expect(login).toHaveBeenCalledWith(
        { username: 'someone', password: 'a-password' },
        expect.any(Function),
      );
    });

    it('records the login type once the server accepts', async () => {
      // The success callback the thunk invokes. It also navigates, which MemoryRouter
      // absorbs.
      await renderPage();
      type('form-username', 'someone');
      type('section-password', 'a-password');
      await click('LOG IN');

      const onSuccess = vi.mocked(login).mock.calls[0][1];
      await act(async () => onSuccess());

      expect(localStorage.getItem('login_type')).toBe('password');
    });

    it('does not dispatch login when the password is blank', async () => {
      await renderPage();
      type('form-username', 'someone');

      await click('LOG IN');

      expect(login).not.toHaveBeenCalled();
    });

    it('does not dispatch login when both fields are blank', async () => {
      await renderPage();
      await click('LOG IN');
      expect(login).not.toHaveBeenCalled();
    });
  });

  describe('passkey login', () => {
    it('authenticates with the username alone', async () => {
      const { restore } = await secureRender();
      try {
        type('form-username', 'someone');
        await click('LOG IN WITH PASSKEY');
        await click('LOG IN');

        expect(passkeyLogin).toHaveBeenCalledWith({ name: 'someone' });
        expect(login).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it('does not authenticate with a blank username', async () => {
      const { restore } = await secureRender();
      try {
        await click('LOG IN WITH PASSKEY');
        await click('LOG IN');
        expect(passkeyLogin).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it('keeps the typed username when the mode changes', async () => {
      // The regression this file exists to prevent as much as any: @lit/react re-applies
      // element props on *every* render with no dirty check, so passing `value` as a prop
      // would silently overwrite the field on the next state change. The passkey prefill
      // goes through the element's property instead.
      const { restore } = await secureRender();
      try {
        type('form-username', 'someone');
        await click('LOG IN WITH PASSKEY');
        expect(field('form-username')!.value).toBe('someone');
      } finally {
        restore();
      }
    });
  });

  describe('OIDC login', () => {
    beforeEach(() => {
      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      // Gates the LOG IN WITH OIDC button via `displayKeepIdp`.
      vi.mocked(getKeepIdpActive).mockResolvedValue(true as never);
    });

    it('starts the authorization request for the selected provider', async () => {
      await renderPage();
      await click('LOG IN WITH OIDC');

      await click('LOG IN');

      expect(initiateAuthorizationRequest).toHaveBeenCalledWith(
        IDP.wellKnown,
        IDP.adminui_config.client_id,
        expect.stringContaining('/admin/ui/callback'),
        '',
      );
    });

    it('stores what the callback page needs', async () => {
      await renderPage();
      await click('LOG IN WITH OIDC');
      await click('LOG IN');

      expect(localStorage.getItem('oidc_config_url')).toBe(IDP.wellKnown);
      expect(localStorage.getItem('client_id')).toBe('admin-ui');
      expect(sessionStorage.getItem('redirect_uri')).toContain('/admin/ui/callback');
    });

    it('requests the .default scope when the provider declares an application id uri', async () => {
      vi.mocked(getIdpList).mockResolvedValue([
        { ...IDP, adminui_config: { ...IDP.adminui_config, application_id_uri: 'api://admin-ui/' } },
      ] as never);
      await renderPage();
      await click('LOG IN WITH OIDC');

      await click('LOG IN');

      expect(initiateAuthorizationRequest).toHaveBeenCalledWith(
        IDP.wellKnown,
        'admin-ui',
        expect.any(String),
        'api://admin-ui/.default',
      );
    });

    it('opens the error dialog when the request cannot be started', async () => {
      // Was `ref.current?.shadowRoot.querySelector('dialog').showModal()`; now the
      // element's own showModal().
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      vi.mocked(initiateAuthorizationRequest).mockResolvedValue(false as never);
      await renderPage();
      await click('LOG IN WITH OIDC');

      await click('LOG IN');

      expect(showModal).toHaveBeenCalled();
    });
  });

  describe('rejected credentials', () => {
    /**
     * `error401` is true on the *first* render here, which is the case that used to be
     * dropped silently: `App` dispatches `renewToken()` on mount and a 401 from it lands
     * in the same commit, but a Lit element renders its shadow DOM in a microtask after
     * React's effects. Marking now awaits the elements' `updateComplete`, so these flush
     * one more turn before asserting.
     */
    const renderRejected = async (state: Record<string, unknown> = {}) => {
      const result = await renderPage({ error401: true, ...state });
      await act(async () => {});
      return result;
    };

    it('marks both fields when the server returns 401', async () => {
      // Neither field breaks a constraint on its own — the server rejected the pair — so
      // this runs through setCustomValidity rather than `required`.
      await renderRejected();
      type('form-username', 'someone');
      type('section-password', 'wrong');

      expect(waInput('form-username').customStates.has('user-invalid')).toBe(true);
      expect(waInput('section-password').customStates.has('user-invalid')).toBe(true);
      expect(waInput('form-username').validationMessage).toBe('Incorrect username or password');
      expect(waInput('section-password').validationMessage).toBe('Incorrect username or password');
    });

    it('leaves the fields alone when the 401 came from an IdP login', async () => {
      await renderRejected({ idpLogin: true });
      expect(waInput('form-username').customStates.has('user-invalid')).toBe(false);
    });

    it('clears the rejection on the next attempt', async () => {
      // Otherwise one bad password leaves both fields red for the rest of the session.
      await renderRejected();
      type('form-username', 'someone');
      type('section-password', 'right-this-time');

      await click('LOG IN');

      expect(waInput('form-username').customStates.has('user-invalid')).toBe(false);
      expect(waInput('section-password').customStates.has('user-invalid')).toBe(false);
      expect(login).toHaveBeenCalledOnce();
    });
  });

  describe('the login error alert', () => {
    it('is shown for a failed login', async () => {
      await renderPage({ error: true, errorMessage: '401 error: bad credentials' });

      expect(document.querySelector('.login-page-alert')).not.toBeNull();
      // The text is a *property* of the alert element and is rendered inside its shadow
      // root, so testing-library's text queries cannot see it. The element is queried from
      // the document rather than from the wrapper because `keep-alert` is a top-layer
      // popover: it relocates itself to `document.body`.
      const alert = document.querySelector('keep-alert') as (HTMLElement & { message: string; heading: string });
      expect(alert).not.toBeNull();
      expect(alert.message).toBe('401 error: bad credentials');
      expect(alert.heading).toBe('Error logging in!');
    });

    it('is not shown otherwise', async () => {
      await renderPage();
      expect(document.querySelector('.login-page-alert')).toBeNull();
      expect(document.querySelector('keep-alert')).toBeNull();
    });

    it('is cleared when the user edits a field', async () => {
      // All that Formik's `validate` ever did. It now hangs off the elements' change
      // event, and off the password field too — it only ever ran for the username,
      // because that was the one field wired to `formik.handleChange`.
      await renderPage({ error: true, errorMessage: 'nope' });
      vi.mocked(setLoginError).mockClear();

      type('section-password', 'a-password');

      expect(setLoginError).toHaveBeenCalledWith(false);
    });

    it('is cleared when the username is edited too', async () => {
      await renderPage({ error: true, errorMessage: 'nope' });
      vi.mocked(setLoginError).mockClear();

      type('form-username', 'someone');

      expect(setLoginError).toHaveBeenCalledWith(false);
    });
  });

  describe('passkey prefill', () => {
    beforeEach(() => {
      localStorage.setItem('use_keep_webauth', 'true');
      localStorage.setItem('keep_user', 'remembered');
    });

    it('fills the username from the last passkey registration', async () => {
      await renderPage();
      expect(field('form-username')!.value).toBe('remembered');
    });

    it('survives a trip through OIDC mode, which unmounts the field', async () => {
      // The field is conditionally rendered now, so the prefill cannot live only in the
      // element. It is held in a ref and re-applied when the field mounts again.
      vi.mocked(getIdpList).mockResolvedValue([IDP] as never);
      vi.mocked(getKeepIdpActive).mockResolvedValue(true as never);
      await renderPage();
      await click('LOG IN WITH OIDC');
      expect(field('form-username')).toBeNull();

      await click('LOG IN WITH PASSWORD');

      expect(field('form-username')!.value).toBe('remembered');
    });

    it('does not fill anything when no passkey is registered', async () => {
      localStorage.removeItem('use_keep_webauth');
      await renderPage();
      expect(field('form-username')!.value).toBe('');
    });
  });
});

/**
 * Source guards. Each of these reintroduces silently: a `shadowRoot` reach compiles and
 * runs, and a `useFormik` that validates nothing looks exactly like one that does.
 */
describe('LoginPage keeps its dependencies out (#743)', () => {
  const walk = (dir: string, match: RegExp): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path, match);
      return match.test(entry.name) ? [path] : [];
    });

  const ROOT = resolve(process.cwd());

  /** Comments stripped, so the notes explaining what was removed are not offenders. */
  const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  const SOURCES = walk(resolve(ROOT, 'src/components/login'), /\.tsx?$/).map((file) => ({
    file: file.slice(ROOT.length + 1),
    text: readFileSync(file, 'utf8'),
  }));

  it('finds the login sources', () => {
    expect(SOURCES.length).toBeGreaterThan(2);
  });

  it('reaches through no shadow roots', () => {
    const offenders = SOURCES.filter(({ text }) => /shadowRoot/.test(code(text))).map(({ file }) => file);
    expect(
      offenders,
      `keep-input-* and keep-api-error-dialog expose what these need: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('imports neither Formik nor Yup', () => {
    const offenders = SOURCES.filter(({ text }) => /from\s+['"](formik|yup)['"]/.test(code(text))).map(({ file }) => file);
    expect(offenders, `these still import a form library: ${offenders.join(', ')}`).toEqual([]);
  });

  it('toggles no visibility through getElementById', () => {
    const offenders = SOURCES.filter(({ text }) => /getElementById/.test(code(text))).map(({ file }) => file);
    expect(offenders, `render conditionally instead: ${offenders.join(', ')}`).toEqual([]);
  });

  it('passes no `value` prop to a keep-input element', () => {
    // @lit/react applies element props on every render with no dirty check, so a `value`
    // prop would overwrite what the user has typed. Assign the property instead.
    const offenders = SOURCES.filter(({ text }) => /<KeepInput(Text|Password)[^>]*\svalue=/.test(code(text)))
      .map(({ file }) => file);
    expect(offenders, `set .value on the element via a ref instead: ${offenders.join(', ')}`).toEqual([]);
  });
});
