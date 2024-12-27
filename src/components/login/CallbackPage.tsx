import React, { useEffect } from 'react';
import { handleCallback } from './pkce';

const CallbackPage: React.FC = () => {
  useEffect(() => {
    handleCallback()
  }, [])

  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
};

export default CallbackPage;