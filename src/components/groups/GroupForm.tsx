/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import GroupsIcon from '@mui/icons-material/Group';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import { FormikProps } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, AlertTitle } from '@mui/material';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { AppFormContext } from '../applications/ApplicationContext';
import { AppState } from '../../store';
import {
  ActionButtonBar,
  FormContentContainer,
  InputContainer,
  MainPanel,
  PanelContent,
} from '../../styles/CommonStyles';

import PeopleSelector from '../peopleSelector/PeopleSelector';
import GroupMembers from '../peopleSelector/GroupMembers';

interface GroupFormProps {
  formik: FormikProps<any>;
}
/**
 * GroupForm allows users to both create and update Groups.  Which form to
 * display is controled by the formContext.
 *
 * @author Neil Schultz
 *
 */
const GroupForm: React.FC<GroupFormProps> = ({ formik }) => {
  const dispatch = useDispatch();
  const [formContext] = useContext(AppFormContext) as any;
  const { groupsError } = useSelector((state: AppState) => state.groups);
  const { groupsErrorMessage } = useSelector((state: AppState) => state.groups);

  const defaultViewProps = {
    bgcolor: 'background.paper',
    style: { width: '32rem', height: '25rem' },
  };
  const defaultProps = {
    bgcolor: 'background.paper',
    m: 1,
    style: { width: '57rem', height: '25rem' },
  };
  const columns = [
    { field: 'id', headerName: '', hide: true },
    { field: 'memberName', headerName: 'Group Members', width: 510 },
  ];

  return (
    <FormContentContainer role="presentation">
      <MainPanel>
        <CloseIcon
          cursor="pointer"
          className="close-icon float-right"
          onClick={() => {
            dispatch(toggleApplicationDrawer());
          }}
        />

        {formContext === 'View' ? (
          <PanelContent>
            <Typography
              className="header-title"
              style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
            >
              <GroupsIcon />
              {formContext === 'Add'
                ? ' Add a Group '
                : formContext === 'Edit'
                ? ' Update a Group '
                : ' View Group Details'}
            </Typography>

            <InputContainer style={{ marginTop: 5 }}>
              <TextField
                autoComplete="off"
                fullWidth
                inputProps={{ readOnly: true }}
                label="Group Name"
                name="groupName"
                size="small"
                multiline
                maxRows={2}
                onChange={formik.handleChange}
                value={formik.values.groupName}
                variant='standard'
              />
              {formik.errors.groupName && formik.touched.groupName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.groupName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                autoComplete="off"
                size="small"
                fullWidth
                inputProps={{ readOnly: true }}
                label="Category"
                name="groupCategory"
                multiline
                maxRows={2}
                onChange={formik.handleChange}
                value={formik.values.groupCategory}
                variant='standard'
              />
              {formik.errors.groupCategory && formik.touched.groupCategory ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.groupCategory}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                autoComplete="off"
                size="small"
                fullWidth
                inputProps={{ readOnly: true }}
                label="Description"
                name="groupDescription"
                multiline
                maxRows={3}
                onChange={formik.handleChange}
                value={formik.values.groupDescription}
                variant='standard'
              />
              {formik.errors.groupDescription &&
              formik.touched.groupDescription ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.groupDescription}`}
                </Typography>
              ) : null}
            </InputContainer>
            <Box display="flex">
              <Box borderRadius={16} {...defaultViewProps}>
                <div style={{ height: 350, width: '100%', marginTop: 20 }}>
                  <DataGrid
                    rowHeight={28}
                    rows={formik.values.groupMembers}
                    columns={columns}
                    pageSizeOptions={[8]}
                    hideFooterSelectedRowCount
                  />
                </div>
              </Box>
            </Box>
          </PanelContent>
        ) : (
          <PanelContent onSubmit={formik.handleSubmit}>
            {groupsError && groupsErrorMessage && (
              <Alert style={{ margin: '5px 0' }} severity="error">
                <AlertTitle>Error: Unable to save Group</AlertTitle>
                <Typography
                  style={{ fontSize: 18 }}
                  component="p"
                  variant="caption"
                >
                  {groupsErrorMessage}
                </Typography>
              </Alert>
            )}
            <Typography
              className="header-title"
              style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
            >
              Beta: This form is not yet finished...
            </Typography>
            <Typography
              className="header-title"
              style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
            >
              <GroupsIcon />
              {formContext === 'Add'
                ? ' Add a Group '
                : formContext === 'Edit'
                ? ' Update a Group '
                : 'View Group Details'}
            </Typography>
            <InputContainer style={{ marginTop: 5 }}>
              <TextField
                autoComplete="off"
                fullWidth
                label="Group Name"
                name="groupName"
                size="small"
                multiline
                maxRows={2}
                onChange={formik.handleChange}
                value={formik.values.groupName}
                variant='standard'
              />
              {formik.errors.groupName && formik.touched.groupName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.groupName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                autoComplete="off"
                size="small"
                fullWidth
                label="Category"
                name="groupCategory"
                multiline
                maxRows={2}
                onChange={formik.handleChange}
                value={formik.values.groupCategory}
                variant='standard'
              />
              {formik.errors.groupCategory && formik.touched.groupCategory ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.groupCategory}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                autoComplete="off"
                size="small"
                fullWidth
                label="Description"
                name="groupDescription"
                multiline
                maxRows={3}
                onChange={formik.handleChange}
                value={formik.values.groupDescription}
                variant='standard'
              />
              {formik.errors.groupDescription &&
              formik.touched.groupDescription ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.groupDescription}`}
                </Typography>
              ) : null}
            </InputContainer>
            <Box display="flex" justifyContent="center">
              <Box borderRadius={16} {...defaultProps}>
                <PeopleSelector />
                <Button
                  className="button-style, button-small"
                  style={{ width: '125px', float: 'right', marginRight: '6px' }}
                >
                  Add Member
                  <ArrowRightIcon />
                </Button>
              </Box>
              {formContext === 'Edit' ? (
                <Box borderRadius={16} {...defaultProps}>
                  <div style={{ height: 350, width: '100%', marginTop: 20 }}>
                    <DataGrid
                      rowHeight={28}
                      rows={formik.values.groupMembers}
                      columns={columns}
                      pageSizeOptions={[8]}
                      hideFooterSelectedRowCount
                    />
                  </div>
                  <Button
                    className="button-style, button-small"
                    style={{ width: '150px', float: 'left' }}
                  >
                    <ArrowLeftIcon />
                    Remove Member
                  </Button>
                </Box>
              ) : (
                // Need to be implemented
                <Box borderRadius={16} {...defaultProps}>
                  <GroupMembers />
                  <Button
                    className="button-style, button-small"
                    style={{ width: '150px', float: 'left' }}
                  >
                    <ArrowLeftIcon />
                    Remove Member
                  </Button>
                </Box>
              )}
            </Box>
          </PanelContent>
        )}
        <ActionButtonBar style={{ marginTop: 30 }}>
          <Button
            className="button-style"
            onClick={() => {
              dispatch(toggleApplicationDrawer());
            }}
          >
            Close
          </Button>
          {formContext === 'Add' ? (
            <Button className="button-style" onClick={formik.submitForm}>
              Add
            </Button>
          ) : formContext === 'Edit' ? (
            <Button className="button-style" onClick={formik.submitForm}>
              Update
            </Button>
          ) : (
            ''
          )}
        </ActionButtonBar>
      </MainPanel>
    </FormContentContainer>
  );
};

export default GroupForm;
