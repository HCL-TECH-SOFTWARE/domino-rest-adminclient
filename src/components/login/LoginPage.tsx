/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { useFormik } from 'formik';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import * as Yup from 'yup';
import { Alert, AlertTitle } from '@material-ui/lab';
import LoginIcon from '@material-ui/icons/ExitToApp';
import { useSelector, useDispatch } from 'react-redux';
import { Redirect } from 'react-router-dom';
import {
  IMG_DIR,
  KEEP_ADMIN_BASE_COLOR,
  BUILD_VERSION,
} from '../../config.dev';
import { useStyles } from './styles';
import { AppState } from '../../store';
import { login, set401Error, setLoginError, setToken } from '../../store/account/action';
import styled from 'styled-components';
import { FiInfo } from 'react-icons/fi';
import { Link } from '@material-ui/core';
import React, { useState } from 'react';
import { WebAuthn } from './KeepWebAuthN';
import { toggleAlert } from '../../store/alerts/action';
import { LOGIN } from '../../store/account/types';

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

const LoginPage = () => {
  const classes = useStyles();
  const { error, error401 } = useSelector((state: AppState) => state.account);
  const dispatch = useDispatch();

  const [passkeyLogin, setPasskeyLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [noUsernamePasskey, setNoUsernamePasskey] = useState(false);
  const [noPasswordPasskey, setNoPasswordPasskey] = useState(false);

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

  const handleClearPasskey = (event: any) => {
    event.preventDefault();
    localStorage.removeItem('use_keep_webauth');
    localStorage.removeItem('keep_user');
    setUsername('');
    setPasskeyLogin(false);
  }

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
      await dispatch(login(parseData) as any);
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
        setPasskeyLogin(result);
        const user = localStorage.getItem('keep_user');
        setUsername(user ? user : '');
      })
      .catch((e) => dispatch(toggleAlert(e)));
  }, [dispatch, passkeyLogin])

  return (
    <Grid container component="main" className={classes.root}>
      <Redirect to="/" />
      <CssBaseline />
      <Grid
        style={{
          padding: '90px',
          flexBasis: '100%',
          maxWidth: matches ? '100%' : '60%',
        }}
        item
        xs={12}
        sm={8}
        md={5}
        component={Paper}
        elevation={6}
        square
      >
        <div className={classes.paper}>
          <KeepLogoContainer>
            <img src={`${IMG_DIR}/KeepNewIcon.png`} alt="Domino REST API logo" />
            <Typography
              component="h1"
              variant="h5"
            >
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
            {error401 && (
              <Alert style={{ margin: '5px 0' }} severity="error">
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
              <Alert style={{ margin: '5px 0' }} severity="error">
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
            {((touched.username && touched.password && !isValid) || (noPasswordPasskey || noUsernamePasskey)) && (
              <Alert style={{ margin: '5px 0' }} severity="error">
                <AlertTitle>Whoops: Something went wrong!</AlertTitle>
                {((errors.username && touched.username) || noUsernamePasskey) && (
                  <Typography
                    style={{
                      fontSize: 16,
                      margin: '5px 0',
                      color: '#d32f2f',
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
                      margin: '5px 0',
                      color: '#d32f2f',
                    }}
                    component="p"
                    variant="caption"
                  >
                    Password Required
                  </Typography>
                )}
              </Alert>
            )}
            <form
              onSubmit={formik.handleSubmit}
              className={classes.form}
              noValidate
            >
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
                onChange={formik.handleChange}
                value={username ? username : formik.values.username}
              />
              {!passkeyLogin && <TextField
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
              />}
              {!passkeyLogin && <Button
                style={{ padding: '7px 0', background: KEEP_ADMIN_BASE_COLOR }}
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
              >
                <LoginIcon style={{ marginRight: 5 }} fontSize="small" />
                Log In
              </Button>}
              {passkeyLogin && <Button
                style={{ padding: '7px 0', background: KEEP_ADMIN_BASE_COLOR }}
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
                onClick={handleLogInWithPasskey}
              >
                <LoginIcon style={{ marginRight: 5 }} fontSize="small" />
                Log In with Passkey
              </Button>}
            </form>
            <PasskeySignUpContainer>
              {!passkeyLogin && <Button fullWidth className='text-button'>
                <Typography className='sign-up-text' display="inline" onClick={handleSignUpWithPasskey}>
                  Sign up with Passkey
                </Typography>
                <Link href="https://passkey.org" target="_blank">
                  <FiInfo className='passkey-icon' size='1.5em' />
                </Link>
              </Button>}
              {passkeyLogin && <Button fullWidth className='text-button'>
                <Typography className='sign-up-text' display="block" onClick={handleClearPasskey}>
                  Clear Passkey
                </Typography>
              </Button>}
              {passkeyLogin && <Button fullWidth className='text-button'>
                <Typography className='sign-up-text' display="block" onClick={() => {setPasskeyLogin(false)}}>
                  Log In with Username and Password
                </Typography>
              </Button>}
            </PasskeySignUpContainer>
            <Box mt={5}>
              <Copyright />
            </Box>
          </div>
        </div>
      </Grid>
      {!matches && (
        <Grid item xs={false} sm={4} md={7} className={classes.image} />
      )}
    </Grid>
  );
};

export default LoginPage;
