/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useFormik } from 'formik';
import * as Yup from 'yup';
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
import React, { useEffect, useRef, useState } from 'react';
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

type WaFormInput = HTMLElementTagNameMap['wa-input'] | null | undefined;

/**
 * Run WebAwesome's constraint validation on one field and leave it in the `user-invalid`
 * custom state if it fails, which is what the `:state(user-invalid)` rules in
 * `keep-input-text` / `keep-input-password` style. Returns whether the field is valid.
 *
 * Two details of WebAwesome's API drive the implementation (#742):
 *
 * 1. `hasInteracted` is set first because `setCustomStates()` computes
 *    `user-invalid = !valid && hasInteracted`. WebAwesome's own `reportValidity()` sets
 *    that flag *after* it runs validation, so a single call leaves a field `invalid` but
 *    never `user-invalid`.
 * 2. `checkValidity()` rather than `reportValidity()`: it walks the same
 *    `updateValidity() → setValidity() → setCustomStates()` path without moving focus or
 *    opening a validation bubble, so it is safe to call on every field in a form.
 *
 * A missing control is reported and treated as invalid. It should not happen once the
 * element has rendered, and blocking is the safe reading — the previous code read
 * `.length` off the undefined value and threw instead.
 */
const markValidity = (input: WaFormInput, field: string): boolean => {
  if (!input) {
    log.error('cannot validate the login form: control not found', { field });
    return false;
  }
  input.hasInteracted = true;
  return input.checkValidity();
};

const SignupSchema = Yup.object().shape({
  username: Yup.string().required('Required'),
  password: Yup.string().required('Required'),
});

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

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 40px 10px 0 10px;
  width: 100%;

  .hidden {
    visibility: hidden;
  }

  .removed {
    display: none;
  }
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
 * The form column. Was `<Grid component={Paper} elevation={6} square>`.
 *
 * The shadow is MUI's elevation-6 value, kept verbatim so the panel edge still reads the
 * same against the background image. #708 should replace it with a `--wa-shadow-*` token.
 *
 * Dropping `Paper` also settles a cascade race that had been suppressing dark mode here.
 * `theme.ts` sets `MuiPaper.styleOverrides.root.backgroundColor` from
 * `getTheme('default').secondary` — the literal `'white'` — and because Emotion injects at
 * runtime it landed after `styles.css` and won at equal specificity, so
 * `.login-page-grid`'s own `background-color: var(--body-color)` never applied. In light
 * mode the two agree (both `#fff`). In dark mode they do not: `--body-color` is
 * `light-dark(#fff, #181825)` while `theme.ts` deliberately uses the *light* palette for an
 * unauthenticated page (`authenticated ? getTheme(themeMode) : getTheme('default')`), so
 * the panel stayed white with dark text around it. It now follows `--body-color`.
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

