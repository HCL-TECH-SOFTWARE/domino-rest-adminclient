/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useFormik } from 'formik';
import useMediaQuery from '@mui/material/useMediaQuery';
import * as Yup from 'yup';
import { useSelector, useDispatch } from 'react-redux';
import {
  IMG_DIR,
  BUILD_VERSION,
} from '../../config.dev';
import { CASTLE_BACKGROUND } from './styles';
import { AppState } from '../../store';
import { getIdpList, getKeepIdpActive, login, set401Error, setCurrentIdp, setLoginError, setToken } from '../../store/account/action';
import styled from 'styled-components';
import { FiInfo } from 'react-icons/fi';
import { Link } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { WebAuthn } from './KeepWebAuthN';
import { toggleAlert } from '../../store/alerts/action';
import { IdP, LOGIN } from '../../store/account/types';
import { initiateAuthorizationRequest } from './pkce';
import { useNavigate } from 'react-router-dom';
import {
  LitApiErrorDialog,
  LitButton,
  LitDropdown,
  LitInputPassword,
  LitInputText
} from '../lit-elements/LitElements';

const dailyBuildNum = document.querySelector('meta[name="admin-ui-daily-build-version"]')?.getAttribute("content");

const SignupSchema = Yup.object().shape({
  username: Yup.string().required('Required'),
  password: Yup.string().required('Required'),
});

