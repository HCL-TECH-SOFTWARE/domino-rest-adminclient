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

/**
 * The `wa-input` the page gives this id, or `null` when the mode does not render it.
 *
 * It used to be a `keep-input-text` / `keep-input-password` wrapper with the control one
 * shadow root further down. Those elements existed only to render a `wa-input` and pass
 * four properties through to it, so they are gone and the page uses `wa-input` directly
 * (#743).
 */
const field = (id: string) => document.getElementById(id) as HTMLElementTagNameMap['wa-input'] | null;

/** Alias kept for the assertions that read the control itself. */
const waInput = (id: string) => field(id)!;

/** Whether the page has marked this field as failing. */
const isInvalid = (id: string) => field(id)?.getAttribute('aria-invalid') === 'true';

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
      await type('form-username', 'someone');
      await type('section-password', 'a-password');

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
      await type('form-username', 'someone');
      await type('section-password', 'a-password');
      await click('LOG IN');

      const onSuccess = vi.mocked(login).mock.calls[0][1];
      await act(async () => onSuccess());

      expect(localStorage.getItem('login_type')).toBe('password');
    });

    it('does not dispatch login when the password is blank', async () => {
      await renderPage();
      await type('form-username', 'someone');

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
        await type('form-username', 'someone');
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
        await type('form-username', 'someone');
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
     * `error401` is true on the *first* render here, which is the case both previous
     * versions dropped silently: `App` dispatches `renewToken()` on mount and a 401 from it
     * lands in the same commit, but each wrote to a `wa-input` that the wrapper element had
     * not rendered yet. The marking is state now, so there is nothing to wait for — which
     * is the point of this being the mount case.
     */
    const renderRejected = (state: Record<string, unknown> = {}) =>
      renderPage({ error401: true, ...state });

    it('marks both fields when the server returns 401', async () => {
      // Neither field is empty-invalid — the server rejected the *pair* — so this is the
      // page's own error, not a `required` violation.
      await renderRejected();

      expect(isInvalid('form-username')).toBe(true);
      expect(isInvalid('section-password')).toBe(true);
      // The message rides in `hint`, which wa-input points aria-describedby at, so it is
      // announced rather than only coloured.
      expect(waInput('form-username').hint).toBe('Incorrect username or password');
      expect(waInput('section-password').hint).toBe('Incorrect username or password');
    });

    it('clears the rejection as soon as a field is edited', async () => {
      await renderRejected();
      await type('form-username', 'someone');

      expect(isInvalid('form-username')).toBe(false);
      expect(isInvalid('section-password')).toBe(false);
    });

    it('leaves the fields alone when the 401 came from an IdP login', async () => {
      await renderRejected({ idpLogin: true });
      expect(isInvalid('form-username')).toBe(false);
    });

    it('clears the rejection on the next attempt', async () => {
      // Otherwise one bad password leaves both fields red for the rest of the session.
      await renderRejected();
      await type('form-username', 'someone');
      await type('section-password', 'right-this-time');

      await click('LOG IN');

      expect(isInvalid('form-username')).toBe(false);
      expect(isInvalid('section-password')).toBe(false);
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

      await type('section-password', 'a-password');

      expect(setLoginError).toHaveBeenCalledWith(false);
    });

    it('is cleared when the username is edited too', async () => {
      await renderPage({ error: true, errorMessage: 'nope' });
      vi.mocked(setLoginError).mockClear();

      await type('form-username', 'someone');

      expect(setLoginError).toHaveBeenCalledWith(false);
    });
  });

  /**
   * #809 — Enter in a field did not log anyone in.
   *
   * `wa-input` was doing its part all along: it calls WebAwesome's `submitOnEnter`, which
   * searches `form.elements` for an enabled `type="submit"` control and calls
   * `requestSubmit` on it. Two things defeated the search:
   *
   * - `keep-button` is not form-associated and renders its `<wa-button>` into a shadow
   *   root, so the LOG IN button was never in `form.elements`;
   * - the "Sign up with Passkey" `<button>` had no `type`, and a button in a form defaults
   *   to submit — so it was the only match, and with no `onSubmit` the browser navigated
   *   away and took the typed credentials with it.
   */
  describe('submitting with Enter (#809)', () => {
    /**
     * ⚠️ **The keystroke itself cannot be tested here, and these do not pretend to.**
     *
     * jsdom does not implement form association for custom elements: `formAssociated` is
     * `true` and `attachInternals()` returns an object, but `internals.form` is always
     * `null` and a `wa-input` never appears in `form.elements`. So `submitOnEnter` cannot
     * find the form, gives up, and a synthetic `keydown` produces nothing — in jsdom, and
     * only in jsdom. Driving it with one would have measured the environment.
     *
     * What is split out instead:
     *
     * - the *search* — that the form offers exactly one control matching WebAwesome's own
     *   predicate, which is the step that used to find the wrong button or none;
     * - the *consequence* — `requestSubmit`, the literal call `submitForm()` makes once the
     *   search succeeds, and everything downstream of it, which is this page's code.
     *
     * The join between them is `internals.form`, which belongs to the library. **Enter in a
     * real browser is still a manual check** — see the PR for what was run.
     */
    const submitByEnter = async (form: HTMLFormElement) => {
      const submitter = [...form.elements].find(
        (el) => (el as HTMLButtonElement).type === 'submit' && !el.matches(':disabled'),
      ) as HTMLButtonElement | undefined;
      // Fail loudly rather than silently submitting with no submitter, which is a
      // different code path and would keep passing after a regression.
      expect(submitter, 'no submit control for Enter to find').toBeDefined();
      await act(async () => {
        form.requestSubmit(submitter);
      });
    };

    const loginForm = () => document.querySelector('form') as HTMLFormElement;

    it('logs in with what the user typed', async () => {
      await renderPage();
      await type('form-username', 'someone');
      await type('section-password', 'a-password');

      await submitByEnter(loginForm());

      expect(login).toHaveBeenCalledWith(
        { username: 'someone', password: 'a-password' },
        expect.any(Function),
      );
    });

    it('does not navigate away, which is what used to lose the credentials', async () => {
      // The form had no onSubmit, so a submit reached the browser and reloaded the page.
      // preventDefault is the whole fix for that half; jsdom reports the default action
      // it would have taken through `defaultPrevented`.
      await renderPage();
      await type('form-username', 'someone');
      await type('section-password', 'a-password');

      const submitted = vi.fn();
      loginForm().addEventListener('submit', submitted);
      await submitByEnter(loginForm());

      expect(submitted).toHaveBeenCalledTimes(1);
      expect(submitted.mock.calls[0][0].defaultPrevented).toBe(true);
    });

    it('takes the same validation path as the button', async () => {
      // Submitting routes through handleClickLogIn rather than repeating it, so a blank
      // password stops the login and marks the field exactly as clicking would.
      await renderPage();
      await type('form-username', 'someone');

      await submitByEnter(loginForm());

      expect(login).not.toHaveBeenCalled();
      expect(isInvalid('section-password')).toBe(true);
    });

    it('respects the current mode rather than always attempting a password login', async () => {
      const { restore } = await secureRender();
      try {
        await type('form-username', 'someone');
        await click('LOG IN WITH PASSKEY');

        await submitByEnter(loginForm());

        expect(passkeyLogin).toHaveBeenCalledWith({ name: 'someone' });
        expect(login).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    /**
     * The search half, run with WebAwesome's own predicate — copied from
     * `internal/submit-on-enter.ts`, so this fails if the page stops offering what that
     * function looks for, whatever the reason.
     */
    it('offers exactly one control for the search to select', async () => {
      await renderPage();
      const submitters = [...loginForm().elements].filter(
        (el) => (el as HTMLButtonElement).type === 'submit' && !el.matches(':disabled'),
      );

      expect(submitters).toHaveLength(1);
      // localName decides the branch: "button" is requestSubmit'd, anything else is
      // click()ed, and a click on the LOG IN button would double-fire against onClick.
      expect(submitters[0].localName).toBe('button');
    });

    it('does not let the passkey sign-up button submit the form', async () => {
      // It carried no type, and a button in a form defaults to submit — so it was the
      // control the search found, ahead of anything meant for logging in.
      const { restore } = await secureRender();
      try {
        expect(screen.getByText('Sign up with Passkey').closest('button')!.type).toBe('button');
      } finally {
        restore();
      }
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
      `wa-input and keep-api-error-dialog expose what these need: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('uses wa-input directly rather than a wrapper element', () => {
    // `keep-input-text` / `keep-input-password` existed only to render one `<wa-input>` and
    // forward four properties to it, which put the value and validity of the real control a
    // shadow boundary out of reach. They are deleted; reintroducing one would quietly
    // restore the whole problem (#743).
    const offenders = SOURCES.filter(({ text }) => /KeepInput(Text|Password)/.test(code(text)))
      .map(({ file }) => file);
    expect(offenders, `use wa-input: ${offenders.join(', ')}`).toEqual([]);
  });

  it('imports neither Formik nor Yup', () => {
    const offenders = SOURCES.filter(({ text }) => /from\s+['"](formik|yup)['"]/.test(code(text))).map(({ file }) => file);
    expect(offenders, `these still import a form library: ${offenders.join(', ')}`).toEqual([]);
  });

  it('toggles no visibility through getElementById', () => {
    const offenders = SOURCES.filter(({ text }) => /getElementById/.test(code(text))).map(({ file }) => file);
    expect(offenders, `render conditionally instead: ${offenders.join(', ')}`).toEqual([]);
  });

  it('marks invalid fields with aria-invalid', () => {
    // Not WebAwesome's `:state(user-invalid)`, which needs `hasInteracted` set by hand
    // before `checkValidity()` to appear at all, and is invisible to assistive tech.
    const page = SOURCES.find(({ file }) => file === 'src/components/login/LoginPage.tsx')!;
    expect(code(page.text)).toMatch(/aria-invalid=/);
    expect(code(page.text)).not.toMatch(/setCustomValidity|hasInteracted|reportUserValidity/);
  });
});
