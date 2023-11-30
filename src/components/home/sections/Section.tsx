/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import Tip from './Tip';
import database from './appdev.jpg';
import databaseDev from './databasedev.jpg';
import apps from './apps.jpg';
import people from './database.jpg';
import { databases, apps as app, people as users } from '../../sidenav/Routes';
import { AppState } from '../../../store';
import { showPages } from '../../../store/account/action';

const SectionContainer = styled.div`
  padding: 0px 20px;
  .section-title {
    font-size: 24px;
    margin: 10px 0;
  }

  @media only screen and (max-width: 768px) {
    padding: 10px 10%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const TipContainer = styled.div`
  padding: 15px 0;
`;

const FeatureContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 50px;

  @media only screen and (max-width: 768px) {
    flex-direction: column;
  }
`;

const Section = () => {
  const { navitems } = useSelector((state: AppState) => state.account);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(showPages() as any);
  }, [dispatch]);
  return (
    <SectionContainer>
      <TipContainer>
        <FeatureContainer>
          {navitems.databases &&
            databases.map((route) => {
              const { label, uri } = route;
              const isSchemasPage = label === 'Schemas';
              const heading = isSchemasPage 
              ? 'Database Management - REST API'
              : 'Database Management - Activation';
              const description = isSchemasPage 
              ? 'CREATE/UPDATE SCHEMA'
              : 'CREATE/MANAGE SCOPES';
              const img = isSchemasPage
              ? databaseDev
              : database;
              return (
                <Tip
                  key={label}
                  uri={uri}
                  backgroungImage={img}
                  heading={heading}
                  description={description}
                />
              );
            })}
          {navitems.apps &&
            app.map((route) => {
              return (
                <Tip
                  key={route.label}
                  uri="/apps"
                  backgroungImage={apps}
                  heading="Application Management - OAUTH"
                  description="ADMIN"
                />
              );
            })}
          {navitems.users &&
            users.map((route) => {
              return (
                <Tip
                  key={route.label}
                  uri="/people"
                  backgroungImage={people}
                  heading="People Management"
                  description="Manage Notes users"
                />
              );
            })}
        </FeatureContainer>
      </TipContainer>
    </SectionContainer>
  );
};

export default Section;
