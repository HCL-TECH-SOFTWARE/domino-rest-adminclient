/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext, useEffect } from 'react';
import { GridCellParams, DataGrid, GridApi } from '@mui/x-data-grid';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { Button, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DelIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import { AppState } from '../../store';
import {
  addPeople,
  clearPeopleError,
  fetchPeople,
  updatePeople,
  deletePeople,
} from '../../store/people/action';
import { toggleDeleteDialog } from '../../store/dialog/action';
import FormDrawer from '../applications/FormDrawer';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { AppFormContext } from '../applications/ApplicationContext';
import DeleteApplicationDialog from '../applications/DeleteApplicationDialog';
import { PIM_KEEP_API_URL } from '../../config.dev';
import { PeopleDB } from '../../store/people/types';
import { getToken } from '../../store/account/action';
import { TokenProps } from '../../store/account/types';
import {
  ActionHeader,
  PageTitle,
  FormContainer,
  TopBanner,
} from '../../styles/CommonStyles';
import { apiRequestWithRetry } from '../../utils/api-retry';

/**
 * PeopleCRUD.tsx provides support for CRUD Operations
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

// validations for people form
const phoneRegExp = /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
const FormSchema = Yup.object().shape({
  firstName: Yup.string()
    .required('First Name is Required!')
    .test('First Character', 'Name must start with a letter!', (val) => {
      let retval = false;
      if (val && val.length) {
        retval = isNaN(parseInt(val.charAt(0), 10));
      }
      return retval;
    })
    .min(2, 'Minimum is 3 characters')
    .max(15, 'Maximum 15 characters'),
  lastName: Yup.string()
    .required('Last Name is Required!')
    .test('First Character', 'Name must start with a letter!', (val) => {
      let retval = false;
      if (val && val.length) {
        retval = isNaN(parseInt(val.charAt(0), 10));
      }
      return retval;
    })
    .max(10, 'Maximum 10 characters'),
  password: Yup.string()
    .min(8, 'Minimum 8 characters')
    .required('Password is Required!'),
  companyName: Yup.string().required('Company Name is Required!'),

  phoneNumber: Yup.string()
    .matches(phoneRegExp, 'Phone number is not valid')
    .required('Please provide valid phone number!')
    .min(10, 'Minimum 10 digits!'),

  internetAddress: Yup.string()
    .required('Please provide internet address!')
    .email('Invalid format!'),
  mailAddress: Yup.string()
    .required('Please provide mail address!')
    .email('Invalid format!'),
});
// Display People page
const PeopleCRUD: React.FC = () => {
  const columns = [
    { field: 'id', headerName: '', hide: true },
    { field: 'firstName', headerName: 'First Name', flex: 0.8 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    { field: 'internetAddress', headerName: 'Internet Address', flex: 2 },
    { field: 'mailDomain', headerName: 'Mail Domain', flex: 1 },
    { field: 'mailFile', headerName: 'Mail File', flex: 1.3 },
    { field: 'lastModified', headerName: 'Last Modified', flex: 1.2 },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.7,
      sortable: false,
      disableClickEventBubbling: true,
      renderCell: (params: GridCellParams) => {
        // Fetch the current row of the DataGrid
        const fetchCurrentRow = () => {
          return params.row
        };

        // onUpdate Event
        const onUpdateClick = (event: any) => {
          // Stop the event
          event.stopPropagation();

          const row: Array<any> = fetchCurrentRow();
          // Set the context
          setFormContext('Edit');
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
            <Tooltip style={{ marginLeft: 15 }} title="Edit User" arrow>
              <EditIcon onClick={onUpdateClick} />
            </Tooltip>
            <Tooltip style={{ marginLeft: 15 }} title="Delete User" arrow>
              <DelIcon onClick={onDeleteClick} />
            </Tooltip>
          </span>
        );
      },
    },
  ];
  let selectedUserId: string = '';
  const dispatch = useDispatch();
  const [formContext, setFormContext] = useContext(AppFormContext) as any;

  // Form support
  const formik = useFormik({
    // Initial form values
    initialValues: {
      personId: '',
      firstName: '',
      lastName: '',
      shortName: '',
      password: '',
      companyName: '',
      phoneNumber: '',
      internetAddress: '',
      mailAddress: '',
    },
    // Clear errors if user makes changes
    validate: () => {
      dispatch(clearPeopleError());
    },
    validationSchema: FormSchema,

    onSubmit: (values) => {
      let currentUser: string = '';

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

      let peopleData: PeopleDB = {
        Form: 'Person',
        Type: 'Person',
        FirstName: values.firstName,
        LastName: values.lastName,
        ShortName: values.shortName,
        password: values.password,
        CompanyName: values.companyName,
        PhoneNumber: values.phoneNumber,
        InternetAddress: values.internetAddress,
        MailAddress: values.mailAddress,
        Owner: currentUser,
      };
      if (formContext === 'Add') {
        dispatch(addPeople(peopleData) as any);
      } else {
        dispatch(updatePeople(values.personId, peopleData) as any);
      }
    },
  });

  /**
   * createAction is called when the Add User button is clicked.
   */
  const createAction = () => {
    // Set the context and open the drawer
    setFormContext('Add');
    // Reset the form
    formik.resetForm();
    // Open the Add form
    dispatch(toggleApplicationDrawer());
  };

  /**
   * updateAction is called when the Update User icon is clicked.
   */
  const updateAction = async (currentRow: Array<any>) => {
    const updateValues: any = {
      personId: '',
      firstName: '',
      lastName: '',
      shortName: '',
      password: '',
      phone: '',
      companyName: '',
      internetAddress: '',
      mailAddress: '',
    };

    const personId: string = currentRow[0];

    // Fetch the current values
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/person/${personId}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )
      const data = await response.json()

      if (response.status !== 200) {
        throw new Error(JSON.stringify(data))
      }

      updateValues.personId = personId;
      updateValues.firstName = data.FirstName;
      updateValues.lastName = data.LastName;
      updateValues.shortName = data.ShortName;
      updateValues.password = data.HTTPPassword;
      updateValues.companyName = data.CompanyName;
      updateValues.phoneNumber = data.HomePhone;
      updateValues.internetAddress = data.InternetAddress;
      updateValues.mailAddress = data.MailAddress;
      formik.setValues(updateValues);

      // open drawer
      dispatch(toggleApplicationDrawer());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      // Use the Keep response error if it's available
      if (err.response && err.response.statusText) {
        console.log(`Error in reading user: ${error.statusText}`);
      }
      // Otherwise use the generic error
      else {
        console.log(`Error in reading user: ${error.message}`);
      }
    }
  };

  /**
   * handleClickView is called to view the user details when clicked on the datagrid row
   * Opens a drawer with user data which is uneditable
   *
   */
  const handleClickView = async (rowData: any) => {
    setFormContext('View');
    const updateValues: any = {
      personId: '',
      firstName: '',
      lastName: '',
      shortName: '',
      password: '',
      phone: '',
      companyName: '',
      internetAddress: '',
      mailAddress: '',
    };

    const personId: string = rowData.id;

    // Fetch the current values
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/person/${personId}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )
      const data = await response.json()

      if (response.status !== 200) {
        throw new Error(JSON.stringify(data))
      }

      updateValues.personId = personId;
      updateValues.firstName = data.FirstName;
      updateValues.lastName = data.LastName;
      updateValues.shortName = data.ShortName;
      updateValues.password = data.HTTPPassword;
      updateValues.companyName = data.CompanyName;
      updateValues.phoneNumber = data.HomePhone;
      updateValues.internetAddress = data.InternetAddress;
      updateValues.mailAddress = data.MailAddress;
      formik.setValues(updateValues);
      // open drawer
      dispatch(toggleApplicationDrawer());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      // Use the Keep response error if it's available
      if (err) {
        console.log(`Error in viewing user: ${error.statusText}`);
      }
      // Otherwise use the generic error
      else {
        console.log(`Error in viewing user: ${error.message}`);
      }
    }
  };

  /**
   * deleteAction is called when the Delete User icon is clicked.
   */

  const deleteAction = (currentRow: Array<any>) => {
    // Save selection
    selectedUserId = currentRow[0];

    // Open the delete confirmation dialog
    dispatch(toggleDeleteDialog());
  };

  /**
   * deleteConfirmed is called when user has confirmed that they want to
   * delete the user.
   */
  const deleteConfirmed = () => {
    dispatch(deletePeople(selectedUserId) as any);
  };

  // Use People state as input to the DataGrid
  const peopleRows = useSelector((state: AppState) => state.peoples.peoples);
  useEffect(() => {
    dispatch(fetchPeople() as any);
  }, [dispatch]);

  const deleteUserTitle: string = 'Delete User';
  const deleteUserMessage: string =
    'Are you sure you want to delete this User?';

  return (
    <FormContainer>
      <ActionHeader>
        <PageTitle>
          <TopBanner>
            <PeopleIcon />
            <span style={{ marginLeft: 10 }}>People Management</span>
          </TopBanner>
        </PageTitle>
        <Button
          color="primary"
          className="button-create"
          onClick={createAction}
        >
          <AddIcon style={{ margin: '0 5px' }} />
          Add Person
        </Button>
        <Tooltip placement="top" title="Click on Row for more details!">
          <div
            style={{
              height: 500,
              width: '100%',
              marginTop: 60,
              cursor: 'pointer',
            }}
          >
            <DataGrid
              rowHeight={42}
              rows={peopleRows}
              columns={columns}
              pageSizeOptions={[9]}
              onRowClick={(viewParam) => handleClickView(viewParam.row)}
            />
          </div>
        </Tooltip>
        <DeleteApplicationDialog
          dialogTitle={deleteUserTitle}
          deleteMessage={deleteUserMessage}
          handleDelete={deleteConfirmed}
        />
        <FormDrawer formName="PeopleForm" formik={formik} />
      </ActionHeader>
    </FormContainer>
  );
};
export default PeopleCRUD;
