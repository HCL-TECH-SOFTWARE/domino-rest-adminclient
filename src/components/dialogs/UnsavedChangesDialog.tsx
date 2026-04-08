/* ========================================================================== *
 * Copyright (C) 2024 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface UnsavedChangesDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Dialog shown when a user attempts to navigate away from a page
 * with unsaved changes. Offers three options:
 *  - Yes: save changes, then navigate
 *  - No: discard changes and navigate
 *  - Cancel: stay on the current page
 */
const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onSave,
  onDiscard,
  onCancel,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Unsaved Changes</DialogTitle>
      <DialogContent>
        <Typography>
          Changes have been made. Would you like to save these changes?
          Answering No will lose these changes.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="primary">
          Cancel
        </Button>
        <Button onClick={onDiscard} color="error">
          No
        </Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsavedChangesDialog;
