import React, { useEffect, useState } from 'react';
import { handleCallback } from './pkce';
import { loginWithPkce } from '../../store/account/action';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { deepEqual } from '../../utils/common';

const CallbackPage: React.FC = () => {
  const [tokenResponse, setTokenResponse] = useState<any>({})
  const dispatch = useDispatch();
  const navigate = useNavigate()
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    if (code) {
      async function getTokenResponse() {
        const newToken = await handleCallback(oidcConfigUrl, clientId, redirectUri)
        if (newToken.error) {
          console.error('Error fetching token:', newToken.error)
        } else {
          localStorage.setItem('user_token', JSON.stringify(newToken))
          await dispatch(loginWithPkce(newToken) as any)
          setTokenResponse(newToken)
        }
      }
      const oidcConfigUrl = sessionStorage.getItem('oidc_config_url');
      const clientId = sessionStorage.getItem('client_id');
      const redirectUri = sessionStorage.getItem('redirect_uri');
      getTokenResponse()
    } else if (error) {
      console.error('Error fetching token:', error)
    }
  }, [dispatch, navigate])

  useEffect(() => {
    const storageToken = JSON.parse(localStorage.getItem('user_token') as string)
    if (deepEqual(storageToken, tokenResponse)) {
      navigate('/')
    }
  }, [tokenResponse, navigate])

  return (
    <div>
      <h1>Hello</h1>
      <p>{`${JSON.stringify(tokenResponse)}`}</p>
    </div>
  );
};

export default CallbackPage;