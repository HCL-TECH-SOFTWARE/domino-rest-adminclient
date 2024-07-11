/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { getTheme } from '../../../store/styles/action';

const ListRoles = () => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  return (
    <List style={{ width: '100%' }}>
      {[
        'Cleo Beverly',
        'Kenneth Manalo',
        'Rashelyn Doromal',
        'Samantha Swift',
      ].map(role => (
        <div key={role}>
          <ListItem alignItems="flex-start">
            <ListItemAvatar>
              <Avatar alt="Remy Sharp" />
            </ListItemAvatar>
            <ListItemText
              primary={role}
              secondary={
                <>
                  <Typography
                    component="span"
                    variant="body2"
                    style={{ fontWeight: 300 }}
                    color="textPrimary"
                  >
                    Developer
                  </Typography>
                </>
              }
            />
          </ListItem>
          <Divider
            style={{ background: getTheme(themeMode).borderColor }}
            component="li"
          />
        </div>
      ))}
    </List>
  );
};

export default ListRoles;
