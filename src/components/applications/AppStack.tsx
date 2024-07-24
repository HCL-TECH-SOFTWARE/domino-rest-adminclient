/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { FormikProps } from 'formik';
import styled from 'styled-components';
import { Typography } from '@mui/material';
import { StackContainer, Flex } from '../../styles/CommonStyles';
import AppCard from './kanban/AppCard';

const ZeroFound = styled.div`
  padding: 20px 0;
  display: flex;
  align-items: center;
  height: 100px;
  justify-content: center;

  .blank-column {
    font-weight: 300;
  }
`;

interface AppStackProps {
  list: Array<any>;
  deleteApplication: (appId: string) => void;
  formik: FormikProps<any>;
  heading: string;
}

const AppStack: React.FC<AppStackProps> = ({
  list,
  deleteApplication,
  formik,
  heading,
}) => {
  return (
    <StackContainer>
      <Typography className="heading" color="textPrimary">
        {`${heading}`}
      </Typography>
      <Flex>
        {list.length > 0 ? (
          <>
            {list.map((item) => (
              <AppCard
                key={item.appId}
                formik={formik}
                item={item}
                deleteApplication={deleteApplication}
              />
            ))}
          </>
        ) : (
          <ZeroFound>
            <Typography className="blank-column">0 Applications</Typography>
          </ZeroFound>
        )}
      </Flex>
    </StackContainer>
  );
};

export default AppStack;
