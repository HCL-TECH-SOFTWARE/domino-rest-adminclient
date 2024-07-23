/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import Typography from '@mui/material/Typography';
import Error400 from './400.svg';
import Error403 from './403.png';
import Error404 from './404.svg';
import Error500 from './500.jpeg';
import { ErrorContainer, Title } from '../../styles/CommonStyles';

const MasterGreeting = styled.div`
  font-size: 32px;
  padding: 15px 0;
`;

interface IErrorWrapper {
  children: any,
  errorStatus: {
    status: number;
    statusText: string;
  };
}

const ErrorWrapper: React.FC<IErrorWrapper> = ({
  children,
  errorStatus: { status, statusText },
}) => {
  return (
    <>
      {status === 200 && children}
      {status === 500 && (
        <ErrorContainer>
          <Title>
            <Typography className="message">
              Server encountered an unexpected condition that prevented it from fulfilling the request
            </Typography>
          </Title>
          <img className="image-error" src={Error500} alt={statusText} />
        </ErrorContainer>
      )}
      {status === 404 && (
        <ErrorContainer>
          <MasterGreeting>Oops!</MasterGreeting>
          <Title>
            <Typography className="message">{statusText}</Typography>
          </Title>
          <img className="image-error" src={Error404} alt={statusText} />
        </ErrorContainer>
      )}
      {status === 403 && (
        <ErrorContainer>
          <Title>
            <Typography className="message">{statusText}</Typography>
          </Title>
          <img className="image-error" src={Error403} alt={statusText} />
        </ErrorContainer>
      )}
      {status === 400 && (
        <ErrorContainer>
          <MasterGreeting>Oops!</MasterGreeting>
          <Title>
            <Typography className="message">{statusText}</Typography>
          </Title>
          <img className="image-error" src={Error400} alt={statusText} />
        </ErrorContainer>
      )}
    </>
  );
};

export default ErrorWrapper;
