/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useSelector, useDispatch } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import Slide from '@mui/material/Slide';
import { AppState } from '../../store';
import { closeSnackbar } from '../../store/alerts/action';

function TransitionDown(props: {}) {
  return <Slide children={<div></div>} {...props} direction="down" />;
}

const Notification = () => {
  const { message, visible } = useSelector((state: AppState) => state.alert);
  const dispatch = useDispatch();

  const handleClose = () => {
    dispatch(closeSnackbar());
  };

  return (
    <Snackbar
      open={visible}
      onClose={handleClose}
      autoHideDuration={3000}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      TransitionComponent={TransitionDown}
      message={message}
    />
  );
};

export default Notification;
