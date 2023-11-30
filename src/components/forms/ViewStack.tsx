/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { Flex, StackContainer } from '../../styles/CommonStyles';
import ViewCard from './ViewCard';

interface ViewStackProps {
  panelName: string;
  views: Array<any>;
  dbName: string;
}

/**
 * ViewStack displays an array of View cards
 *
 * @author Neil Schultz
 *
 */
const ViewStack: React.FC<ViewStackProps> = ({ panelName, views, dbName }) => {
  if (views != null) {
    return (
      <StackContainer>
        <Flex>
          {views.map((view: any) => (
            <ViewCard
              key={view.viewUnid}
              dbName={dbName}
              panelName={panelName}
              name={view.viewName}
              alias={view.viewAlias}
              unid={view.viewUnid}
              active={view.viewActive}
            />
          ))}
        </Flex>
      </StackContainer>
    );
  }

  return (
    <StackContainer>
      <Flex />
    </StackContainer>
  );
};

export default ViewStack;