const LoginThemeToggle = styled.button`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
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

  const usernameRef = useRef<any>(null)
  const passwordRef = useRef<any>(null)
  const oidcRef = useRef<any>(null)
  const ref = useRef<any>(null)

  const keepAuthenticator = new WebAuthn({
    callbackPath: '/api/webauthn-v1/callback',
    registerPath: '/api/webauthn-v1/register',
    loginPath: '/api/webauthn-v1/login'
  });

  /* Setup the login form
   Used for username / password and Webauthn login*/
  const handleSignUpWithPasskey = async (event: any) => {
    event.preventDefault();
    const usernameInput = usernameRef.current?.shadowRoot.querySelector('wa-input');
    const passwordInput = passwordRef.current?.shadowRoot.querySelector('wa-input');

    // Validate both, so each field reflects its own validity, then bail if either failed.
    // Both are `required`, so a blank one fails on `valueMissing`.
    const usernameValid = markValidity(usernameInput, 'username');
    const passwordValid = markValidity(passwordInput, 'password');
    if (!usernameValid || !passwordValid) {
      return;
    }
    // Login. first
    await logIn()
      .then((token: any) => {
        return keepAuthenticator.register(token);
      })
      .then((res) => res.json())
      .then((json) => {
        localStorage.setItem('use_keep_webauth', 'true');
        localStorage.setItem('keep_user', json.username);
        // formik.values.username = json.username;
        usernameRef.current.shadowRoot.querySelector('wa-input').value = json.username;
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

  const handleUsernameChange = (event: any) => {
    formik.handleChange(event);
  }

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validate: () => {
      dispatch(setLoginError(false));
    },
    validationSchema: SignupSchema,

    onSubmit: async (values) => {
      dispatch(set401Error(false));
      const data = JSON.stringify(values, null, 2);
      const parseData = JSON.parse(data);
      await dispatch(login(parseData, () => {
        navigate('/')
        localStorage.setItem('login_type', "password");
      }) as any);
    },
  });

  const logIn = () =>
    new Promise((resolve, reject) => {
      fetch('/api/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: usernameRef.current?.shadowRoot.querySelector('wa-input')?.value,
          password: passwordRef.current?.shadowRoot.querySelector('wa-input')?.value,
        })
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

  const logInWithPassword = (username: string, password: string) => {
    formik.values.username = username
    formik.values.password = password
    formik.handleSubmit();
  }

  const handleClickLogIn = () => {
    const usernameInput = usernameRef.current?.shadowRoot.querySelector('wa-input');
    const passwordInput = passwordRef.current?.shadowRoot.querySelector('wa-input');
    const username = usernameInput?.value ?? '';
    const password = passwordInput?.value ?? '';

    // A new attempt clears the 401 error the effect below applies, so a previous
    // rejection does not leave both fields marked invalid for the rest of the session.
    usernameInput?.setCustomValidity('');
    passwordInput?.setCustomValidity('');

    if (authType === 'password') {
      // Password Login. Validate both fields, not just the first one that exists: the
      // code this replaces branched on whether the *element* was present rather than on
      // whether it was valid, so a blank password flagged the username field instead.
      const usernameValid = markValidity(usernameInput, 'username');
      const passwordValid = markValidity(passwordInput, 'password');
      if (usernameValid && passwordValid) {
        logInWithPassword(username, password);
      }
    } else if (authType === 'passkey') {
      // Passkey Login — username only; the password field is hidden in this mode.
      if (markValidity(usernameInput, 'username')) {
        logInWithPasskey(username)
      }
    } else if (authType === 'oidc') {
      // OIDC Login
      const oidc = oidcRef.current.selected
      const idp = idpList.find((idp: IdP) => idp.name === oidc)
      logInUsingIdp(idp)
    }
  }

  const handleLogInUsingIdp = async (_idp: any) => {
    setAuthType('oidc')
  }

  const openErrorDialog = () => {
    const dialogElement = ref.current?.shadowRoot.querySelector('dialog')
    if (dialogElement) {
      dialogElement.showModal();
    }
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
          const user = localStorage.getItem('keep_user')
          usernameRef.current.shadowRoot.querySelector('wa-input').value = user
        }
      })
      .catch((e) => dispatch(toggleAlert(alertMessage(e))));
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

  useEffect(() => {
    switch (authType) {
      case 'oidc':
        document.getElementById('form-username')?.classList.add('removed');
        document.getElementById('section-password')?.classList.add('hidden');
        document.getElementById('form-oidc')?.classList.remove('removed');
        document.getElementById('passkey-signup')?.classList.add('hidden');
        break;
      case 'passkey':
        document.getElementById('form-username')?.classList.remove('removed');
        document.getElementById('section-password')?.classList.add('hidden');
        document.getElementById('form-oidc')?.classList.add('removed');
        document.getElementById('passkey-signup')?.classList.add('hidden');
        break;
      case 'password':
        document.getElementById('form-username')?.classList.remove('removed');
        document.getElementById('section-password')?.classList.remove('hidden');
        document.getElementById('form-oidc')?.classList.add('removed');
        document.getElementById('passkey-signup')?.classList.remove('hidden');
        break;
    }
  }, [authType])

  // A 401 means the server rejected the username/password *pair*; neither field violates
  // a constraint on its own, so this is a custom error rather than `valueMissing`.
  // setCustomValidity() is WebAwesome's public API for that, and markValidity() then
  // engages the :state(user-invalid) styling on both fields. Cleared on the next attempt
  // in handleClickLogIn.
  useEffect(() => {
    if (error401 && !idpLogin) {
      const usernameInput = usernameRef.current?.shadowRoot.querySelector('wa-input');
      const passwordInput = passwordRef.current?.shadowRoot.querySelector('wa-input');

      usernameInput?.setCustomValidity(CREDENTIALS_REJECTED);
      passwordInput?.setCustomValidity(CREDENTIALS_REJECTED);
      markValidity(usernameInput, 'username');
      markValidity(passwordInput, 'password');
    }
  }, [error401, idpLogin])

  useEffect(() => {
    // Reset alert when invalid credentials
    AlertManager.resetAlert()
  }, [])

  return (
    <LoginLayout>
      <KeepTooltip content={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} placement="right">
        <LoginThemeToggle onClick={toggleTheme}>
          {isDark ? <FiMoon className='huge-text' /> : <FiSun className='huge-text' />}
        </LoginThemeToggle>
      </KeepTooltip>
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
            <LoginForm>
              <section className='full-width'>
                <KeepInputText
                  id='form-username'
                  label='Username'
                  onChange={handleUsernameChange}
                  ref={usernameRef}
                  required
                />
                {authType === 'oidc' && idpList.length > 0 &&
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
                }
              </section>
              <section className='full-width'>
                <KeepInputPassword
                  id='section-password'
                  className='input'
                  label='Password'
                  ref={passwordRef}
                  required
                />
              </section>
              <KeepButton
                className="login-submit-button"
                onClick={handleClickLogIn}
                pill
              >
                LOG IN
              </KeepButton>
              <PasskeySignUpContainer id='passkey-signup'>
                {isHttps && (
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
                )}
              </PasskeySignUpContainer>
            </LoginForm>
            <div className='mt-7'>
              <Copyright />
            </div>
            <KeepApiErrorDialog ref={ref} errorMessage='Error initiating authorization request. Check the console or network for more details.' />
          </div>
        </DivPaper>
      </FormPanel>
      <CastlePanel className="login-castle-bg" />
    </LoginLayout>
  );
};

export default LoginPage;
