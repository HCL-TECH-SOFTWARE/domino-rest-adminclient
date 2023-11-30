/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store';
import { closeSnackbar } from '../../store/alerts/action';

const Alert = (props: any) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
};

const SnackbarToaster = () => {
  const dispatch = useDispatch();
  const { snackbarStatus, snackbarMessagE } = useSelector(
    (state: AppState) => state.alert
  );

  const handleClose = () => {
    dispatch(closeSnackbar());
  };

  return (
    <div>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={snackbarStatus}
        onClose={handleClose}
        message={snackbarMessagE}
      >
        <Alert onClose={handleClose} severity="error">
          {snackbarMessagE}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SnackbarToaster;
