/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { CircularProgress } from '@mui/material';
import { styled } from '@linaria/react';

const LoadingContainer = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
`;

const LabelContainer = styled.div`
  margin: 10px 0;
  display: flex;
`;

interface APILoadingProgressProps {
  message?: string;
}

const GenericLoading: React.FC<APILoadingProgressProps> = ({ message }) => {
  return (
    <LoadingContainer>
      <CircularProgress color='primary' />
      {message && (
        <LabelContainer>
          <span className="color-text-primary">{message}</span>
        </LabelContainer>
      )}
    </LoadingContainer>
  );
};

export default GenericLoading;
