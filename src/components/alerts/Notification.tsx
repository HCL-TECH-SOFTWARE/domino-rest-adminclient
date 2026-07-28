/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useSelector, useDispatch } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import Slide, { SlideProps } from '@mui/material/Slide';
import { AppState } from '../../store';
import { closeSnackbar } from '../../store/alerts/action';

function TransitionDown(props: SlideProps) {
  const { children, ...rest } = props;
  // Slide needs a single element child. Fall back to an empty one when the
  // Snackbar supplies none, which is what the former `children` prop default did.
  return (
    <Slide {...rest} direction="down">
      {children ?? <div />}
    </Slide>
  );
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
      slots={{
        transition: TransitionDown
      }}
      message={message}
    />
  );
};

export default Notification;
