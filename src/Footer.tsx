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
      <span className="footer-copyright-text m-0">
        {`Build ${BUILD_VERSION} ${dailyBuildNum}`}
      </span>
    </div>
  );
};

export default Footer;
