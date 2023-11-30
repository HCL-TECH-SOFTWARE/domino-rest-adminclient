/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Drawer from '@material-ui/core/Drawer';
import { AppState } from '../../store';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import { DrawerFormContainer } from '../../styles/CommonStyles';
import ConsentsList from './ConsentsList';

export default function ConsentsListContainer() {
  const { consentsDrawer } = useSelector((state: AppState) => state.drawer);
  const dispatch = useDispatch();
  const descriptionElementRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (consentsDrawer) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [consentsDrawer]);

  const handleClickOpen = () => {
    dispatch(toggleConsentsDrawer());
  };
  
  return (
    <Drawer anchor="right" open={consentsDrawer} onClose={handleClickOpen}>
      <DrawerFormContainer>
        <ConsentsList />
      </DrawerFormContainer>
    </Drawer>
  );
}
