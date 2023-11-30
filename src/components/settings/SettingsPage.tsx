/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import styled from 'styled-components';
import Typography from '@material-ui/core/Typography';
import { useSelector } from 'react-redux';
import { Route, NavLink } from 'react-router-dom';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import AccountPage from './account/AccountPage';
import MailSettingsPage from './mail/MailSettingsPage';
import RolesPage from './roles/RolesPage';
import Logs from './Logs';

const SettingsPageContainer = styled.div`
  display: flex;
  overflow-y: auto;
`;

const SettingsList = styled.div`
  width: 300px;
  height: calc(100vh - 56px);
  display: flex;
  padding-top: 30px;
  justify-content: center;
`;

const Links = styled.div`
  display: flex;
  flex-direction: column;

  a {
    text-decoration: none;

    p:hover {
      font-weight: 600;
    }
  }

  .link {
    font-size: 18px;
    margin: 10px 0;
  }

  .active-setting {
    p {
      font-weight: 600;
    }
  }
`;

const SettingsSection = styled.div<{ theme: string }>`
  flex: 1;
  background: ${props => getTheme(props.theme).secondary};
  display: flex;
  flex-direction: column;
`;

const links = [
  { uri: 'account', label: 'Account' },
  { uri: 'roles', label: 'Roles' },
  { uri: 'mail', label: 'Mail' },
  { uri: 'applications', label: 'Applications' },
  { uri: 'logs', label: 'Logs' },
];

const SettingsPage = () => {
  const { themeMode } = useSelector((state: AppState) => state.styles);

  return (
    <SettingsPageContainer>
      <SettingsList>
        <Links>
          {links.map(link => (
            <NavLink
              activeClassName="active-setting"
              key={link.label}
              to={`/settings/${link.uri}`}
            >
              <Typography className="link" color="textPrimary">
                {link.label}
              </Typography>
            </NavLink>
          ))}
        </Links>
      </SettingsList>
      <SettingsSection theme={themeMode}>
        <Route path="/settings/account">
          <AccountPage />
        </Route>
        <Route path="/settings/roles">
          <RolesPage />
        </Route>
        <Route path="/settings/mail">
          <MailSettingsPage />
        </Route>
        <Route path="/settings/logs">
          <Logs />
        </Route>
      </SettingsSection>
    </SettingsPageContainer>
  );
};

export default SettingsPage;
