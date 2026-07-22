/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from 'react';
import { styled } from '@linaria/react';

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
      <span className="large-text color-text-primary" data-testid="no-search-result">
        {mainLabel}
      </span>
      <span className="m-0 mt-15 mb-15 color-text-primary">
        {secondaryLabel}
      </span>
    </NoResultFound>
  );
};

export default ZeroResultsWrapper;
