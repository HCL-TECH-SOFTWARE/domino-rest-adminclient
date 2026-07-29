/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { AvailableDatabases } from '../../store/databases/types';
import APILoadingProgress from '../loading/APILoadingProgress';
import { KeepTree } from '../keep-elements/react/KeepTree';
import type { KeepTreeNode, KeepTreeSelectDetail } from '../keep-elements/keep-tree';

/** Font Awesome glyphs registered in `services/icon-library`. */
const FOLDER_ICON = 'folder';
const DOCUMENT_ICON = 'file';

/** Intermediate shape while the flat `a/b/c.nsf` titles are folded into a tree. */
interface PathBranch {
  path: string;
  fullpath: string;
  children?: Record<string, PathBranch>;
}

/**
 * Fold one `a/b/c.nsf` title into `branches`, creating the intermediate folders
 * on the way. `segments` is consumed (shifted) as the recursion descends.
 */
const addPath = (
  fullpath: string,
  segments: string[],
  branches: Record<string, PathBranch>
): Record<string, PathBranch> => {
  const segment = segments.shift() as string;
  const current = branches[segment] || (branches[segment] = { path: segment, fullpath });
  if (segments.length) {
    addPath(fullpath, segments, current.children || (current.children = {}));
  }
  return branches;
};

/** Map the folded path tree onto the generic node shape `keep-tree` renders. */
const toTreeNodes = (
  branches: Record<string, PathBranch>,
  parentId = ''
): KeepTreeNode[] =>
  Object.values(branches).map((branch) => {
    const id = parentId ? `${parentId}/${branch.path}` : branch.path;
    const children = branch.children ? toTreeNodes(branch.children, id) : undefined;
    return {
      id,
      label: branch.path,
      // Matches the previous MUI rendering: a folder glyph on branches, a document
      // glyph on leaves — in addition to the expand/collapse icons `keep-tree` slots in.
      icon: children ? FOLDER_ICON : DOCUMENT_ICON,
      value: branch.fullpath,
      children
    };
  });

interface FileContentsTreeProps {
  contents: AvailableDatabases[];
  setNsfPath: any;
}

const FileContentsTree: React.FC<FileContentsTreeProps> = ({
  contents,
  setNsfPath,
}) => {
  const { databasePull } = useSelector(
    (state: AppState) => state.databases
  );

  const nodes = useMemo(() => {
    const branches = contents.reduce<Record<string, PathBranch>>(
      (acc, content) => addPath(content.title, content.title.split('/'), acc),
      {}
    );
    return toTreeNodes(branches);
  }, [contents]);

  // Only leaves emit `item-select`, so folders stay click-inert as before.
  const handleItemSelect = (event: CustomEvent<KeepTreeSelectDetail>) => {
    setNsfPath(event.detail.value as string);
  };

  return (
    <>
      <KeepTree
        className="file-contents"
        nodes={nodes}
        onItemSelect={handleItemSelect}
      />
      {!databasePull && <APILoadingProgress label="Databases" />}
    </>
  );
};

export default FileContentsTree;
