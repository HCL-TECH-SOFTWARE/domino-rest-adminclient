/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { AvailableDatabases } from '../../store/databases/types';
import APILoadingProgress from '../loading/APILoadingProgress';
import { KeepTree } from '../keep-elements/KeepElements';
import type { KeepTreeNode, KeepTreeSelectDetail } from '../keep-elements/keep-tree';

/** Font Awesome glyphs registered in `services/icon-library`. */
const DATABASE_ICON = 'database';
const DOCUMENT_ICON = 'file';

/** Payload carried on the schema (leaf) nodes and echoed back on selection. */
interface SchemaValue {
  nsfpath: string;
  api: string;
}

interface SchemaContentsTreeProps {
  contents: AvailableDatabases[];
  setNsfPath: any;
  setSchemaName: any;
}

const SchemaContentsTree: React.FC<SchemaContentsTreeProps> = ({
  contents,
  setNsfPath,
  setSchemaName,
}) => {
  const { databasePull } = useSelector(
    (state: AppState) => state.databases
  );

  const nodes: KeepTreeNode[] = contents.map((content, idx) => ({
    id: `db-${idx}`,
    label: content.title,
    icon: DATABASE_ICON,
    children: [...new Set(content.apinames)].map((api, apiIdx) => ({
      id: `db-${idx}-${api}-${apiIdx}`,
      label: api,
      icon: DOCUMENT_ICON,
      value: { nsfpath: content.nsfpath, api } as SchemaValue
    }))
  }));

  const handleItemSelect = (event: CustomEvent<KeepTreeSelectDetail>) => {
    const value = event.detail.value as SchemaValue | undefined;
    // A database with no APIs has no children, so `keep-tree` treats it as a
    // selectable leaf. It carries no payload and was not clickable before.
    if (!value) return;
    setNsfPath(value.nsfpath);
    setSchemaName(value.api);
  };

  return (
    <>
      <KeepTree
        className="file-contents"
        nodes={nodes}
        onItemSelect={handleItemSelect}
      />
      {!databasePull && <APILoadingProgress label="Schemas" />}
    </>
  );
};

export default SchemaContentsTree;
