/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { handleCallback } from './pkce';
import { loginWithPkce } from '../../store/account/action';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { deepEqual } from '../../utils/common';
import AppShell from '../../AppShell';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/login/CallbackPage');

const CallbackPage: React.FC = () => {
  const [tokenResponse, setTokenResponse] = useState<any>({})
  const { authenticated } = useSelector((state: AppState) => state.account);
  const dispatch = useDispatch();
  const navigate = useNavigate()
  const [displayText, setDisplayText] = useState(authenticated ? "Already successfully authenticated." : "Waiting to be authenticated...")
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    if (code) {
      async function getTokenResponse() {
        const token = await handleCallback(oidcConfigUrl, clientId, redirectUri)
        const { refresh_token, refresh_expires_in, 'not-before-policy': notBeforePolicy, ...userToken } = token
        const refreshToken = {
          refresh_token: refresh_token,
          refresh_expires_in: refresh_expires_in,
          'not-before-policy': notBeforePolicy,
        }
        if (userToken.error) {
          log.error('Fetched token error', { error: userToken.error })
          setDisplayText("Error fetching token. Please try again.")
        } else {
          localStorage.setItem('user_token', JSON.stringify(userToken))
          localStorage.setItem('refresh_token', JSON.stringify(refreshToken))
          await dispatch(loginWithPkce(userToken) as any)
          setTokenResponse(userToken)
          setDisplayText("Successfully authenticated! You can now access Admin UI.")
        }
      }
      const oidcConfigUrl = localStorage.getItem('oidc_config_url');
      const clientId = localStorage.getItem('client_id');
      const redirectUri = sessionStorage.getItem('redirect_uri');
      getTokenResponse()
    } else if (error) {
      setDisplayText("Error authenticating. Please try again.")
      log.error('Failed to initialize authorization request', { error })
    }
  }, [dispatch, navigate])

  useEffect(() => {
    const storageToken = JSON.parse(localStorage.getItem('user_token') as string)
    if (deepEqual(storageToken, tokenResponse)) {
      navigate('/')
    }
  }, [tokenResponse, navigate])

  // Inlined rather than a nested component: declaring one inside the render remounts the
  // subtree on every state change, which reset the message mid-exchange.
  return (
    <AppShell>
      <section className='flex flex-col p-0 pt-40 pb-40 gap-10'>
        <span className='float-left huge-text color-text-primary'>HCL Domino REST API Administrator</span>
        <h1>{displayText}</h1>
      </section>
    </AppShell>
  );
};

export default CallbackPage;