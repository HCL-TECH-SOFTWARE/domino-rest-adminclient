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
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { getTheme } from '../../../store/styles/action';

const ListRoles = () => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  return (
    <List className='full-width'>
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
                  <span className="small-text weight-300 color-text-primary">
                    Developer
                  </span>
                </>
              }
            />
          </ListItem>
          <Divider
            className='color-border'
            component="li"
          />
        </div>
      ))}
    </List>
  );
};

export default ListRoles;
