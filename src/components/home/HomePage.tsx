/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { KeepHomepage } from '../keep-elements/react/KeepHomepage';
import Section from './sections/Section';

/**
 * The `/` route, as a module rather than an inline composition (#813).
 *
 * `Views.tsx` used to spell this out at the route table as
 * `<KeepHomepage><Section /></KeepHomepage>`. Code-splitting needs a module whose default
 * export is a component, so the pairing moves here — every other route already named a
 * single component and needed no equivalent.
 *
 * The wrapper is deep-imported, not taken from the `KeepElements` barrel. This module is a
 * *route root*, so anything it names lands in the `/` chunk — and the barrel re-exported four
 * other route roots, which would have dragged the schemas, scopes, access and applications
 * screens into the home page. That is the exact defect #813 split the wrappers apart to stop,
 * and this was its last instance: with this import changed the barrel had no consumers left
 * and is deleted.
 */
const HomePage: React.FC = () => (
  <KeepHomepage>
    <Section />
  </KeepHomepage>
);

export default HomePage;