const Copyright = () => (
  <Typography variant="body2" color="textSecondary" align="center">
    <Typography
      style={{ fontSize: 14 }}
      color="primary"
      variant="subtitle1"
      component="a"
    >
      {`© ${new Date().getFullYear()}. HCL America Inc. - Build ${BUILD_VERSION} ${dailyBuildNum}`}
    </Typography>
  </Typography>
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

  .sign-up-text {
    font-size: 14px;
    cursor: pointer;
    text-transform: none;
  }

  .sign-up-text:hover {
    color: red;
    text-decoration: underline;
  }

  .passkey-icon {
    padding-left: 5px;
    transform: translateY(18%);
    cursor: pointer;
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

  .hidden {
    visibility: hidden;
  }

  .removed {
    display: none;
  }
`

const GridRoot = styled(Grid)(({ theme }) => ({
  height: "100vh",
}));

const DivPaper = styled("div")(({ theme }) => ({
  margin: "64px 32px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
}));

const StyledForm = styled("form")(({ theme }) => ({
  // Fix IE 11 issue.
  width: "100%",

  marginTop: "8px",
}));

const ButtonSubmit = styled(Button)(({ theme }) => ({
  margin: "24px 0 16px 0",
}));

const LoginPage = () => {
  const { error, error401, idpLogin } = useSelector((state: AppState) => state.account);
  const dispatch = useDispatch();
  const navigate = useNavigate()
  const protocol = window.location.protocol.toLowerCase().replace(/[^a-z]/g, '')

  const isHttps = protocol === "https"
  const [idpList, setIdpList] = useState([]);
  const [displayKeepIdp, setDisplayKeepIdp] = useState(true);
  const [authType, setAuthType] = useState('password');
  const [selectedOidc, setSelectedOidc] = useState('');

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
    const username = usernameRef.current?.shadowRoot.querySelector('sl-input')?.value
    const password = passwordRef.current?.shadowRoot.querySelector('sl-input')?.value

    // Validate inputs
    const usernameInput = usernameRef.current?.shadowRoot.querySelector('sl-input');
    const passwordInput = passwordRef.current?.shadowRoot.querySelector('sl-input');

    if (!username || !password) {
      if (!username) {
        usernameInput.setAttribute('data-user-invalid', username.length === 0)
      }
      if (!password) {
        passwordInput.setAttribute('data-user-invalid', password.length === 0)
      }
      return;
    }
    // Login. first
    await logIn()
      .then((token: any) => {
        dispatch(setToken(token));
        return keepAuthenticator.register(token);
      })
      .then((res) => res.json())
      .then((json) => {
        localStorage.setItem('use_keep_webauth', 'true');
        localStorage.setItem('keep_user', json.username);
        // formik.values.username = json.username;
        usernameRef.current.shadowRoot.querySelector('sl-input').value = json.username;
        dispatch({
          type: LOGIN
        });
        dispatch(toggleAlert('WebAuthn registration successful!'));
      })
      .catch((e) => {
        dispatch(toggleAlert(e));
      })
  };

  const handleLogInWithPasskey = (event: any) => {
    event.preventDefault();

    document.getElementById('form-username')?.classList.remove('removed');
    document.getElementById('section-password')?.classList.add('hidden');
    document.getElementById('form-oidc')?.classList.add('removed');
    document.getElementById('passkey-signup')?.classList.add('hidden');
    setAuthType('passkey')
  }

  const logInWithPasskey = (username: string) => {
    keepAuthenticator
      .login({ name: username })
      .then((res) => res.json())
      .then((json) => {
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
        console.error(err);
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

    onSubmit: async (values, form) => {
      dispatch(set401Error(false));
      const data = JSON.stringify(values, null, 2);
      const parseData = JSON.parse(data);
      await dispatch(login(parseData, () => navigate('/')) as any);
    },
  });

  const matches = useMediaQuery('(max-width:768px)');
  
  const logIn = () =>
    new Promise((resolve, reject) => {
      fetch('/api/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: usernameRef.current?.shadowRoot.querySelector('sl-input')?.value,
          password: passwordRef.current?.shadowRoot.querySelector('sl-input')?.value,
        })
      })
        .then((res) => res.json())
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
    document.getElementById('form-username')?.classList.remove('removed');
    document.getElementById('section-password')?.classList.remove('hidden');
    document.getElementById('form-oidc')?.classList.add('removed');
    document.getElementById('passkey-signup')?.classList.remove('hidden');
    setAuthType('password')
  }

  const logInWithPassword = (username: string, password: string) => {
    formik.values.username = username
    formik.values.password = password
    formik.handleSubmit();
  }

  const handleClickLogIn = () => {
    const username = usernameRef.current?.shadowRoot.querySelector('sl-input')?.value
    const password = passwordRef.current?.shadowRoot.querySelector('sl-input')?.value

    // Validate inputs
    const usernameInput = usernameRef.current?.shadowRoot.querySelector('sl-input');
    const passwordInput = passwordRef.current?.shadowRoot.querySelector('sl-input');

    if (authType === 'password') {
      // Password Login
      if (username.length > 0 && password.length > 0) {
        logInWithPassword(username, password);
      } else {
        if (usernameRef.current?.shadowRoot.querySelector('sl-input')) {
          usernameInput.setAttribute('data-user-invalid', username.length === 0)
        } else if (passwordRef.current?.shadowRoot.querySelector('sl-input')) {
          passwordInput.setAttribute('data-user-invalid', password.length === 0)
        }
      }
    } else if (authType === 'passkey') {
      // Passkey Login
      if (username.length > 0) {
        logInWithPasskey(username)
      } else {
        if (usernameRef.current?.shadowRoot.querySelector('sl-input')) {
          usernameInput.setAttribute('data-user-invalid', username.length === 0)
        }
      }
    } else if (authType === 'oidc') {
      // OIDC Login
      const oidc = oidcRef.current.selected
      const idp = idpList.find((idp: IdP) => idp.name === oidc)
      logInUsingIdp(idp)
    }
  }

  const handleLogInUsingIdp = async (idp: any) => {
    document.getElementById('form-username')?.classList.add('removed');
    document.getElementById('section-password')?.classList.add('hidden');
    document.getElementById('form-oidc')?.classList.remove('removed');
    document.getElementById('passkey-signup')?.classList.add('hidden');
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
      const scope = idp.adminui_config.application_id_uri + ".default"
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

  const handleChooseOidc = (idp: any) => {
    
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

    const hasOidc = localStorage.getItem('client_id')
    if (hasOidc) {
      document.getElementById('form-username')?.classList.add('removed');
      document.getElementById('section-password')?.classList.add('hidden');
      document.getElementById('form-oidc')?.classList.remove('removed');
      document.getElementById('passkey-signup')?.classList.add('hidden');
      setAuthType('oidc')
      return
    }

    canDoPasskey()
      .then((result: any) => {
        if (result === true) {
          const user = localStorage.getItem('keep_user');
          usernameRef.current.shadowRoot.querySelector('sl-input').value = user
          setAuthType('passkey')
          document.getElementById('form-username')?.classList.remove('removed');
          document.getElementById('section-password')?.classList.add('hidden');
          document.getElementById('form-oidc')?.classList.add('removed');
          document.getElementById('passkey-signup')?.classList.add('hidden');
        }
      })
      .catch((e) => dispatch(toggleAlert(e)));
  }, [])

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
    const hasOidc = localStorage.getItem('client_id')
    if (hasOidc && idpList.length > 0) {
      document.getElementById('form-username')?.classList.add('removed');
      document.getElementById('section-password')?.classList.add('hidden');
      document.getElementById('form-oidc')?.classList.remove('removed');
      document.getElementById('passkey-signup')?.classList.add('hidden');
      setAuthType('oidc')
      return
    }
  }, [idpList])

  useEffect(() => {
    if (error401 && !idpLogin) {
      const username = usernameRef.current?.shadowRoot.querySelector('sl-input')?.value
      const password = passwordRef.current?.shadowRoot.querySelector('sl-input')?.value

      // Validate inputs
      const usernameInput = usernameRef.current?.shadowRoot.querySelector('sl-input');
      const passwordInput = passwordRef.current?.shadowRoot.querySelector('sl-input');

      if (usernameInput) {
        usernameInput.setAttribute('data-user-invalid', username.length === 0)
      }
      if (passwordInput) {
        passwordInput.setAttribute('data-user-invalid', password.length === 0)
      }
    }
  }, [error401, idpLogin])

  return (
    <GridRoot container>
      <CssBaseline />
      <Grid
        style={{
          padding: "90px",
          flexBasis: "100%",
          maxWidth: matches ? "100%" : "60%",
          height: '100%',
        }}
        // item
        // xs={12}
        // sm={8}
        // md={5}
        component={Paper}
        elevation={6}
        square
      >
        <DivPaper>
          <KeepLogoContainer>
            <img src={`${IMG_DIR}/KeepNewIcon.png`} alt="Domino REST API logo" />
            <Typography component="h1" variant="h5">
              HCL Domino REST API
            </Typography>
          </KeepLogoContainer>
          <div style={{ flex: 1 }}>
            <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', margin: '10px' }}>
              <LitButton style={{ width: '100%' }} onClick={handleLogInWithPassword} outline>LOG IN WITH PASSWORD</LitButton>
              {isHttps &&
                <LitButton style={{ width: '100%' }} onClick={handleLogInWithPasskey} outline>LOG IN WITH PASSKEY</LitButton>
              }
              {displayKeepIdp &&
                <LitButton style={{ width: '100%' }} onClick={() => {handleLogInUsingIdp("")}} outline>LOG IN WITH OIDC</LitButton>
              }
            </section>
            <LoginForm>
              <section style={{ width: '100%' }}>
                <LitInputText
                  id='form-username'
                  label='Username'
                  onChange={handleUsernameChange}
                  ref={usernameRef}
                  required
                />
                {idpList.length > 0 &&
                  <LitDropdown
                    id='form-oidc'
                    choices={idpList.map((idp: IdP) => {return idp.name})}
                    className='removed'
                    ref={oidcRef}
                    onChange={(e: any) => handleChooseOidc(idpList.find((idp: IdP) => idp.name === e.detail.value))}
                    style={{ width: '100%' }}
                    selected={selectedOidc}
                  />
                }
              </section>
              <section style={{ width: '100%' }}>
                <LitInputPassword
                  id='section-password'
                  label='Password'
                  style={{ width: '100%' }}
                  ref={passwordRef}
                  required
                />
              </section>
              <LitButton
                style={{ width: '100%', marginTop: '30px' }}
                onClick={handleClickLogIn}
                pill
              >
                LOG IN
              </LitButton>
              <PasskeySignUpContainer id='passkey-signup'>
                {isHttps && (
                  <button
                    className="text-button"
                    disabled={!displayKeepIdp}
                    style={{
                      cursor: "pointer",
                      background: 'none',
                      border: 'none',
                      margin: 5,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      className="sign-up-text"
                      display="inline"
                      onClick={handleSignUpWithPasskey}
                    >
                      Sign up with Passkey
                    </Typography>
                    <Link href="https://passkey.org" target="_blank">
                      <FiInfo className="passkey-icon" size="1.5em" />
                    </Link>
                  </button>
                )}
              </PasskeySignUpContainer>
            </LoginForm>
            <Box mt={7}>
              <Copyright />
            </Box>
            <LitApiErrorDialog ref={ref} errorMessage='Error initiating authorization request. Check the console or network for more details.' />
          </div>
        </DivPaper>
      </Grid>
      {!matches && <Grid
        sx={{
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
          width: "40%",
          backgroundImage: CASTLE_BACKGROUND,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
          flexBasis: "44%",
          maxWidth: "40%",
        }}
      />}
    </GridRoot>
  );
};

export default LoginPage;
