/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';
import BreadcrumbRouter from './BreadcrumbRouter';

const PageRouterContainer = styled.div`
  height: 60px;
  display: block;
  justify-content: center;
  align-items: center;
  flex: 1;
  @media only screen and (max-width: 768px) {
    display: none;
  }

  .arrow-left {
    width: 70px;
  }
`;

const PageRouters = () => {
  return (
    <PageRouterContainer>
      <BreadcrumbRouter />
    </PageRouterContainer>
  );
};

export default PageRouters;
