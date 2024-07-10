/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { CircularProgress, Typography } from '@mui/material';
import styled from 'styled-components';

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
          <Typography color='textPrimary'>{message}</Typography>
        </LabelContainer>
      )}
    </LoadingContainer>
  );
};

export default GenericLoading;
