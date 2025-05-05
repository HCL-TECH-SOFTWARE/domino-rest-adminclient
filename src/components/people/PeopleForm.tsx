/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import TextField from '@mui/material/TextField';
import { FormikProps } from 'formik';
import PeopleIcon from '@mui/icons-material/Person';
import { useSelector, useDispatch } from 'react-redux';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Typography, InputAdornment, IconButton } from '@mui/material';
import Button from '@mui/material/Button';
import { Alert, AlertTitle } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import { AppState } from '../../store';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { AppFormContext } from '../applications/ApplicationContext';
import {
  ActionButtonBar,
  FormContentContainer,
  InputContainer,
  MainPanel,
  PanelContent,
} from '../../styles/CommonStyles';

/**
 * PeopleForm.tsx allows admin to add new user or update the details.
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

interface PeopleFormProps {
  formik: FormikProps<any>;
}
const PeopleForm: React.FC<PeopleFormProps> = ({ formik }) => {
  const dispatch = useDispatch();
  const [values, setValues] = React.useState({
    password: '',
    showPassword: false,
  });
  const handleClickShowPassword = () => {
    setValues({ ...values, showPassword: !values.showPassword });
  };

  const handleMouseDownPassword = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };

  const [formContext] = useContext(AppFormContext) as any;
  const { peopleError } = useSelector((state: AppState) => state.peoples);
  const { peopleErrorMessage } = useSelector(
    (state: AppState) => state.peoples
  );
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
              <PeopleIcon />

              {formContext === 'Add'
                ? ' Add New Person'
                : formContext === 'Edit'
                ? ' Update New Person'
                : ' View Person Details'}
            </Typography>

            <InputContainer style={{ marginTop: 10 }}>
              <TextField
                fullWidth
                inputProps={{ readOnly: true }}
                onChange={formik.handleChange}
                value={formik.values.firstName}
                name="firstName"
                color="primary"
                label="First Name"
                variant='standard'
              />
              {formik.errors.firstName && formik.touched.firstName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.firstName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                inputProps={{ readOnly: true }}
                name="lastName"
                label="Last Name"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.lastName}
                variant='standard'
              />
              {formik.errors.lastName && formik.touched.lastName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.lastName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                inputProps={{ readOnly: true }}
                name="shortName"
                label="Short Name"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.shortName}
                variant='standard'
              />
              {formik.errors.shortName && formik.touched.shortName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.shortName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="password"
                label="Password"
                color="primary"
                type={values.showPassword ? 'text' : 'password'}
                variant='standard'
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                      >
                        {values.showPassword ? (
                          <Visibility />
                        ) : (
                          <VisibilityOff />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onChange={formik.handleChange}
                value={formik.values.password}
              />
              {formik.errors.password && formik.touched.password ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.password}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                inputProps={{ readOnly: true }}
                name="companyName"
                label="Company Name"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.companyName}
                variant='standard'
              />
              {formik.errors.companyName && formik.touched.companyName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.companyName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                inputProps={{ readOnly: true }}
                name="phoneNumber"
                label="Phone Number"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.phoneNumber}
                variant='standard'
              />
              {formik.errors.phoneNumber && formik.touched.phoneNumber ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.phoneNumber}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                inputProps={{ readOnly: true }}
                name="internetAddress"
                label="Internet Address"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.internet}
                variant='standard'
              />
              {formik.errors.internetAddress &&
              formik.touched.internetAddress ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.internetAddress}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                inputProps={{ readOnly: true }}
                name="mailAddress"
                label="Mail Address"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.mailAddress}
                variant='standard'
              />
              {formik.errors.mailAddress && formik.touched.mailAddress ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.mailAddress}`}
                </Typography>
              ) : null}
            </InputContainer>
          </PanelContent>
        ) : (
          <PanelContent onSubmit={formik.handleSubmit}>
            {peopleError && peopleErrorMessage && (
              <Alert style={{ margin: '5px 0' }} severity="error">
                <AlertTitle>Error: Unable to save People</AlertTitle>
                <Typography
                  style={{ fontSize: 18 }}
                  component="p"
                  variant="caption"
                >
                  {peopleErrorMessage}
                </Typography>
              </Alert>
            )}
            <Typography
              className="header-title"
              style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
            >
              <PeopleIcon />

              {formContext === 'Add'
                ? ' Add New Person'
                : formContext === 'Edit'
                ? ' Update New Person'
                : ' View Person Details'}
            </Typography>
            <InputContainer style={{ marginTop: 10 }}>
              <TextField
                fullWidth
                onChange={formik.handleChange}
                value={formik.values.firstName}
                name="firstName"
                color="primary"
                label="First Name"
                variant='standard'
              />
              {formik.errors.firstName && formik.touched.firstName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.firstName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="lastName"
                label="Last Name"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.lastName}
                variant='standard'
              />
              {formik.errors.lastName && formik.touched.lastName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.lastName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="shortName"
                label="Short Name"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.shortName}
                variant='standard'
              />
              {formik.errors.shortName && formik.touched.shortName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.shortName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="password"
                label="Password"
                color="primary"
                type={values.showPassword ? 'text' : 'password'}
                variant='standard'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                      >
                        {values.showPassword ? (
                          <Visibility />
                        ) : (
                          <VisibilityOff />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onChange={formik.handleChange}
                value={formik.values.password}
              />
              {formik.errors.password && formik.touched.password ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.password}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="companyName"
                label="Company Name"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.companyName}
                variant='standard'
              />
              {formik.errors.companyName && formik.touched.companyName ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.companyName}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="phoneNumber"
                label="Phone Number"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.phoneNumber}
                variant='standard'
              />
              {formik.errors.phoneNumber && formik.touched.phoneNumber ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.phoneNumber}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="internetAddress"
                label="Internet Address"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.internet}
                variant='standard'
              />
              {formik.errors.internetAddress &&
              formik.touched.internetAddress ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.internetAddress}`}
                </Typography>
              ) : null}
            </InputContainer>
            <InputContainer>
              <TextField
                fullWidth
                name="mailAddress"
                label="Mail Address"
                color="primary"
                onChange={formik.handleChange}
                value={formik.values.mailAddress}
                variant='standard'
              />
              {formik.errors.mailAddress && formik.touched.mailAddress ? (
                <Typography className="validation-error" color="textPrimary">
                  {`${formik.errors.mailAddress}`}
                </Typography>
              ) : null}
            </InputContainer>
          </PanelContent>
        )}
        <ActionButtonBar>
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

export default PeopleForm;
