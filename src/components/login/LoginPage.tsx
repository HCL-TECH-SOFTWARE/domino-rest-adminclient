/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useSelector, useDispatch } from 'react-redux';
import { BUILD_VERSION } from '../../config.dev';
import keepLogo from '../../assets/KeepNewIcon.png';
import { AppState } from '../../store';
import { getIdpList, getKeepIdpActive, login, set401Error, setCurrentIdp, setLoginError } from '../../store/account/action';
import { styled } from '@linaria/react';
// The theme toggle used @mui/icons-material's LightMode/DarkMode. `react-icons` was already
// a dependency of this file (FiInfo), so switching to its equivalents drops MUI without
// introducing a new pattern. Both icon sets are due to be replaced by `<wa-icon>` in #718.
import { FiInfo, FiMoon, FiSun } from 'react-icons/fi';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WebAuthn } from './KeepWebAuthN';
import { toggleAlert } from '../../store/alerts/action';
import { IdP, LOGIN } from '../../store/account/types';
import { initiateAuthorizationRequest } from './pkce';
import { useNavigate } from 'react-router-dom';
import {
  KeepAlert,
  KeepApiErrorDialog,
  KeepButton,
  KeepDropdown,
  KeepInputPassword,
  KeepInputText,
  KeepTooltip
} from '../keep-elements/KeepElements';
import type { KeepInputBase } from '../keep-elements/keep-input-base';
import type InputText from '../keep-elements/keep-input-text';
import type InputPassword from '../keep-elements/keep-input-password';
import type Dropdown from '../keep-elements/keep-dropdown';
import type ApiErrorDialog from '../keep-elements/keep-api-error-dialog';
import { AlertManager, checkForResponse } from '../../utils/common';
import { applyAppearance } from '../../services/theme-service';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/login/LoginPage');

const dailyBuildNum = document.querySelector('meta[name="admin-ui-daily-build-version"]')?.getAttribute("content");

/** Shown on both fields when the server rejects the pair (401), not on either alone. */
const CREDENTIALS_REJECTED = 'Incorrect username or password';

/**
 * `toggleAlert` takes a string, but the `.catch((e) => …)` callers below receive `unknown`
 * (typed `any`, so nothing complained) and passed it straight through — which rendered the
 * alert as `[object Object]` for anything that was not already a string.
 */
const alertMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Validate one field and return its value, or `null` if the field is missing or invalid.
 *
 * `reportUserValidity()` leaves a failing field in the `user-invalid` custom state that
 * `keep-input-base`'s `:state(user-invalid)` rule styles, so a `null` here has already
 * told the user which field it was (#742). Returning the value in the same step is what
 * lets callers do the whole gate in one expression, without a `!` on the read.
 *
 * This page used to hold that logic itself, reaching through two shadow roots for the
 * `wa-input` and encoding WebAwesome's `hasInteracted` ordering by hand. Both moved onto
 * the element (#743) — the quirks belong where the `wa-input` does.
 */
const validated = (field: KeepInputBase | null): string | null =>
  field?.reportUserValidity() ? field.value : null;

const Copyright = () => (
  <span className="small-text text-center">
    <span className="small-text color-copyright">
      {`© ${new Date().getFullYear()}. HCL America Inc. - Build ${BUILD_VERSION} ${dailyBuildNum}`}
    </span>
  </span>
);

const KeepLogoContainer = styled.div`
  width: 600px;
  display: flex;
  column-gap: 10px;
  padding-bottom: 40px;
  align-items: center;
  
  @media (max-width: 1024px) {
    width: 330px;
    padding-bottom: 30px;
  }
  
  img {
    width: 80px;
    height: 80px;

    // reduce the width and height of the logo to half
    @media (max-width: 1024px) {
      width: 40px;
      height: 40px;
    }
  }
  
  h1 {
    font-size: 48px;
    font-weight: 500;
    
    @media (max-width: 1024px) {
      font-size: 24px;
      font-weight: 100;
    }
  }
`;

const PasskeySignUpContainer = styled.div`
  position: relative;
  right: 5px;
  padding: 7px;

  .passkey-icon {
    padding-left: 5px;
    transform: translateY(18%);
    cursor: pointer;
    color: light-dark(inherit, #999);
  }

  .passkey-icon:hover {
    color: blue;
  }

  .text-button:hover {
    background: none;
  }
`;

/**
 * The form column's fields.
 *
 * The `.hidden` (`visibility: hidden`) and `.removed` (`display: none`) classes are gone
 * with the `useEffect` that toggled them by `document.getElementById(…).classList` — the
 * fields are conditionally rendered now (#743). One consequence is visible: a field that
 * is not shown no longer reserves its space, so in passkey and OIDC mode the LOG IN button
 * sits where the password field used to leave a gap.
 */
const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 40px 10px 0 10px;
  width: 100%;
`

/**
 * The two-column login layout. Replaces a MUI `<Grid container>` whose column widths were
 * switched from JavaScript: a `useMediaQuery('(max-width:768px)')` hook toggled the
 * `w-60`/`full-width` classes and decided whether to render the background column at all.
 *
 * The 60/40 split reproduces the previous widths exactly (`.w-60` was 60%,
 * `.login-castle-bg` 40%) at the same 768px breakpoint — it is simply expressed in CSS now,
 * so the page no longer re-renders on every resize.
 */
const LoginLayout = styled.div`
  display: grid;
  grid-template-columns: 60% 40%;
  height: 100vh;
  position: relative;

  @media (max-width: 768px) {
    /* CastlePanel is hidden at this width, so the form takes the whole row. */
    grid-template-columns: 1fr;
  }
`

/**
 * Holds the theme toggle in the page corner, outside the grid.
 *
 * It has to be its own out-of-flow box. The toggle is wrapped in a `<keep-tooltip>`, which
 * is a real element and would otherwise be auto-placed into the first grid cell — pushing
 * the form panel into column 2 and the background image onto a second row. That is exactly
 * what happened when this layout first landed: under the previous MUI `<Grid container>`
 * the wrapper was a *flex* item and collapsed to zero width, because its only child is
 * absolutely positioned, so it was invisible and easy to miss. Grid gives it a cell.
 *
 * `position: absolute` here rather than on the button, so the tooltip element goes
 * out of flow with it.
 */
const ThemeToggleSlot = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
`

/**
 * The form column. Was `<Grid component={Paper} elevation={6} square>`.
 *
 * The shadow is MUI's elevation-6 value, kept verbatim so the panel edge still reads the
 * same against the background image. #708 should replace it with a `--wa-shadow-*` token.
 *
 * Dropping `Paper` also changes which rule paints the panel. Three used to compete for it:
 *
 *   theme.ts       MuiPaper.styleOverrides.root.backgroundColor  'white'   (Emotion, no !important)
 *   dark-mode.css  .MuiPaper-root { background-color: light-dark(#fff, #252535) !important }
 *   styles.css     .login-page-grid { background-color: var(--body-color) }
 *
 * `!important` wins, so the panel was `#fff` in light mode and `#252535` in dark. Without
 * the `MuiPaper-root` class only `.login-page-grid` applies, i.e. `--body-color`, which is
 * `light-dark(#fff, #181825)`. Light mode is therefore unchanged and dark mode is slightly
 * darker, now following the app's own token instead of an MUI-scoped override.
 */
const FormPanel = styled.div`
  box-shadow:
    0 3px 5px -1px rgba(0, 0, 0, 0.2),
    0 6px 10px 0 rgba(0, 0, 0, 0.14),
    0 1px 18px 0 rgba(0, 0, 0, 0.12);
`

/** The background-image column. Previously rendered only when `!matches`. */
const CastlePanel = styled.div`
  @media (max-width: 768px) {
    display: none;
  }
`

/* Positioning lives on ThemeToggleSlot; this is just the round button. */
const LoginThemeToggle = styled.button`
  background: light-dark(rgba(255,255,255,0.7), rgba(30,30,46,0.7));
  border: 1px solid light-dark(#ccc, #555);
  border-radius: 50%;
  width: 37px;
  height: 37px;
  display: flex;
  padding: 0;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: light-dark(#333, #e0e0e0);
  
  &:hover {
    background: light-dark(rgba(255,255,255,0.9), rgba(50,50,70,0.9));
  }
`;

const DivPaper = styled.div`
  margin: 64px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LoginPage = () => {
  const { error, error401, idpLogin, errorMessage } = useSelector((state: AppState) => state.account);
  const dispatch = useDispatch();
  const navigate = useNavigate()
  const protocol = window.location.protocol.toLowerCase().replace(/[^a-z]/g, '')

  // Dark mode support for login page (reads localStorage directly since Redux store isn't available pre-login)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    applyAppearance(isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    const newTheme = isDark ? 'default' : 'dark';
    localStorage.setItem('theme', newTheme);
    setIsDark(!isDark);
  };

  const isHttps = protocol === "https"
  const [idpList, setIdpList] = useState([]);
  const [displayKeepIdp, setDisplayKeepIdp] = useState(true);
  const [authType, setAuthType] = useState('password');

  const usernameRef = useRef<InputText | null>(null)
  const passwordRef = useRef<InputPassword | null>(null)
  const oidcRef = useRef<Dropdown | null>(null)
  const errorDialogRef = useRef<ApiErrorDialog | null>(null)

  /**
   * The username remembered for the passkey flow, kept outside the element because the
   * username field is conditionally rendered now: OIDC mode unmounts it.
   */
  const passkeyUser = useRef('')

  /**
   * Show a remembered username, and keep it for the field's next mount.
   *
   * Both callers — the passkey probe on mount and a successful registration — used to
   * write it straight through two shadow roots, the first of them unguarded. The ref half
   * is new, and needed: on an OIDC-configured server the page opens in `oidc` mode, so the
   * field is not mounted when `keep_user` arrives from the probe.
   */
  const showPasskeyUser = (user: string) => {
    if (!user) return;
    passkeyUser.current = user;
    if (usernameRef.current) usernameRef.current.value = user;
  }

  /**
   * Ref callback rather than a plain ref object, so a remount can be noticed: coming back
   * from OIDC mode gives a fresh, empty field, and the remembered name should reappear in
   * it. `!el.value` so it can never overwrite something already typed.
   */
  const attachUsername = useCallback((el: InputText | null) => {
    usernameRef.current = el;
    if (el && passkeyUser.current && !el.value) el.value = passkeyUser.current;
  }, [])

  const keepAuthenticator = new WebAuthn({
    callbackPath: '/api/webauthn-v1/callback',
    registerPath: '/api/webauthn-v1/register',
    loginPath: '/api/webauthn-v1/login'
  });

  /* Setup the login form
   Used for username / password and Webauthn login*/
  const handleSignUpWithPasskey = async (event: any) => {
    event.preventDefault();
    // Validate both, so each field reflects its own validity, then bail if either failed.
    // Both are `required`, so a blank one fails on `valueMissing`.
    const username = validated(usernameRef.current);
    const password = validated(passwordRef.current);
    if (username === null || password === null) {
      return;
    }
    // Login. first
    await logIn(username, password)
      .then((token: any) => {
        return keepAuthenticator.register(token);
      })
      .then((res) => res.json())
      .then((json) => {
        localStorage.setItem('use_keep_webauth', 'true');
        localStorage.setItem('keep_user', json.username);
        showPasskeyUser(json.username);
        dispatch({
          type: LOGIN
        });
        dispatch(toggleAlert('WebAuthn registration successful!'));
      })
      .catch((e) => {
        dispatch(toggleAlert(alertMessage(e)));
      })
  };

  const handleLogInWithPasskey = (event: any) => {
    event.preventDefault();
    setAuthType('passkey')
  }

  const logInWithPasskey = (username: string) => {
    keepAuthenticator
      .login({ name: username })
      .then((res) => checkForResponse(res))
      .then((json) => {
        localStorage.setItem('login_type', 'passkey');
        if (json.status) {
          dispatch(toggleAlert(json.message));
        } else {
          localStorage.setItem('user_token', JSON.stringify(json));
          dispatch({
            type: LOGIN
          });
        }
      })
      .catch((err) => {
        dispatch(toggleAlert(`Authentication failed`));
        log.error('Authentication failed', err as Error);
      })
  }

  /**
   * Clear the "Error logging in!" alert as soon as the user edits a field.
   *
   * This is all that Formik's `validate` did here. It was declared as
   * `validate: () => { dispatch(setLoginError(false)) }` — a dispatch hook wearing a
   * validator's name, returning no errors — and it was the only part of the Formik setup
   * that had an effect (#743). The password field gets it too now; it only ever ran for
   * the username because that was the one field wired to `formik.handleChange`.
   */
  const clearLoginError = () => {
    dispatch(setLoginError(false));
  }

  const logIn = (username: string, password: string) =>
    new Promise((resolve, reject) => {
      fetch('/api/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
        .then((res) => checkForResponse(res))
        .then((data) => {
          if (data.status) {
            throw new Error(data.message);
          }
          localStorage.setItem('user_token', JSON.stringify(data));
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });

  const handleLogInWithPassword = (event: any) => {
    event.preventDefault();
    setAuthType('password')
  }

  /**
   * Was Formik's `onSubmit`, reached by mutating `formik.values` and calling
   * `handleSubmit()`. The values never came from Formik — the inputs are custom elements
   * it cannot read — so `onSubmit` received whatever had just been assigned to them, and
   * `SignupSchema` validated a pair of strings the user had never touched. Dispatching the
   * thunk directly is the same call with the detour removed (#743, #717).
   */
  const logInWithPassword = async (username: string, password: string) => {
    dispatch(set401Error(false));
    await dispatch(login({ username, password }, () => {
      navigate('/')
      localStorage.setItem('login_type', "password");
    }) as any);
  }

  const handleClickLogIn = () => {
    // A new attempt clears the custom error the 401 effect below applies, so a previous
    // rejection does not leave both fields marked invalid for the rest of the session.
    usernameRef.current?.setCustomValidity('');
    passwordRef.current?.setCustomValidity('');

    switch (authType) {
      case 'password': {
        // Validate both fields, not just the first one that exists: the code this replaces
        // branched on whether the *element* was present rather than on whether it was
        // valid, so a blank password flagged the username field instead (#742).
        const username = validated(usernameRef.current);
        const password = validated(passwordRef.current);
        if (username !== null && password !== null) {
          logInWithPassword(username, password);
        }
        break;
      }
      case 'passkey': {
        // Username only; the password field is not rendered in this mode.
        const username = validated(usernameRef.current);
        if (username !== null) {
          logInWithPasskey(username);
        }
        break;
      }
      case 'oidc': {
        const selected = oidcRef.current?.selected;
        const idp = idpList.find((entry: IdP) => entry.name === selected);
        // `keep-dropdown` seeds its own selection from `choices[0]`, so this should always
        // match. Guarded because the alternative is a TypeError on `idp.wellKnown` two
        // frames down, which tells the user nothing at all.
        if (idp) {
          logInUsingIdp(idp);
        } else {
          log.error('no configured IdP matches the selected name', { selected });
        }
        break;
      }
    }
  }

  const handleLogInUsingIdp = async (_idp: any) => {
    setAuthType('oidc')
  }

  const openErrorDialog = () => {
    errorDialogRef.current?.showModal()
  }

  const logInUsingIdp = async (idp: any) => {
    await dispatch(setCurrentIdp(idp) as any)
    localStorage.setItem('oidc_config_url', idp.wellKnown)
    localStorage.setItem('client_id', idp.adminui_config.client_id)
    const redirectUri = window.location.href.replace(/admin\/ui.*/, 'admin/ui/callback')
    sessionStorage.setItem('redirect_uri', redirectUri)
    if (Object.keys(idp.adminui_config).includes('application_id_uri')) {
      const scope = idp.adminui_config.application_id_uri.replace(/\/$/, '') + "/.default" // Ensure trailing slash exists before ".default"
      const initiatedAuth = await initiateAuthorizationRequest(
        idp.wellKnown,
        idp.adminui_config.client_id,
        redirectUri,
        scope
      )
      if (!initiatedAuth) {
        openErrorDialog()
      }
    } else {
      const initiatedAuth = await initiateAuthorizationRequest(
        idp.wellKnown,
        idp.adminui_config.client_id,
        redirectUri,
        ""
      )
      if (!initiatedAuth) {
        openErrorDialog()
      }
    }
  }

  React.useEffect(() => {
    const canDoPasskey = () =>
      new Promise((resolve, reject) => {
        const canDo = localStorage.getItem('use_keep_webauth') ? true : false;
        if (!canDo) {
          resolve(false);
          return;
        }
        fetch('/api/webauthn-v1/active')
          .then((res) => {
            if (res.status > 299) {
              resolve(false);
            } else {
              resolve(true);
            }
          })
          .catch((e) => reject(e));
      });

    canDoPasskey()
      .then((result: any) => {
        if (result === true) {
          showPasskeyUser(localStorage.getItem('keep_user') ?? '')
        }
      })
      .catch((e) => dispatch(toggleAlert(alertMessage(e))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  useEffect(() => {
    async function handleIdps() {
      const fetchedIdps = await getIdpList()
      setIdpList(fetchedIdps)

      const display = await getKeepIdpActive()
      if (display) {
        setDisplayKeepIdp(true)
      } else if (fetchedIdps.length === 0) {
        setDisplayKeepIdp(true)
      } else {
        setDisplayKeepIdp(false)
      }
    }
    handleIdps()
  }, [])

  useEffect(() => {
    const loginType = localStorage.getItem('login_type')
    
    switch (loginType) {
      case 'oidc':
        setAuthType('oidc')
        break
      case 'passkey':
        setAuthType('passkey')
        break
      case 'password':
        setAuthType('password')
        break
      default:
        if (idpList.length > 0) {
          setAuthType('oidc')
        } else {
          setAuthType('password')
        }
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A 401 means the server rejected the username/password *pair*; neither field violates
  // a constraint on its own, so this is a custom error rather than `valueMissing`.
  // setCustomValidity() is the elements' public API for that, and reportUserValidity()
  // then engages the :state(user-invalid) styling on both fields. Cleared on the next
  // attempt in handleClickLogIn.
  //
  // Awaiting `updateComplete` is not belt-and-braces. `error401` can already be true on
  // this page's first render — `App` dispatches `renewToken()` on mount, and a 401 from
  // it lands in the same commit — and a Lit element renders its shadow DOM in a
  // microtask *after* React's effects run. Marking straight away therefore found no
  // `wa-input` and did nothing, on exactly the path that shows the login page after an
  // expired session. The previous code had the same gap and swallowed it: it read the
  // control as `undefined` and called `?.setCustomValidity` on it.
  useEffect(() => {
    if (!error401 || idpLogin) return;
    const fields = [usernameRef.current, passwordRef.current];
    Promise.all(fields.map((field) => field?.updateComplete)).then(() => {
      for (const field of fields) {
        field?.setCustomValidity(CREDENTIALS_REJECTED);
        field?.reportUserValidity();
      }
    });
  }, [error401, idpLogin])

  useEffect(() => {
    // Reset alert when invalid credentials
    AlertManager.resetAlert()
  }, [])

  return (
    <LoginLayout>
      <ThemeToggleSlot>
        <KeepTooltip content={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} placement="right">
          <LoginThemeToggle onClick={toggleTheme}>
            {isDark ? <FiMoon className='huge-text' /> : <FiSun className='huge-text' />}
          </LoginThemeToggle>
        </KeepTooltip>
      </ThemeToggleSlot>
      <FormPanel className='login-page-grid'>
        <DivPaper>
          <KeepLogoContainer>
            <img src={keepLogo} alt="Domino REST API logo" />
            <h1 className='color-text-primary'>
              HCL Domino REST API
            </h1>
          </KeepLogoContainer>
          <div className='flex-1'>
            {error && (
              <div className='login-page-alert'>
                <KeepAlert variant='danger' heading='Error logging in!' message={errorMessage} />
              </div>
            )}
            <section
              className="flex flex-col items-center gap-10 m-10 full-width"
            >
              <KeepButton
                className="login-keep-button full-width"
                onClick={handleLogInWithPassword}
                appearance='outlined'
              >
                LOG IN WITH PASSWORD
              </KeepButton>
              {isHttps &&
                <KeepButton
                  className="login-keep-button full-width"
                  onClick={handleLogInWithPasskey}
                  appearance='outlined'
                >
                  LOG IN WITH PASSKEY
                </KeepButton>
              }
              {displayKeepIdp &&
                <KeepButton
                  className="login-keep-button full-width"
                  onClick={() => {handleLogInUsingIdp("")}}
                  appearance='outlined'
                >
                  LOG IN WITH OIDC
                </KeepButton>
              }
            </section>
            {/* Which fields a mode shows. This was a `useEffect` on `authType` adding and
                removing `.hidden`/`.removed` classes by `document.getElementById`, next to
                an OIDC dropdown that was already conditionally rendered — two paradigms in
                one form (#743). Note `value` is deliberately never passed as a prop:
                @lit/react re-applies element props on *every* render with no dirty check,
                so a `value` prop would overwrite whatever the user had typed. The passkey
                prefill goes through `showPasskeyUser` instead. */}
            <LoginForm>
              {authType !== 'oidc' &&
                <section className='full-width'>
                  <KeepInputText
                    id='form-username'
                    label='Username'
                    onChange={clearLoginError}
                    ref={attachUsername}
                    required
                  />
                </section>
              }
              {authType === 'oidc' && idpList.length > 0 &&
                <section className='full-width'>
                  <div className='flex justify-center items-center full-width mt-8'>
                    {/* No `onChange`/`selected`: keep-dropdown owns its selection —
                        `firstUpdated()` seeds it from `choices[0]` and `changeSelected()`
                        updates it on click — and it dispatches no `change` event, so the
                        handler this replaces could never fire. handleClickLogIn reads the
                        choice straight off `oidcRef.current.selected`. */}
                    <KeepDropdown
                      id='form-oidc'
                      choices={idpList.map((idp: IdP) => {return idp.name})}
                      ref={oidcRef}
                      className='login-page-oidc-dropdown'
                    />
                  </div>
                </section>
              }
              {authType === 'password' &&
                <section className='full-width'>
                  <KeepInputPassword
                    id='section-password'
                    className='input'
                    label='Password'
                    onChange={clearLoginError}
                    ref={passwordRef}
                    required
                  />
                </section>
              }
              <KeepButton
                className="login-submit-button"
                onClick={handleClickLogIn}
                pill
              >
                LOG IN
              </KeepButton>
              {authType === 'password' && isHttps &&
                <PasskeySignUpContainer id='passkey-signup'>
                  <button
                    className="no-background color-text-primary"
                    disabled={!displayKeepIdp}
                  >
                    <span
                      className="login-page-signup-text"
                      onClick={handleSignUpWithPasskey}
                    >
                      Sign up with Passkey
                    </span>
                    <a href="https://passkey.org" target="_blank" rel="noreferrer">
                      <FiInfo className="passkey-icon" size="1.5em" />
                    </a>
                  </button>
                </PasskeySignUpContainer>
              }
            </LoginForm>
            <div className='mt-7'>
              <Copyright />
            </div>
            <KeepApiErrorDialog ref={errorDialogRef} errorMessage='Error initiating authorization request. Check the console or network for more details.' />
          </div>
        </DivPaper>
      </FormPanel>
      <CastlePanel className="login-castle-bg" />
    </LoginLayout>
  );
};

export default LoginPage;
