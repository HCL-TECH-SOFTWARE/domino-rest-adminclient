/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import TreeView from '@material-ui/lab/TreeView';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import DBIcon from '@material-ui/icons/Storage';
import ArrowRightIcon from '@material-ui/icons/ChevronRight';
import DocumentIcon from '@material-ui/icons/InsertDriveFile';
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
  useEffect(() => {}, []);
  const handleTreeOnClick = (data: any) => {
    const { nsfpath, api } = data;
    setNsfPath(nsfpath);
    setSchemaName(api);
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
      {contents.map((content, idx) => (
        <StyledTreeItem
          key={idx}
          nodeId={idx.toString()}
          labelText={content.title}
          labelIcon={DBIcon}
        >
          {content.apinames.length > 0 &&
            content.apinames.map((api) => (
              <StyledTreeItem
                key={api}
                nodeId={api}
                labelText={api}
                labelIcon={DocumentIcon}
                onClick={() => handleTreeOnClick({nsfpath: content.nsfpath, api})}
                color="#1a73e8"
                bgColor="#e8f0fe"
              />
            ))}
        </StyledTreeItem>
      ))}
      {!databasePull && <APILoadingProgress label="Schemas" />}
    </TreeView>
  );
};

export default SchemaContentsTree;
