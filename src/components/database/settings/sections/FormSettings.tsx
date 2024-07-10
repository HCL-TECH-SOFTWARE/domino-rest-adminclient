/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import styled from 'styled-components';
import Typography from '@mui/material/Typography';
import { SettingContext } from '../SettingContext';

const FormSettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 300px;

  .list-configured-forms {
    font-size: 20px;
  }
`;

const ConfiguredForms = styled.div`
  margin-top: 20px;
`;

interface Props {}

const FormSettings: React.FC<Props> = () => {
  const [context] = useContext(SettingContext) as any;

  const { configuredForms } = context;

  return (
    <FormSettingsContainer>
      <Typography className="list-configured-forms" color="textPrimary">
        List of Configured Forms
      </Typography>
      <ConfiguredForms>
        {configuredForms &&
          (configuredForms.length > 0 ? (
            <ul>
              {configuredForms.map((form: string) => (
                <li key={form}>{form}</li>
              ))}
            </ul>
          ) : (
            <Typography color="textPrimary">
              No Available Configured Forms
            </Typography>
          ))}
      </ConfiguredForms>
    </FormSettingsContainer>
  );
};

export default FormSettings;
