/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import TextField from '@mui/material/TextField';
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
            <span
              className="header-title background-keep-base"
            >
              <GroupsIcon />
              {formContext === 'Add'
                ? ' Add a Group '
                : formContext === 'Edit'
                ? ' Update a Group '
                : ' View Group Details'}
            </span>

            <InputContainer className='mt-5'>
              <TextField
                autoComplete="off"
                fullWidth
                slotProps={{ input: { readOnly: true } }}
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
                <span className="validation-error color-text-primary">
                  {`${formik.errors.groupName}`}
                </span>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                autoComplete="off"
                size="small"
                fullWidth
                slotProps={{ input: { readOnly: true } }}
                label="Category"
                name="groupCategory"
                multiline
                maxRows={2}
                onChange={formik.handleChange}
                value={formik.values.groupCategory}
                variant='standard'
              />
              {formik.errors.groupCategory && formik.touched.groupCategory ? (
                <span className="validation-error color-text-primary">
                  {`${formik.errors.groupCategory}`}
                </span>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                autoComplete="off"
                size="small"
                fullWidth
                slotProps={{ input: { readOnly: true } }}
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
                <span className="validation-error color-text-primary">
                  {`${formik.errors.groupDescription}`}
                </span>
              ) : null}
            </InputContainer>
            <Box className='flex'>
              <Box className='rounded-16' {...defaultViewProps}>
                <div className='h-fit full-width mt-20'>
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
              <Alert className='m-0 mt-0 mb-0' severity="error">
                <AlertTitle>Error: Unable to save Group</AlertTitle>
                <span className="big-text">
                  {groupsErrorMessage}
                </span>
              </Alert>
            )}
            <span className="header-title background-keep-base">
              Beta: This form is not yet finished...
            </span>
            <span
              className="header-title background-keep-base"
            >
              <GroupsIcon />
              {formContext === 'Add'
                ? ' Add a Group '
                : formContext === 'Edit'
                ? ' Update a Group '
                : 'View Group Details'}
            </span>
            <InputContainer className='mt-5'>
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
                <span className="validation-error color-text-primary">
                  {`${formik.errors.groupName}`}
                </span>
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
                <span className="validation-error color-text-primary">
                  {`${formik.errors.groupCategory}`}
                </span>
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
                <span className="validation-error color-text-primary">
                  {`${formik.errors.groupDescription}`}
                </span>
              ) : null}
            </InputContainer>
            <Box className='flex justify-center'>
              <Box className='rounded-16' {...defaultProps}>
                <PeopleSelector />
                <Button
                  className="group-form-button-style group-form-button-small group-add-member-button"
                >
                  Add Member
                  <ArrowRightIcon />
                </Button>
              </Box>
              {formContext === 'Edit' ? (
                <Box className='rounded-16' {...defaultProps}>
                  <div className='full-width mt-20'>
                    <DataGrid
                      rowHeight={28}
                      rows={formik.values.groupMembers}
                      columns={columns}
                      pageSizeOptions={[8]}
                      hideFooterSelectedRowCount
                    />
                  </div>
                  <Button
                    className="group-form-button-style group-form-button-small group-remove-member-button"
                  >
                    <ArrowLeftIcon />
                    Remove Member
                  </Button>
                </Box>
              ) : (
                // Need to be implemented
                <Box sx={{ borderRadius: 16 }} {...defaultProps}>
                  <GroupMembers />
                  <Button
                    className="group-form-button-style group-form-button-small group-remove-member-button"
                  >
                    <ArrowLeftIcon />
                    Remove Member
                  </Button>
                </Box>
              )}
            </Box>
          </PanelContent>
        )}
        <ActionButtonBar className='mt-30'>
          <Button
            className="group-form-button-style"
            onClick={() => {
              dispatch(toggleApplicationDrawer());
            }}
          >
            Close
          </Button>
          {formContext === 'Add' ? (
            <Button className="group-form-button-style" onClick={formik.submitForm}>
              Add
            </Button>
          ) : formContext === 'Edit' ? (
            <Button className="group-form-button-style" onClick={formik.submitForm}>
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
