/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { createStyles } from '@material-ui/styles';
import TreeView from '@material-ui/lab/TreeView';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import ArrowRightIcon from '@material-ui/icons/ChevronRight';
import DocumentIcon from '@material-ui/icons/Description';
import FolderIcon from '@material-ui/icons/Folder';
import ArrowDropDownIcon from '@material-ui/icons/KeyboardArrowDown';
import { SvgIconProps } from '@material-ui/core/SvgIcon';
import { AvailableDatabases } from '../../store/databases/types';
import APILoadingProgress from '../loading/APILoadingProgress';

declare module 'csstype' {
  interface Properties {
    '--tree-view-color'?: string;
    '--tree-view-bg-color'?: string;
  }
}

type StyledTreeItemProps = TreeItemProps & {
  bgColor?: string;
  color?: string;
  labelIcon: React.ElementType<SvgIconProps>;
  labelText: string;
};

const useTreeItemStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      color: theme.palette.text.secondary,
      '&:focus > $content': {
        backgroundColor: `var(--tree-view-bg-color, ${theme.palette.grey[400]})`,
        color: 'var(--tree-view-color)',
      },
    },
    content: {
      color: theme.palette.text.secondary,
      borderTopRightRadius: theme.spacing(2),
      borderBottomRightRadius: theme.spacing(2),
      paddingRight: theme.spacing(1),
      // There is a style problem in @material/styles(it defines Theme.Typography.fontWeightMedium as string)
      // Disable type check for now
      // @ts-ignore
      fontWeight: theme.typography.fontWeightMedium,
      '$expanded > &': {
        fontWeight: theme.typography.fontWeightRegular,
      },
    },
    group: {
      marginLeft: 0,
      '& $content': {
        paddingLeft: theme.spacing(2),
      },
    },
    expanded: {},
    label: {
      fontWeight: 'inherit',
      color: 'inherit',
    },
    labelRoot: {
      display: 'flex',
      alignItems: 'center',
      padding: theme.spacing(0.5, 0),
    },
    labelIcon: {
      marginRight: theme.spacing(1),
    },
    labelText: {
      fontWeight: 'inherit',
      flexGrow: 1,
    },
  })
);

function StyledTreeItem(props: StyledTreeItemProps) {
  const classes = useTreeItemStyles();
  const { labelText, labelIcon: LabelIcon, color, bgColor, ...other } = props;

  return (
    <TreeItem
      label={
        <div className={classes.labelRoot}>
          <LabelIcon color="primary" className={classes.labelIcon} />
          <Typography
            variant="body2"
            color="textPrimary"
            className={classes.labelText}
          >
            {labelText}
          </Typography>
        </div>
      }
      classes={{
        root: classes.root,
        content: classes.content,
        expanded: classes.expanded,
        group: classes.group,
        label: classes.label,
      }}
      {...other}
    />
  );
}

interface FileContentsTreeProps {
  contents: AvailableDatabases[];
  setNsfPath: any;
}

const FileContentsTree: React.FC<FileContentsTreeProps> = ({
  contents,
  setNsfPath,
}) => {
  const [availDBLoading, setAvailDBLoading] = useState(true);
  const { databasePull } = useSelector(
    (state: AppState) => state.databases
  );

  const addPath = (fullarr: any, arr: any, obj: any = {}) => {
      const fullpath = fullarr.join('/');
      const component = arr.shift();
      let current = obj[component] || (obj[component] = {path:component, fullpath});
      if (arr.length) {
          addPath(fullarr, arr, current.children || (current.children = {}));
      };
      return obj;
  }

  const toArray = (obj: any) => {
      let arr = Object.values(obj);
      arr.filter((item: any) => item.children).forEach((item: any) => {
          item.children = toArray(item.children);
      });
      return arr;
  }

  const contentPath = contents.map((content) => content.title);
  const contentObj = contentPath.reduce((obj, path) => addPath(path.split('/'), path.split('/'), obj), {});
  const contentArr = toArray(contentObj);

  useEffect(() => {
    if (contentArr && contentArr.length > 0) {
      setAvailDBLoading(false);
    }
  }, [availDBLoading, contentArr]);

  const renderTree = (contents: any) => {
    return (
    <StyledTreeItem
      key={contents.path}
      nodeId={contents.path}
      labelText={contents.path}
      labelIcon={contents.children ? FolderIcon : DocumentIcon}
      onClick={contents.children ? () => {} : () => setNsfPath(contents.fullpath)}
    >
      {contents.children && contents.children.length > 0
        ? contents.children.map((content: any) => renderTree(content))
        : null}
    </StyledTreeItem>
    );
  };

  return (
    <TreeView
      className="file-contents"
      defaultExpanded={['5']}
      defaultCollapseIcon={
        <ArrowDropDownIcon color="primary" style={{ fontSize: 16 }} />
      }
      defaultExpandIcon={
        <ArrowRightIcon color="primary" style={{ fontSize: 16 }} />
      }
      defaultEndIcon={<div style={{ width: 24 }} />}
    >
      {
        (contentArr && contentArr.length > 0) && contentArr.map((content:any, idx:any) => (
          <StyledTreeItem
            key={idx}
            nodeId={idx.toString()}
            labelText={content.path}
            labelIcon={content.children ? FolderIcon : DocumentIcon}
            onClick={content.children ? () => {} : () => setNsfPath(content.path)}
          >
            {(content.children && content.children.length > 0) && content.children.map((file:any) => (
              renderTree(file)
            ))}
          </StyledTreeItem>
        ))
      }
      {!databasePull && <APILoadingProgress label="Databases" />}
    </TreeView>
  );
};

export default FileContentsTree;
