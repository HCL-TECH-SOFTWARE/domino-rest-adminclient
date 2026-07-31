/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import * as Yup from 'yup';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import './keep-alert';
import type Alert from './keep-alert';
import './keep-api-error-dialog';
import './keep-button';
import './keep-dropdown';
import './keep-tooltip';
import type ApiErrorDialog from './keep-api-error-dialog';
import type Dropdown from './keep-dropdown';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { FormController } from '../../store/FormController';
import { FA_LIBRARY } from '../../services/icon-library';
import { BUILD_VERSION } from '../../config.dev';
import keepLogo from '../../assets/KeepNewIcon.png';
import castleBackground from '../../styles/castlebg.jpg';
import {
  getIdpList,
  getKeepIdpActive,
  login,
  set401Error,
  setCurrentIdp,
  setLoginError,
} from '../../store/account/action';
// The generated action, not the `login` thunk of the same name in account/action.ts
// — these two sites already hold a token and only need to mark the session authed.
import { login as markAuthenticated } from '../../store/account/reducer';
import { toggleAlert } from '../../store/alerts/action';
import type { IdP } from '../../store/account/types';
import { WebAuthn } from '../login/KeepWebAuthN';
import { initiateAuthorizationRequest } from '../login/pkce';
import { AlertManager, checkForResponse } from '../../utils/common';
import {
  applyTheme,
  nextThemeMode,
  toThemeMode,
  THEME_MODE_UI,
  type ThemeMode
} from '../../services/theme-service';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/keep-elements/keep-login-page');

const dailyBuildNum = document
  .querySelector('meta[name="admin-ui-daily-build-version"]')
  ?.getAttribute('content');

/** Shown on both fields when the server rejects the pair (401), not on either alone. */
const CREDENTIALS_REJECTED = 'Incorrect username or password';

/** Which credential the page is collecting. Decides both the fields and the rules. */
type AuthType = 'password' | 'passkey' | 'oidc';

/** The two values this form owns. The mode is element state — see `buildSchema`. */
export interface LoginFormValues {
  username: string;
  password: string;
}

const INITIAL_VALUES: LoginFormValues = { username: '', password: '' };

/**
 * `toggleAlert` takes a string, but the `.catch((e) => …)` callers below receive `unknown`
 * and would otherwise pass it straight through — which renders the alert as
 * `[object Object]` for anything that is not already a string.
 */
const alertMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The login screen. Tag: `keep-login-page`.
 *
 * Replaces `components/login/LoginPage.tsx`. Three ways in, in one form: username and
 * password, a WebAuthn passkey, and an OIDC provider. The mode buttons choose between them
 * and decide which fields are rendered.
 *
 * ### Form state
 *
 * A `FormController` owns the two values and runs the rules (#807). Which rules apply
 * depends on the mode, and the mode is not a form value — so `buildSchema` is a *method*
 * whose tests read `this.authType` when validation runs, the same shape `keep-scope-form`
 * uses for its store-reading rule. Errors reach the fields as `aria-invalid` plus a `hint`,
 * which is what `wa-input` points `aria-describedby` at, so a failure is announced and not
 * merely coloured.
 *
 * Two things the controller cannot express, both reported rather than worked around:
 *
 * - **A server-reported error has no way in.** A 401 says the server rejected the
 *   *username/password pair*; it comes from the store, not from the values, and there is no
 *   `setError`. It is held as element state ({@link rejected}) and merged in by
 *   {@link messageFor}.
 * - **There is no "validate without submitting".** `submit()` is the only entry point that
 *   runs the whole schema, and it goes on to call `onSubmit`. The passkey *sign-up* path
 *   needs the same two rules without logging anyone in, so it validates each field.
 *
 * ### It does not navigate — it says it logged in
 *
 * The React version called `navigate('/')` from the login thunk's success callback. An
 * element cannot: the router is published through React context with no module-level
 * instance and this codebase has no Lit router controller yet (#926). The `login-success`
 * event carries that step to whoever renders this page.
 *
 * @fires login-success - a password login succeeded; the host should show the app.
 */
@customElement('keep-login-page')
export default class LoginPage extends KeepElement {
  static styles = css`
    /* The document reset stops at the shadow boundary. Stated on every element rather than
       inherited: the percentage columns and the padded panel below both need it, and an
       inherited value loses to any declaration further down. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* Web Awesome gives bare form controls a display from an author-origin layer, which
       outranks the user-agent rule for this attribute — that is what put a dark square
       under LOG IN (#937). That layer does not reach into this shadow root, so the
       user-agent rule applies again here; this states it anyway, because the form's submit
       control depends on it and nothing else in this file would say so. */
    [hidden] {
      display: none;
    }

    /* The two-column layout. Was a grid div wrapping the whole page; it is the host now.
       The 60/40 split and the 768px breakpoint reproduce the previous widths exactly. */
    :host {
      display: grid;
      grid-template-columns: 60% 40%;
      height: 100vh;
      position: relative;
    }

    @media (max-width: 768px) {
      :host {
        /* The background column is hidden at this width, so the form takes the whole row. */
        grid-template-columns: 1fr;
      }
    }

    /* Holds the theme toggle in the page corner, outside the grid.

       It has to be its own out-of-flow box. The toggle is wrapped in a tooltip element,
       which is a real element and would otherwise be auto-placed into the first grid cell —
       pushing the form panel into column 2 and the background image onto a second row.
       Absolute here rather than on the button, so the tooltip goes out of flow with it. */
    .theme-toggle-slot {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
    }

    /* Positioning lives on the slot; this is just the round button. The translucent
       light/dark pair it replaces is a token now, so it follows the palette rather than
       restating it — see the element note above about what a human should eyeball. */
    .theme-toggle {
      background: var(--wa-color-surface-raised);
      border: 1px solid var(--wa-color-surface-border);
      border-radius: 50%;
      width: 37px;
      height: 37px;
      display: flex;
      padding: 0;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--wa-color-text-normal);
    }

    .theme-toggle:hover {
      background: var(--wa-color-neutral-fill-quiet);
    }

    /* A bare button draws a focus ring for pointer clicks too; keyboard users keep theirs. */
    .theme-toggle:focus {
      outline: none;
    }

    .theme-toggle:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: calc(-1 * var(--wa-focus-ring-width));
    }

    /* The glyph takes its box from font-size, and the 24px utility that used to supply it
       is in the document sheet. */
    .theme-toggle wa-icon {
      font-size: 24px;
    }

    /* The form column. The shadow is the elevation-6 value the old surface component
       painted, kept verbatim so the panel edge still reads the same against the image. */
    .form-panel {
      padding: 90px;
      height: 100%;
      background-color: var(--body-color);
      color: var(--text-color-primary);
      box-shadow:
        0 3px 5px -1px rgba(0, 0, 0, 0.2),
        0 6px 10px 0 rgba(0, 0, 0, 0.14),
        0 1px 18px 0 rgba(0, 0, 0, 0.12);
    }

    /* The background-image column. Width comes from the grid column. */
    .castle-panel {
      height: 100vh;
      background-color: var(--wa-color-surface-lowered);
      background-image: url(${unsafeCSS(castleBackground)});
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
    }

    @media (max-width: 768px) {
      .castle-panel {
        display: none;
      }
    }

    .paper {
      margin: 64px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .logo {
      width: 600px;
      display: flex;
      column-gap: 10px;
      padding-bottom: 40px;
      align-items: center;
    }

    .logo img {
      width: 80px;
      height: 80px;
      max-width: 100%;
      border-radius: var(--wa-border-radius-m);
    }

    /* Web Awesome styles bare headings from a document layer, which does not cross a shadow
       boundary — without the margin reset the user-agent margin comes back and pushes the
       logo row apart. The size and weight are this page's own. */
    .logo h1 {
      margin: 0;
      font-family: var(--wa-font-family-heading);
      line-height: var(--wa-line-height-condensed);
      font-size: 48px;
      font-weight: 500;
      color: var(--wa-color-text-normal);
    }

    @media (max-width: 1024px) {
      .logo {
        width: 330px;
        padding-bottom: 30px;
      }

      .logo img {
        width: 40px;
        height: 40px;
      }

      .logo h1 {
        font-size: 24px;
        font-weight: 100;
      }
    }

    .column {
      flex: 1;
    }

    /* The three mode buttons. */
    .modes {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin: 10px;
      width: 100%;
    }

    /* Both of these read as custom properties inside keep-button, which is why they cross
       the boundary at all — a class on the element would not. */
    .mode-button,
    .submit-button {
      --keep-button-display: block;
      --keep-button-width: 100%;
    }

    .submit-button {
      margin-top: 30px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin: 40px 10px 0 10px;
      width: 100%;
    }

    .field {
      width: 100%;
    }

    .oidc-row {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      margin-top: 8px;
    }

    .oidc-dropdown {
      --keep-dropdown-display: inline-block;
      --keep-dropdown-width: auto;
    }

    wa-input {
      display: block;
      width: 100%;
    }

    /* Invalid fields are marked with aria-invalid, set by this form when it decides a field
       has failed. The rule that paints it lives in the document sheet, which does not reach
       in here, so it is restated against the same tokens. */
    wa-input[aria-invalid='true']::part(base) {
      border-color: var(--wa-color-danger-fill-loud);
      box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-fill-quiet);
    }

    .passkey-signup {
      position: relative;
      right: 5px;
      padding: 7px;
      display: flex;
      align-items: center;
    }

    /* Was a text span inside a disabled button, which is why it had no keyboard path at
       all. It is the button now; the styling is what that pair rendered between them. */
    .signup-button {
      background: none;
      border: 0;
      padding: 0;
      font-family: inherit;
      font-size: 14px;
      text-transform: none;
      cursor: pointer;
      color: var(--wa-color-text-normal);
    }

    .signup-button:hover:not(:disabled) {
      color: red;
      text-decoration: underline;
    }

    .signup-button:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .signup-button:focus {
      outline: none;
    }

    .signup-button:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: calc(-1 * var(--wa-focus-ring-width));
    }

    .passkey-icon {
      padding-left: 5px;
      transform: translateY(18%);
      cursor: pointer;
      color: var(--wa-color-text-quiet);
      /* The glyph takes its box from font-size, not from a width, so the relative measure
         the old graphic carried has to be spelled as one. */
      font-size: 1.5em;
    }

    .passkey-icon:hover {
      color: blue;
    }

    .copyright-row {
      margin-top: 7px;
    }

    /* Two nested spans carrying three utility classes between them, of which two did
       anything: a size and a colour. The third asked for centred text on an inline box,
       where the property has nothing to align — so this is what the pair renders, not what
       their names read as. Centring it is a deliberate change for someone to make. */
    .copyright {
      font-size: 14px;
      color: var(--copyright-color);
    }
  `;

  /**
   * One subscription for the account slice. The still-React host has its own `useSelector`
   * for `authenticated` but passes nothing down, so there is no property to fight with.
   */
  private readonly account = new StoreController(this, (state) => state.account);

  private readonly form = new FormController<LoginFormValues>(this, {
    initialValues: INITIAL_VALUES,
    schema: this.buildSchema(),
    onSubmit: (values) => this.logIn(values),
  });

  /** Which credential the page is collecting. Also decides which fields are rendered. */
  @state() private accessor authType: AuthType = 'password';

  /** Providers the server offers. Empty until the mount fetch resolves. */
  @state() private accessor idpList: IdP[] = [];

  /** Whether the built-in Keep identity provider is on offer. */
  @state() private accessor displayKeepIdp = true;

  /**
   * The appearance setting — light, dark or system (#962).
   *
   * Read from local storage rather than the store: this page renders before login, when
   * nothing has put a theme in the store yet. That is also why it holds the *setting* rather
   * than a resolved appearance — `system` has to survive a reload, and only the stored string
   * carries it.
   */
  @state() private accessor themeMode: ThemeMode = toThemeMode(localStorage.getItem('theme'));

  /**
   * Whether the server has rejected the credentials. A 401 is about the *pair*, so it marks
   * both fields rather than either alone, and it is cleared by the next edit or attempt.
   */
  @state() private accessor rejected = false;

  @query('#form-oidc') private accessor oidcDropdown!: Dropdown | null;

  @query('#login-error-dialog') private accessor errorDialog!: ApiErrorDialog | null;

  @query('keep-alert') private accessor loginAlert!: Alert | null;

  /** Previous error flag, so the toast is raised on the edge rather than on every render. */
  private wasErrored = false;

  private readonly keepAuthenticator = new WebAuthn({
    callbackPath: '/api/webauthn-v1/callback',
    registerPath: '/api/webauthn-v1/register',
    loginPath: '/api/webauthn-v1/login',
  });

  /** Previous value of the rejection condition, so the marking follows the edge. */
  private wasRejected = false;

  /** Guards the mount work against a reconnect: moving the element must not refetch. */
  private started = false;

  /**
   * The mount work, in the order the four effects it replaces ran.
   *
   * Before the first render rather than after it, because the stored mode is a reactive
   * property: writing it from inside the update cycle schedules a second update, and the
   * first paint would show the password fields for one frame on a machine whose last login
   * was OIDC.
   *
   * The mode switch reads `idpList`, which is still empty at this point because the fetch
   * above has not resolved — so the `default` branch always takes the password arm. That is
   * what the React version did too (its dependency list was empty and lint was silenced for
   * it), and it is reproduced rather than corrected: the intent looks like "start in OIDC
   * mode when providers exist", and turning that on is a behaviour change, not a conversion.
   */
  connectedCallback(): void {
    super.connectedCallback();
    if (this.started) return;
    this.started = true;
    void this.prefillFromPasskey();
    void this.loadIdps();
    this.applyStoredLoginType();
    // Reset alert when invalid credentials
    AlertManager.resetAlert();
  }

  /**
   * A 401 can already be true when this page mounts — the host dispatches a token renewal
   * and a 401 from it lands in the same commit — so this has to be correct on the first
   * pass, not only on a change.
   *
   * The edge, not the level: while `error401` stays true the user must still be able to
   * clear the marking by editing a field.
   */
  protected willUpdate(): void {
    const { error401, idpLogin } = this.account.value;
    const rejects = Boolean(error401) && !idpLogin;
    if (rejects !== this.wasRejected) {
      this.wasRejected = rejects;
      if (rejects) this.rejected = true;
    }
  }

  protected updated(changed: PropertyValues): void {
    // `applyTheme`, not `applyAppearance`: it resolves `system` against the OS preference,
    // which is the one setting whose appearance is not in the name.
    if (changed.has('themeMode')) applyTheme(this.themeMode);

    // Rising edge only: show() restarts the dismiss timer, so raising on every render would
    // hold the toast open for as long as the error flag stayed up. #952.
    const { error, errorMessage } = this.account.value;
    if (error && !this.wasErrored) this.loginAlert?.show(errorMessage ?? '', 'danger');
    this.wasErrored = error;
  }

  /**
   * The rules, as a method rather than a constant, because which fields are required
   * depends on the mode and the mode is not one of the values. A `test` closure reads
   * `this.authType` when validation runs; a `when` clause could only read a sibling value.
   *
   * `test` and not `required`, for the same reason: a rule that has to pass in one mode and
   * fail in another cannot be expressed by presence alone.
   */
  private buildSchema(): Yup.AnyObjectSchema {
    return Yup.object().shape({
      username: Yup.string().test(
        'username-required',
        'Enter your username',
        (value) => this.authType === 'oidc' || Boolean(value),
      ),
      password: Yup.string().test(
        'password-required',
        'Enter your password',
        (value) => this.authType !== 'password' || Boolean(value),
      ),
    }) as Yup.AnyObjectSchema;
  }

  /** The message a field should show, if any. The rejection outranks a missing value. */
  private messageFor(field: keyof LoginFormValues): string | undefined {
    return this.rejected ? CREDENTIALS_REJECTED : this.form.errors[field];
  }

  /**
   * Editing a field clears the rejection and the "Error logging in!" alert.
   *
   * The controller clears that field's own message and leaves the other alone, which is a
   * change from the React version's "clear everything" — and the better behaviour: typing a
   * username while the password box is still empty no longer hides the password's message.
   */
  private handleFieldInput(field: keyof LoginFormValues, event: Event): void {
    this.form.setValue(field, (event.target as HTMLInputElement).value);
    this.rejected = false;
    this.account.dispatch(setLoginError(false));
  }

  private toggleTheme(): void {
    const next = nextThemeMode(this.themeMode);
    localStorage.setItem('theme', next);
    this.themeMode = next;
  }

  /**
   * Press LOG IN, or Enter in a field. Both take exactly the same path: same mode switch,
   * same rules, same dispatch.
   *
   * The rejection is dropped first, mirroring the whole-map replacement a fresh validation
   * pass does — otherwise one bad password leaves both fields red for the rest of the
   * session.
   */
  private handleLogIn(): void {
    this.rejected = false;
    void this.form.submit();
  }

  private handleSubmitEvent(event: Event): void {
    event.preventDefault();
    this.handleLogIn();
  }

  /** The controller's `onSubmit`: reached only once the mode's rules have passed. */
  private async logIn(values: LoginFormValues): Promise<void> {
    switch (this.authType) {
      case 'password':
        await this.logInWithPassword(values);
        break;
      case 'passkey':
        await this.logInWithPasskey(values.username);
        break;
      case 'oidc':
        await this.logInWithSelectedIdp();
        break;
    }
  }

  private async logInWithPassword(values: LoginFormValues): Promise<void> {
    this.account.dispatch(set401Error(false));
    await this.account.dispatch(
      login(values, () => {
        localStorage.setItem('login_type', 'password');
        this.emit('login-success');
      }),
    );
  }

  private async logInWithPasskey(username: string): Promise<void> {
    try {
      const json = await this.keepAuthenticator
        .login({ name: username })
        .then((res) => checkForResponse(res));
      localStorage.setItem('login_type', 'passkey');
      if (json.status) {
        this.account.dispatch(toggleAlert(json.message));
        return;
      }
      localStorage.setItem('user_token', JSON.stringify(json));
      this.account.dispatch(markAuthenticated());
    } catch (error) {
      this.account.dispatch(toggleAlert('Authentication failed'));
      log.error('Authentication failed', error as Error);
    }
  }

  /**
   * `keep-dropdown` owns its selection — it seeds itself from the first choice and updates
   * on pick — so the chosen provider is read off the element rather than mirrored here.
   */
  private async logInWithSelectedIdp(): Promise<void> {
    const selected = this.oidcDropdown?.selected;
    const idp = this.idpList.find((entry) => entry.name === selected);
    if (!idp) {
      // Guarded because the alternative is a TypeError two frames down, which tells the
      // user nothing at all.
      log.error('no configured IdP matches the selected name', { selected });
      return;
    }
    await this.startAuthorization(idp);
  }

  private async startAuthorization(idp: IdP): Promise<void> {
    this.account.dispatch(setCurrentIdp(idp));
    const config = idp.adminui_config;
    localStorage.setItem('oidc_config_url', idp.wellKnown);
    localStorage.setItem('client_id', config.client_id);
    const redirectUri = window.location.href.replace(/admin\/ui.*/, 'admin/ui/callback');
    sessionStorage.setItem('redirect_uri', redirectUri);
    // Ensure a trailing slash exists before ".default"
    const scope = config.application_id_uri
      ? `${config.application_id_uri.replace(/\/$/, '')}/.default`
      : '';
    const started = await initiateAuthorizationRequest(
      idp.wellKnown,
      config.client_id,
      redirectUri,
      scope,
    );
    if (!started) this.errorDialog?.showModal();
  }

  /**
   * Register a passkey for credentials the user has just proved.
   *
   * Validated field by field rather than through `submit()`: the controller's only
   * whole-form pass is `submit()`, and that goes on to log the user in — which is not what
   * this button does.
   */
  private async signUpWithPasskey(): Promise<void> {
    this.rejected = false;
    await this.form.validateField('username');
    await this.form.validateField('password');
    if (Object.keys(this.form.errors).length > 0) return;

    const { username, password } = this.form.values;
    try {
      const token = await this.authenticate(username, password);
      const res = await this.keepAuthenticator.register(token);
      const json = await res.json();
      localStorage.setItem('use_keep_webauth', 'true');
      localStorage.setItem('keep_user', json.username);
      this.form.setValue('username', json.username);
      this.account.dispatch(markAuthenticated());
      this.account.dispatch(toggleAlert('WebAuthn registration successful!'));
    } catch (error) {
      this.account.dispatch(toggleAlert(alertMessage(error)));
    }
  }

  /** The bare credential exchange the passkey registration needs a token from. */
  private async authenticate(username: string, password: string): Promise<unknown> {
    const response = await fetch('/api/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await checkForResponse(response);
    if (data.status) throw new Error(data.message);
    localStorage.setItem('user_token', JSON.stringify(data));
    return data;
  }

  /** Put the last passkey-registered username back in the field, if the server still takes one. */
  private async prefillFromPasskey(): Promise<void> {
    try {
      if (!localStorage.getItem('use_keep_webauth')) return;
      const res = await fetch('/api/webauthn-v1/active');
      if (res.status > 299) return;
      const remembered = localStorage.getItem('keep_user');
      if (remembered) this.form.setValue('username', remembered);
    } catch (error) {
      this.account.dispatch(toggleAlert(alertMessage(error)));
    }
  }

  private async loadIdps(): Promise<void> {
    const fetched: IdP[] = await getIdpList();
    this.idpList = fetched;
    const active = await getKeepIdpActive();
    this.displayKeepIdp = Boolean(active) || fetched.length === 0;
  }

  private applyStoredLoginType(): void {
    const loginType = localStorage.getItem('login_type');
    switch (loginType) {
      case 'oidc':
      case 'passkey':
      case 'password':
        this.authType = loginType;
        break;
      default:
        this.authType = this.idpList.length > 0 ? 'oidc' : 'password';
        break;
    }
  }

  private renderField(field: keyof LoginFormValues) {
    const message = this.messageFor(field);
    const isPassword = field === 'password';
    return html`
      <section class="field">
        <wa-input
          id=${isPassword ? 'section-password' : 'form-username'}
          label=${isPassword ? 'Password' : 'Username'}
          type=${isPassword ? 'password' : 'text'}
          ?password-toggle=${isPassword}
          required
          .value=${this.form.values[field]}
          .hint=${message ?? ''}
          aria-invalid=${message ? 'true' : nothing}
          @input=${(event: Event) => this.handleFieldInput(field, event)}
        ></wa-input>
      </section>
    `;
  }

  render() {
    const isHttps = window.location.protocol.toLowerCase().replace(/[^a-z]/g, '') === 'https';
    // The glyph is the toggle's only content, so it carries the button's accessible name.
    // Reusing the tooltip's wording keeps the two from drifting apart.
    const theme = THEME_MODE_UI[this.themeMode];
    return html`
      <div class="theme-toggle-slot">
        <keep-tooltip content=${theme.action} placement="right">
          <button class="theme-toggle" type="button" @click=${() => this.toggleTheme()}>
            <wa-icon
              library=${FA_LIBRARY}
              name=${theme.icon}
              label=${theme.action}
              canvas="auto"
            ></wa-icon>
          </button>
        </keep-tooltip>
      </div>

      <div class="form-panel">
        <div class="paper">
          <div class="logo">
            <img src=${keepLogo} alt="Domino REST API logo" />
            <h1>HCL Domino REST API</h1>
          </div>
          <div class="column">
            <!-- Unconditional and driven through show(), not a conditional part with a
                 message binding (#952). keep-alert used to move itself into document.body on
                 first show, which is what kept the toast readable after the part went away;
                 it stays where it is put now, so the part has to. -->
            <keep-alert heading="Error logging in!"></keep-alert>

            <section class="modes">
              <keep-button
                class="mode-button"
                appearance="outlined"
                @click=${() => {
                  this.authType = 'password';
                }}
              >
                LOG IN WITH PASSWORD
              </keep-button>
              ${isHttps
                ? html`<keep-button
                    class="mode-button"
                    appearance="outlined"
                    @click=${() => {
                      this.authType = 'passkey';
                    }}
                  >
                    LOG IN WITH PASSKEY
                  </keep-button>`
                : nothing}
              ${this.displayKeepIdp
                ? html`<keep-button
                    class="mode-button"
                    appearance="outlined"
                    @click=${() => {
                      this.authType = 'oidc';
                    }}
                  >
                    LOG IN WITH OIDC
                  </keep-button>`
                : nothing}
            </section>

            <form class="login-form" @submit=${(event: Event) => this.handleSubmitEvent(event)}>
              ${this.authType !== 'oidc' ? this.renderField('username') : nothing}
              ${this.authType === 'oidc' && this.idpList.length > 0
                ? html`<section class="field">
                    <div class="oidc-row">
                      <keep-dropdown
                        id="form-oidc"
                        class="oidc-dropdown"
                        .choices=${this.idpList.map((idp) => idp.name)}
                      ></keep-dropdown>
                    </div>
                  </section>`
                : nothing}
              ${this.authType === 'password' ? this.renderField('password') : nothing}

              <keep-button
                class="submit-button"
                pill
                ?disabled=${this.form.submitting}
                @click=${() => this.handleLogIn()}
              >
                LOG IN
              </keep-button>

              <!-- The form's submit control, and the only reason Enter in a field works.
                   keep-button is not form-associated and renders its Web Awesome button into
                   a shadow root, so the visible LOG IN button above is invisible to the
                   form's elements collection and cannot be a submitter. This carries that
                   role instead, and must stay ahead of any other button in the form because
                   the search takes the first match. -->
              <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>

              ${this.authType === 'password' && isHttps
                ? html`<div class="passkey-signup">
                    <button
                      type="button"
                      class="signup-button"
                      ?disabled=${!this.displayKeepIdp}
                      @click=${() => void this.signUpWithPasskey()}
                    >
                      Sign up with Passkey
                    </button>
                    <a href="https://passkey.org" target="_blank" rel="noreferrer">
                      <wa-icon
                        class="passkey-icon"
                        library=${FA_LIBRARY}
                        name="circle-info"
                        label="What is a passkey?"
                        canvas="auto"
                      ></wa-icon>
                    </a>
                  </div>`
                : nothing}
            </form>

            <div class="copyright-row">
              <span class="copyright">
                © ${new Date().getFullYear()}. HCL America Inc. - Build ${BUILD_VERSION}
                ${dailyBuildNum}
              </span>
            </div>

            <keep-api-error-dialog
              id="login-error-dialog"
              .errorMessage=${'Error initiating authorization request. Check the console or network for more details.'}
            ></keep-api-error-dialog>
          </div>
        </div>
      </div>

      <div class="castle-panel"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-login-page': LoginPage;
  }
}
