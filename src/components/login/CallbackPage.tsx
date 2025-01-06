import React, { useEffect, useState } from 'react';
import { handleCallback } from './pkce';
import { loginWithPkce } from '../../store/account/action';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { deepEqual } from '../../utils/common';
import { Home } from '@mui/icons-material';
import HomeElement from '../home/HomeElement';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';

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
          console.error('Fetched token error:', userToken.error)
          setDisplayText("Error fetching token. Please try again.")
        } else {
          localStorage.setItem('user_token', JSON.stringify(userToken))
          localStorage.setItem('refresh_token', JSON.stringify(refreshToken))
          await dispatch(loginWithPkce(userToken) as any)
          setTokenResponse(userToken)
          setDisplayText("Successfully authenticated! You can now access Admin UI.")
        }
      }
      const oidcConfigUrl = sessionStorage.getItem('oidc_config_url');
      const clientId = sessionStorage.getItem('client_id');
      const redirectUri = sessionStorage.getItem('redirect_uri');
      getTokenResponse()
    } else if (error) {
      setDisplayText("Error authenticating. Please try again.")
      console.error('Failed to initialize authorization request:', error)
    }
  }, [dispatch, navigate])

  useEffect(() => {
    const storageToken = JSON.parse(localStorage.getItem('user_token') as string)
    if (deepEqual(storageToken, tokenResponse)) {
      navigate('/')
    }
  }, [tokenResponse, navigate])

  const CallbackElement: React.FC = () => {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', padding: '40px 0', gap: '10px' }}>
        <span style={{ float: 'left', fontSize: '24px', color: 'black'}}>HCL Domino REST API Administrator</span>
        <h1>{displayText}</h1>
      </section>
    )
  }

  return (
    <>
      <HomeElement MainElement={CallbackElement} />
    </>
  );
};

export default CallbackPage;