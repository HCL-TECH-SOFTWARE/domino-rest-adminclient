/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Group';
import Button from '@mui/material/Button';
import EditIcon from '@mui/icons-material/Edit';
import Tooltip from '@mui/material/Tooltip';
import RemoveIcon from '@mui/icons-material/Delete';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import { DataGrid, GridCellParams, GridApi } from '@material-ui/data-grid';
import * as Yup from 'yup';
import FormDrawer from '../applications/FormDrawer';
import DeleteApplicationDialog from '../applications/DeleteApplicationDialog';
import {
  deleteGroup,
  fetchGroups,
  createGroup,
  updateGroup,
  clearGroupError
} from '../../store/groups/action';
import { PIM_KEEP_API_URL } from '../../config.dev';
import { AppState } from '../../store';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { getToken } from '../../store/account/action';
import { AppFormContext } from '../applications/ApplicationContext';
import { toggleDeleteDialog } from '../../store/dialog/action';

import { GroupDB } from '../../store/groups/types';

import { TokenProps } from '../../store/account/types';
import {
  ActionHeader,
  FormContainer,
  TopBanner
} from '../../styles/CommonStyles';
/**
 * Groups.tsx provides support for Domino groups
 *
 * @author Neil Schultz
 */

// Validations for group page

const GroupFormSchema = Yup.object().shape({
  groupName: Yup.string()
    .required('Group Name is Required!')
    .test('First Character', 'Group Name must start with a letter!', (val) => {
      let retval = false;
      if (val && val.length) {
        retval = isNaN(parseInt(val.charAt(0), 10));
      }
      return retval;
    })
    .min(2, 'Group Name is too short (minimum is 4 characters!)')
    .max(20, 'Maximum 20 characters!'),
  groupCategory: Yup.string()
    .required('Group Category is Required!')
    .test(
      'First Character',
      'Category Name must start with a letter!',
      (val) => {
        let retval = false;
        if (val && val.length) {
          retval = isNaN(parseInt(val.charAt(0), 10));
        }
        return retval;
      }
    )
    .min(2, 'Group Category is too short (minimum is 4 characters!)')
    .max(20, 'Maximum 20 characters!'),

  groupDescription: Yup.string()
    .min(4, 'Description is too short (minimum is 4 characters)!')
    .required('Please provide a short description of your group!'),

  groupMembers: Yup.string().required('Please add group members!')
});

/**
 * Groups is a functional component for displaying the
 * Groups page.
 */
