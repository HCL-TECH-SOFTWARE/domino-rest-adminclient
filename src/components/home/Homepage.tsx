/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';
import Section from './sections/Section';

const HomepageContainer = styled.div`
  overflow-y: auto;
`;

const Homepage = () => {
  return (
    <HomepageContainer>
      <Section />
    </HomepageContainer>
  );
};

export default Homepage;
