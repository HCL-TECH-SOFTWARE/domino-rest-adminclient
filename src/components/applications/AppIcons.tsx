/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Typography from '@material-ui/core/Typography';
import { FormikProps } from 'formik';
import appIcons from '../../styles/app-icons';
import { AutoContainer } from '../../styles/CommonStyles';
import { InputAdornment } from "@mui/material";

interface DropdownIconsProps {
  formik: FormikProps<any>;
}

const AppIcons: React.FC<DropdownIconsProps> = ({ formik }) => {
  return (
    <AutoContainer>
      <Autocomplete
        size="small"
        style={{ width: 200 }}
        id="databases-icon"
        value={formik.values.appIcon}
        options={Object.keys(appIcons)}
        getOptionLabel={(option) => option}
        defaultValue={formik.values.appIcons}
        onChange={(event, value) => {
          formik.setFieldValue('appIcon', value);
        }}
        renderOption={(option) => {
          return (
            <>
              <img
                style={{ height: 30, marginRight: 10 }}
                src={`data:image/svg+xml;base64, ${appIcons[option]}`}
                alt="database-icon"
              />
              <Typography color="textPrimary" noWrap>
                {option}
              </Typography>
            </>
          );
        }}
        renderInput={(params) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TextField color="primary" {...params} label="App Icon" variant='standard' fullWidth 
              InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <>
                    {
                      formik.values.appIcon == null ? '' :
                      <img
                        style={{ height: 30, marginRight: 10 }}
                        src={`data:image/svg+xml;base64, ${appIcons[formik.values.appIcon]}`}
                        alt="database-icon"
                      />
                    }
                  </>
                </InputAdornment>
              ),
            }}>
            </TextField>
          </div>
        )}
      />
    </AutoContainer>
  );
};

export default AppIcons;
