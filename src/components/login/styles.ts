/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import { IMG_DIR } from '../../config.dev';

export const CASTLE_BACKGROUND = `url(${IMG_DIR}/castlebg.jpg)`;

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      height: '100vh',
    },
    image: {
      width: '40%',
      backgroundImage: CASTLE_BACKGROUND,
      backgroundRepeat: 'no-repeat',
      backgroundColor:
        theme.palette.type === 'dark'
          ? theme.palette.grey[900]
          : theme.palette.grey[50],
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      flexBasis: '44%',
      maxWidth: '40%',
    },
    paper: {
      margin: theme.spacing(8, 4),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    avatar: {
      margin: theme.spacing(1),
      backgroundColor: theme.palette.secondary.main,
    },
    form: {
      width: '100%', // Fix IE 11 issue.
      marginTop: theme.spacing(1),
    },
    submit: {
      margin: theme.spacing(3, 0, 2),
    },
  })
);
