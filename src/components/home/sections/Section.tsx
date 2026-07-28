/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useEffect } from 'react';
import { styled } from '@linaria/react';
import { useDispatch, useSelector } from 'react-redux';
import Tip from './Tip';
import database from './appdev.jpg';
import databaseDev from './databasedev.jpg';
import apps from './apps.jpg';
import people from './database.jpg';
import consents from './consents.jpg';
import keepBlockDiagram from './keepblockdiagram.svg';
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
    margin-bottom: 100px;
  }
`;

const TipContainer = styled.div`
  padding: 15px 0;

  .diagram {
    display: flex;
    width: 100%;
    flex: 1;
    justify-content: center;
  }
`;

const FeatureContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 50px;

  @media only screen and (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
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
        <section className="diagram">
          <object type="image/svg+xml" data={keepBlockDiagram} width="50%">
            Open the <a href={keepBlockDiagram}>overview</a>
          </object>
        </section>
        <FeatureContainer>
          {navitems.databases &&
            databases.map((route) => {
              const { label, uri } = route;
              const isSchemasPage = label === 'Schemas';
              const heading = isSchemasPage ? 'Database Management - REST API' : 'Database Management - Activation';
              const description = isSchemasPage ? 'CREATE/UPDATE SCHEMA' : 'CREATE/MANAGE SCOPES';
              const img = isSchemasPage ? databaseDev : database;
              return <Tip key={label} uri={uri} backgroundImage={img} heading={heading} description={description} />;
            })}
          {navitems.apps &&
            app.map((route) => {
              return (
                route.label === 'Applications' && (
                  <Tip
                    key={route.label}
                    uri={route.uri}
                    backgroundImage={apps}
                    heading="Application Management - OAUTH"
                    description="ADMIN"
                  />
                )
              );
            })}
          {navitems.apps &&
            app.map((route) => {
              return (
                route.label === 'Consents' && (
                  <Tip
                    key={route.label}
                    uri={route.uri}
                    backgroundImage={consents}
                    heading="Consents Management - OAUTH"
                    description="REVIEW/REVOKE CONSENTS"
                  />
                )
              );
            })}
          {navitems.users &&
            users.map((route) => {
              return (
                <Tip
                  key={route.label}
                  uri={route.uri}
                  backgroundImage={people}
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
