/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { BUILD_VERSION } from './config.dev';

const Footer = () => {
  var dailyBuildNum = document.querySelector('meta[name="admin-ui-daily-build-version"]')?.getAttribute("content");
  return (
    <div className='footer-container'>
      <p className="footer-copyright-text">
        {`© ${new Date().getFullYear()}. HCL America Inc. All Rights Reserved.`}
      </p>
      <p className="footer-build-version">
        {`Build ${BUILD_VERSION} ${dailyBuildNum}`}
      </p>
    </div>
  );
};

export default Footer;
