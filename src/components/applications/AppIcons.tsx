/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import TextField from '@mui/material/TextField';
import { Autocomplete, Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import { FormikProps, useFormikContext } from 'formik';
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
        disablePortal
        size='small'
        options={Object.keys(appIcons)}
        getOptionLabel={(option) => option}
        defaultValue={formik.values.appIcons}
        onChange={(event, value) => {
          formik.setFieldValue('appIcon', value);
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
              }}
            >
            </TextField>
          </div>
        )}
        renderOption={(option) => {
          const { key, ...optionProps } = option;
          return (
            <Box
              key={key}
              component="li"
              sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
              {...optionProps}
            >
              <img
                style={{ height: 30, marginRight: 10 }}
                src={`data:image/svg+xml;base64, ${appIcons[key]}`}
                alt="database-icon"
              />
              {key}
            </Box>
          );
        }}
      />
    </AutoContainer>
  );
};

export default AppIcons;
