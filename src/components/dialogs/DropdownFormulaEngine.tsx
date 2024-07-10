/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/* eslint-disable no-use-before-define */
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/lab/Autocomplete';
import styled from 'styled-components';

const AutoContainer = styled.div`
  margin: 20px 0;
  width: 140px;

  fieldset {
    border: 0 !important;
  }
`;

export default function DropdownFormulaEngine() {
  return (
    <AutoContainer>
      <Autocomplete
        size="small"
        id="formula-engine"
        options={engines}
        value={engines[0]}
        getOptionLabel={(option) => option.title}
        closeIcon={false}
        renderInput={(params) => (
          <TextField {...params} variant="outlined" fullWidth />
        )}
      />
    </AutoContainer>
  );
}

// Formula Engines
const engines = [{ title: 'domino' }];
