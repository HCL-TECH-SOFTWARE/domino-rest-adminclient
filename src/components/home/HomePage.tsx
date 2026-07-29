/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { KeepHomepage } from '../keep-elements/KeepElements';
import Section from './sections/Section';

/**
 * The `/` route, as a module rather than an inline composition (#813).
 *
 * `Views.tsx` used to spell this out at the route table as
 * `<KeepHomepage><Section /></KeepHomepage>`. Code-splitting needs a module whose default
 * export is a component, so the pairing moves here — every other route already named a
 * single component and needed no equivalent.
 */
const HomePage: React.FC = () => (
  <KeepHomepage>
    <Section />
  </KeepHomepage>
);

export default HomePage;
