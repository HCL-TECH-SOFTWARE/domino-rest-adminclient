/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddIcon from '@material-ui/icons/Add';
import { Box, Button, ButtonBase, Table, TableContainer, Typography } from '@material-ui/core';
import styled from 'styled-components';
import {
  deleteApplication,
  addApplication,
  updateApp,
  clearAppError,
} from '../../../store/applications/action';
import { AppState } from '../../../store';
import { toggleAlert } from '../../../store/alerts/action';
import DeleteApplicationDialog from '../DeleteApplicationDialog';
import FormDrawer from '../FormDrawer';
import { toggleDeleteDialog } from '../../../store/dialog/action';
import { AppFormContext } from '../ApplicationContext';
import { toggleApplicationDrawer } from '../../../store/drawer/action';
import AppStack from '../AppStack';
import AppSearch from '../AppSearch';
import { TopContainer } from '../../../styles/CommonStyles';
import CloseIcon from '@material-ui/icons/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { RxDividerVertical } from "react-icons/rx"
import ConsentsTable from './ConsentsTable';

const ConsentsContainer = styled.div`
  display: flex;
  gap: 16px;
  flex-direction: column;
  z-index: 1;
  width: 90vw;
  padding: 30px 35px;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;

    .title {
        font-size: 18px;
        font-weight: 700;
        line-height: normal;
    }
`

const OptionsBar = styled.div`
    display: flex;
    padding: 25px 16px 0 16px;
    width: 100%;
    align-items: center;
    gap: 28px;

    .option {
        display: flex;
        gap: 5px;
        align-items: center;
    }

    .text {
        font-size: 16px;
        font-weight: 400;
        color: #1D2123;
    }
`

const AppStackContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc( 100vh - 260px);
  @media only screen and (max-width: 768px) {
    height: calc( 100vh - 280px);
  }
`;

const ApplicationFormSchema = Yup.object().shape({
  appName: Yup.string().trim().required('Application Name is Required.'),
  appCallbackUrlsStr: Yup.string().required('At least one URL is required.'),
  appStartPage: Yup.string().required('Startup page is required.'),
  appScope: Yup.string().required('Scope is required.'),
});

interface ConsentsProps {
    handleClose: () => void;
  }

const Consents: React.FC<ConsentsProps> = ({ handleClose }) => {
  const { apps } = useSelector((selector: AppState) => selector.apps);
  const { permissions } = useSelector(
    (state: AppState) => state.databases
  );
  const permissionCreate = permissions.createDbMapping;
  const [searchKey, setSearchKey] = useState('');
  const [filtered, setFiltered] = useState([...apps]);
  const [selected, setSelected] = useState('');
  const dispatch = useDispatch();
  const [formContext, setFormContext] = useContext(AppFormContext) as any;
  const icon = useState('beach')[0];
  const deleteAppTitle: string = 'Delete Application';
  const deleteAppMessage: string =
    'Are you sure you want to delete this Application?';

    const ref = useRef<HTMLDialogElement>(null)

  return (
    <ConsentsContainer>
      <Header>
        <Typography className='title'>OAuth Consents</Typography>
        <ButtonBase onClick={handleClose}><CloseIcon /></ButtonBase>
      </Header>
      <OptionsBar>
        <Box className='option'>
          <ButtonBase><ExpandMoreIcon /></ButtonBase>
          Expand all
        </Box>
        <RxDividerVertical color='#A0A0A0' size='1.5em' />
        <Box className='option'>
          <ButtonBase><ExpandLessIcon /></ButtonBase>
          Collapse all
        </Box>
      </OptionsBar>
      <ConsentsTable />
    </ConsentsContainer>
  );
};

export default Consents;
