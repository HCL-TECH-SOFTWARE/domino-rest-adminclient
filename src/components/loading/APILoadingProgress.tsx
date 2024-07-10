/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { CircularProgress, Typography } from '@mui/material';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  height: calc(100vh - 170px);
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
  label: string;
}

const APILoadingProgress: React.FC<APILoadingProgressProps> = ({ label }) => {
  return (
    <LoadingContainer>
      <CircularProgress color="primary" />
      <LabelContainer>
        <Typography color="textPrimary">
          {`${label} are loading. This may take a few seconds...`}
        </Typography>
      </LabelContainer>
    </LoadingContainer>
  );
};

export default APILoadingProgress;