const Groups: React.FC = () => {
  // Define the column layout for the Groups table
  const columns = [
    { field: 'id', headerName: '', hide: true },
    { field: 'groupName', headerName: 'Group', flex: 1.4 },
    { field: 'groupCategory', headerName: 'Category', flex: 1.4 },
    { field: 'groupDescription', headerName: 'Description', flex: 6 },
    {
      field: 'groupActions',
      headerName: 'Actions',
      flex: 0.85,
      sortable: false,
      disableClickEventBubbling: true,
      renderCell: (params: GridCellParams) => {
        // Fetch the current row of the DataGrid
        const fetchCurrentRow = () => {
          const api: GridApi = params.api;
          const fields = api
            .getAllColumns()
            .map((c) => c.field)
            .filter((c) => c !== '__check__' && !!c);
          const thisRow: Array<any> = [];
          fields.forEach((f, index) => {
            thisRow[index] = params.getValue(params.row.id, f);
          });
          return thisRow;
        };

        // onUpdate Event
        const onUpdateClick = (event: any) => {
          // Stop the event
          event.stopPropagation();

          const row: Array<any> = fetchCurrentRow();
          // Set the form context
          setformContext('Edit');
          updateAction(row);
        };

        // onDelete Event
        const onDeleteClick = (event: any) => {
          // Stop the event
          event.stopPropagation();

          const row: Array<any> = fetchCurrentRow();
          deleteAction(row);
        };

        return (
          <span>
            <Tooltip style={{ marginLeft: 15 }} title="Edit Group" arrow>
              <EditIcon onClick={onUpdateClick} />
            </Tooltip>
            <Tooltip style={{ marginLeft: 15 }} title="Delete Group" arrow>
              <RemoveIcon onClick={onDeleteClick} />
            </Tooltip>
          </span>
        );
      }
    }
  ];

  // Fetch the Groups list
  const dispatch = useDispatch();
  useEffect(() => {
    document.title = 'HCL Domino REST API Admin | Groups';
    dispatch(fetchGroups() as any);
  }, [dispatch]);

  // Form support
  const formik = useFormik({
    // Initial form values
    initialValues: {
      groupId: '',
      groupName: '',
      groupCategory: '',
      groupDescription: '',
      groupMembers: ''
    },

    // Clear errors if user makes changes
    validate: () => {
      dispatch(clearGroupError());
    },
    validationSchema: GroupFormSchema,

    /**
     * Create / Update group
     *
     * @param values values from the Create / Update form
     */
    onSubmit: (values) => {
      let newMembersList: Array<string>;
      let currentUser: string = '';

      // Parse members list
      newMembersList = processMembers(values.groupMembers);

      // Get the current user from the auth token
      const jwtToken = localStorage.getItem('user_token') as string;
      if (jwtToken) {
        const jsonToken = JSON.parse(jwtToken) as TokenProps;
        if (
          jsonToken != null &&
          jsonToken.claims != null &&
          jsonToken.claims.sub != null
        ) {
          currentUser = jsonToken.claims.sub;
        }
      }

      // Collect database values
      const groupData: GroupDB = {
        Form: 'Group',
        Type: 'Group',
        ListName: values.groupName,
        ListCategory: values.groupCategory,
        ListDescription: values.groupDescription,
        ListOwner: currentUser,
        Members: newMembersList
      };

      // Call the proper Keep api based on context
      if (formContext === 'Add') {
        dispatch(createGroup(groupData) as any);
      } else {
        // Update Group
        dispatch(updateGroup(values.groupId, groupData) as any);
      }
    }
  });

  /**
   * processMembers takes a string of members separated by commas,
   * newlines, or white space, and breaks it into an array for the
   * backend.
   *
   * @param members string of members
   */
  const processMembers = (members: string) => {
    let retval: Array<string>;

    // Replace comma and newline with space
    members = members.replace(/,/g, ' ');
    members = members.replace(/\n/g, ' ');
    members = members.replace(/\s\s+/g, ' ');

    // Break it into an array
    retval = members.split(' ');
    return retval;
  };

  // The id of the currently selected group
  let selectedGroupId: string = '';

  /**
   * createAction is called when the Create Group button is clicked
   * to open the Create form
   */
  const createAction = () => {
    // Set the context and open the drawer
    setformContext('Add');

    // Reset the form
    formik.resetForm();

    // Open the Create form
    dispatch(toggleApplicationDrawer());
  };

  /**
   * updateAction is called when the Update Group icon is clicked
   * to open the Update form
   *
   * @param currentRow the values from selected Group grid row
   */
  const updateAction = (currentRow: Array<any>) => {
    // Initial form values
    const updateValues: any = {
      groupId: '',
      groupName: '',
      groupCategory: '',
      groupDescription: '',
      groupMembers: []
    };

    const groupId: string = currentRow[0];

    // Fetch the current values
    axios
      .get(`${PIM_KEEP_API_URL}/public/group/${groupId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })
      .then((response) => {
        // Set the form values
        updateValues.groupId = groupId;
        updateValues.groupName = response.data.ListName;
        updateValues.groupCategory = response.data.ListCategory;
        updateValues.groupDescription = response.data.ListDescription;

        // Put each member in Datagrid rows

        let i: number = 0;
        const memberList: Array<any> = [];
        response.data.Members.length === 0
          ? (updateValues.groupMembers = [])
          : response.data.Members.forEach((member: any) => {
              memberList.push({
                id: i,
                memberName: member
              });
              i++;
            });
        updateValues.groupMembers = memberList;

        formik.setValues(updateValues);

        // Open the drawer with the form
        dispatch(toggleApplicationDrawer());
      })
      .catch((err) => {
        // Use the Keep response error if it's available
        if (err.response && err.response.statusText) {
          console.log(`Error reading Groups: ${err.response.statusText}`);
        }
        // Otherwise use the generic error
        else {
          console.log(`Error reading Groups: ${err.message}`);
        }
      });
  };

  // onView Event
  function handleOnClick(rowData: any) {
    setformContext('View');
    const updateValues: any = {
      groupId: '',
      groupName: '',
      groupCategory: '',
      groupDescription: '',
      groupMembers: []
    };

    const groupId: string = rowData.id;

    // Fetch the current values
    axios
      .get(`${PIM_KEEP_API_URL}/public/group/${groupId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })
      .then((response) => {
        // Set the form values
        updateValues.groupId = rowData;
        updateValues.groupName = response.data.ListName;
        updateValues.groupCategory = response.data.ListCategory;
        updateValues.groupDescription = response.data.ListDescription;

        // Put each member in Datagrid rows

        let i: number = 0;
        const memberList: Array<any> = [];
        response.data.Members.length === 0
          ? (updateValues.groupMembers = [])
          : response.data.Members.forEach((member: any) => {
              memberList.push({
                id: i,
                memberName: member
              });
              i++;
            });
        updateValues.groupMembers = memberList;

        formik.setValues(updateValues);

        // Open the drawer with the form
        dispatch(toggleApplicationDrawer());
      })
      .catch((err) => {
        // Use the Keep response error if it's available
        if (err.response && err.response.statusText) {
          console.log(`Error reading Groups: ${err.response.statusText}`);
        }
        // Otherwise use the generic error
        else {
          console.log(`Error reading Groups: ${err.message}`);
        }
      });
  }
  /**
   * deleteAction is called when the Delete Group icon is clicked.
   *
   * @param currentRow the values from selected Group grid row
   */
  const deleteAction = (currentRow: Array<any>) => {
    // Save selection
    selectedGroupId = currentRow[0];

    // Open the delete confirmation dialog
    dispatch(toggleDeleteDialog());
  };

  /**
   * deleteConfirmed is called when user has confirmed that they want to
   * delete the group.
   */
  const deleteConfirmed = () => {
    dispatch(deleteGroup(selectedGroupId) as any);
  };

  // Use Groups state as input to the DataGrid
  const groupsRows = useSelector((state: AppState) => state.groups.groups);
  const [formContext, setformContext] = useState('');

  // Messages for the Delete dialog
  const deleteGroupTitle: string = 'Delete Group';
  const deleteGroupMessage: string =
    'Are you sure you want to delete this Group?';

  // Display the top banner and a list of Groups
  return (
    <AppFormContext.Provider value={[formContext, setformContext]}>
      <FormContainer>
        <ActionHeader>
          <TopBanner>
            <GroupsIcon className="groupsIcon" />
            <span style={{ marginLeft: 10 }}>Groups Management</span>
          </TopBanner>
          <Button
            color="primary"
            className="button-create"
            onClick={createAction}
          >
            <AddIcon style={{ margin: '0 5px' }} />
            Add Group
          </Button>
          <Tooltip placement="top" title="Click on Row for more details!">
            <div
              style={{
                height: 500,
                width: '100%',
                marginTop: 60,
                cursor: 'pointer'
              }}
            >
              <DataGrid
                rowHeight={42}
                rows={groupsRows}
                columns={columns}
                pageSize={9}
                rowsPerPageOptions={[9]}
                onRowClick={(param) => handleOnClick(param.row)}
              />
            </div>
          </Tooltip>
          <DeleteApplicationDialog
            dialogTitle={deleteGroupTitle}
            deleteMessage={deleteGroupMessage}
            handleDelete={deleteConfirmed}
          />
          <FormDrawer formName="GroupForm" formik={formik} />
        </ActionHeader>
      </FormContainer>
    </AppFormContext.Provider>
  );
};

export default Groups;
