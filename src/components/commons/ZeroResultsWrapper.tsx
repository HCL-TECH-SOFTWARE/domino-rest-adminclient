/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Typography } from '@mui/material';
import * as React from 'react';
import styled from 'styled-components';

const NoResultFound = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;

  .no-result {
    font-size: 22px;
  }

  .not-found {
    margin: 15px 0;
  }
`;

type ZeroResultsWrapperProps = {
  mainLabel: string;
  secondaryLabel: string;
};

const ZeroResultsWrapper: React.FC<ZeroResultsWrapperProps> = ({
  mainLabel,
  secondaryLabel,
}) => {
  return (
    <NoResultFound>
      <Typography className="no-result" color="textPrimary" data-testid="no-search-result">
        {mainLabel}
      </Typography>
      <Typography className="not-found" color="textPrimary">
        {secondaryLabel}
      </Typography>
    </NoResultFound>
  );
};

export default ZeroResultsWrapper;
