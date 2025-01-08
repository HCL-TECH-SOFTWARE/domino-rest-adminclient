/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useFormik } from 'formik';
import useMediaQuery from '@mui/material/useMediaQuery';
import * as Yup from 'yup';
import { Alert, AlertTitle } from '@mui/lab';
import LoginIcon from '@mui/icons-material/ExitToApp';
import { useSelector, useDispatch } from 'react-redux';
import {
  IMG_DIR,
  KEEP_ADMIN_BASE_COLOR,
  BUILD_VERSION,
} from '../../config.dev';
import { CASTLE_BACKGROUND } from './styles';
import { AppState } from '../../store';
import { getIdpList, login, set401Error, setCurrentIdp, setLoginError, setToken } from '../../store/account/action';
import styled from 'styled-components';
import { FiInfo } from 'react-icons/fi';
import { Link } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { WebAuthn } from './KeepWebAuthN';
import { toggleAlert } from '../../store/alerts/action';
import { LOGIN } from '../../store/account/types';
import { initiateAuthorizationRequest } from './pkce';
import { useNavigate } from 'react-router-dom';

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

  const [username, setUsername] = useState('');
  const [noUsernamePasskey, setNoUsernamePasskey] = useState(false);
  const [noPasswordPasskey, setNoPasswordPasskey] = useState(false);
  const isHttps = protocol === "https"
  const [idpList, setIdpList] = useState([]);

  const keepAuthenticator = new WebAuthn({
    callbackPath: '/api/webauthn-v1/callback',
    registerPath: '/api/webauthn-v1/register',
    loginPath: '/api/webauthn-v1/login'
  });

  /* Setup the login form
   Used for username / password and Webauthn login*/
  const handleSignUpWithPasskey = async (event: any) => {
    event.preventDefault();
    if (!formik.values.username || !formik.values.password) {
      if (!formik.values.username) {
        setNoUsernamePasskey(true);
      }
      if (!formik.values.password) {
        setNoPasswordPasskey(true);
      }
      return;
    } else {
      setNoUsernamePasskey(false);
      setNoPasswordPasskey(false);
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
        formik.values.username = json.username;
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
    setUsername(event.target.value);
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

  const { errors, touched, isValid } = formik;
  const matches = useMediaQuery('(max-width:768px)');
  
  const logIn = () =>
    new Promise((resolve, reject) => {
      fetch('/api/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formik.values.username,
          password: formik.values.password,
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
    if (formik.values.username === '' && username.length > 0) {
      formik.values.username = username;
    }
    formik.handleSubmit();
  }

  const handleLogInUsingIdp = async (idp: any) => {
    await dispatch(setCurrentIdp(idp) as any)
    localStorage.setItem('oidc_config_url', idp.wellKnown)
    localStorage.setItem('client_id', idp.adminui_config.client_id)
    const redirectUri = window.location.href.replace(/admin\/ui.*/, 'admin/ui/callback')
    sessionStorage.setItem('redirect_uri', redirectUri)
    const scopePrepend = idp.adminui_config.application_id_uri ?? "";
    let scope = '';
    if (Array.isArray(idp.adminui_config.scope)) {
      scope = idp.adminui_config.scope.map((s: String) => scopePrepend + s).join(" ");
    }
    await initiateAuthorizationRequest(idp.wellKnown, idp.adminui_config.client_id, redirectUri, scope)
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
        const user = localStorage.getItem('keep_user');
        setUsername(user ? user : '');
      })
      .catch((e) => dispatch(toggleAlert(e)));
  }, [])

  useEffect(() => {
    async function getIdps() {
      const fetchedIdps = await getIdpList()
      setIdpList(fetchedIdps)
    }
    getIdps();
  }, [])

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
        item
        xs={12}
        sm={8}
        md={5}
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
            <Typography
              style={{ fontSize: 32, fontWeight: 500 }}
              component="h1"
              variant="h5"
            >
              Welcome
            </Typography>
            <Typography style={{ fontSize: 18 }} component="h1" variant="h5">
              Login your account
            </Typography>
            {error401 && !idpLogin && (
              <Alert style={{ margin: "5px 0" }} severity="error">
                <AlertTitle>Whoops: Something went wrong!</AlertTitle>
                <Typography
                  style={{ fontSize: 18 }}
                  component="p"
                  variant="caption"
                >
                  Invalid credentials. Please try to sign in again.
                </Typography>
              </Alert>
            )}
            {error && (
              <Alert style={{ margin: "5px 0" }} severity="error">
                <AlertTitle>Whoops: Something went wrong!</AlertTitle>
                <Typography
                  style={{ fontSize: 18 }}
                  component="p"
                  variant="caption"
                >
                  Invalid username and/or password.
                </Typography>
              </Alert>
            )}
            {((touched.username && touched.password && !isValid) ||
              noPasswordPasskey ||
              noUsernamePasskey) && (
              <Alert style={{ margin: "5px 0" }} severity="error">
                <AlertTitle>Whoops: Something went wrong!</AlertTitle>
                {((errors.username && touched.username) || noUsernamePasskey) && (
                  <Typography
                    style={{
                      fontSize: 16,
                      margin: "5px 0",
                      color: "#d32f2f",
                    }}
                    component="p"
                    variant="caption"
                  >
                    Username Required
                  </Typography>
                )}
                {((errors.password && touched.password) || noPasswordPasskey) && (
                  <Typography
                    style={{
                      fontSize: 16,
                      margin: "5px 0",
                      color: "#d32f2f",
                    }}
                    component="p"
                    variant="caption"
                  >
                    Password Required
                  </Typography>
                )}
              </Alert>
            )}
            <StyledForm onSubmit={formik.handleSubmit} noValidate>
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                size="small"
                autoFocus
                onChange={handleUsernameChange}
                value={username ? username : formik.values.username}
              />
              <TextField
                variant="outlined"
                margin="normal"
                size="small"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                onChange={formik.handleChange}
                value={formik.values.password}
                autoComplete="off"
                autoFocus={error}
              />
              <ButtonSubmit
                style={{ padding: "7px 0", marginTop: '24px', background: KEEP_ADMIN_BASE_COLOR }}
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleLogInWithPassword}
              >
                <LoginIcon style={{ marginRight: 5 }} fontSize="small" />
                Log In With Password
              </ButtonSubmit>
              {isHttps && (
                <ButtonSubmit
                  style={{ padding: "7px 0", marginTop: '24px', background: KEEP_ADMIN_BASE_COLOR }}
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleLogInWithPasskey}
                >
                  <LoginIcon style={{ marginRight: 5 }} fontSize="small" />
                  Log In with Passkey
                </ButtonSubmit>
              )}
            </StyledForm>
            {idpList.length > 0 &&
                idpList.map((idp: any, index: number) => (
                  <ButtonSubmit
                    key={index}
                    style={{ padding: "7px 0", marginTop: '24px', background: KEEP_ADMIN_BASE_COLOR }}
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={() => handleLogInUsingIdp(idp)}
                  >
                    <LoginIcon style={{ marginRight: 5 }} fontSize="small" />
                    {`Log in with ${idp.name}`}
                  </ButtonSubmit>
              ))}
            <PasskeySignUpContainer>
              {isHttps && (
                <Button fullWidth className="text-button">
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
                </Button>
              )}
            </PasskeySignUpContainer>
            <Box mt={7}>
              <Copyright />
            </Box>
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
