/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { useNavigate } from '../../../../../router/react';
import SchemasAlphabeticalView from './SchemasAlphabeticalView';
import {
  KeepSchemasCardsView,
  KeepSchemasDefaultView,
  KeepSchemasStacksView,
} from '../../../../keep-elements/KeepElements';

type SchemasMultiViewProps = {
  view: string;
  databases: any;
};

/**
 * Picks which of the four schema views to render.
 *
 * **Navigation moved here from the four views.** Three of them are Lit elements now and emit
 * `schema-open` instead of calling `navigate()` themselves: the router is handed out through
 * React context with no module-level instance, so an element cannot reach it, and the reactive
 * controller `router/react.tsx` promises does not exist yet. Concentrating it here is also the
 * better shape — one place navigates, the leaves report intent — and it is where a
 * `RouterController` will plug in when this file converts too.
 *
 * `SchemasAlphabeticalView` is still React and still navigates for itself.
 */
const SchemasMultiView: React.FC<SchemasMultiViewProps> = ({ view, databases }) => {
  const navigate = useNavigate();

  const openSchema = (database: any) => {
    navigate(`/schema/${encodeURIComponent(database.nsfPath)}/${database.schemaName}`);
  };

  return (
    <>
      {view === 'nsf' && (
        <KeepSchemasDefaultView
          databases={databases}
          onSchemaOpen={(e) => openSchema(e.detail.database)}
        />
      )}
      {view === 'alphabetical' && <SchemasAlphabeticalView databases={databases} />}
      {view === 'card' && (
        <KeepSchemasCardsView
          databases={databases}
          onSchemaOpen={(e) => openSchema(e.detail.database)}
        />
      )}
      {view === 'stack' && (
        <KeepSchemasStacksView
          databases={databases}
          onSchemaOpen={(e) => openSchema(e.detail.database)}
        />
      )}
    </>
  );
};

export default SchemasMultiView;
