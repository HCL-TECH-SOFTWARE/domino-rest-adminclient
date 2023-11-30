/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';
import Typography from '@material-ui/core/Typography';
import { BUILD_VERSION } from './config.dev';

const FooterContainer = styled.div`
  display: flex;
  position: fixed;
  padding: 0 15px;
  bottom: 0;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  background: #212121;

  .copyright {
    margin-right: 20px;
    color: #f5f5f5;
  }

  .build-version {
    color: #fafafa;
    font-weight: 500;
  }
`;

const Footer = () => {
  var dailyBuildNum = document.querySelector('meta[name="admin-ui-daily-build-version"]')?.getAttribute("content");
  return (
    <FooterContainer>
      <Typography className="copyright" variant="caption" color="textPrimary">
        {`© ${new Date().getFullYear()}. HCL America Inc. All Rights Reserved.`}
      </Typography>
      <Typography
        className="build-version"
        variant="caption"
        color="textPrimary"
      >
        {`Build ${BUILD_VERSION} ${dailyBuildNum}`}
      </Typography>
    </FooterContainer>
  );
};

export default Footer;
