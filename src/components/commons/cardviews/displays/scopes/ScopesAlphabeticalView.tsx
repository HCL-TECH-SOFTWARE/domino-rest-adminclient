/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import DBIcon from '@material-ui/icons/Storage';
import { useHistory } from 'react-router-dom';
import ZeroResultsWrapper from '../../../ZeroResultsWrapper';
import { checkIcon } from '../../../../../styles/scripts';
import appIcons from '../../../../../styles/app-icons';
import { Scope } from '../../../../../store/databases/types';

const AlphabeticalViewContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 20px 0;
`;

const BlockContainer = styled.div`
  width: 25%;
  margin: 20px 0;

  .letter {
    font-size: 24px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .api-name {
    font-size: 16px;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 25vw;
  }
`;

const Db = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-bottom: 10px;

  &:hover {
    .api-name {
      text-decoration: underline;
    }
  }
`;

interface ScopesAlphabeticalSchemaViewProps {
  databases: Array<Scope>;
  openScope: (scope: any) => void;
}

const mapAlphabets = (databases: Array<any>, isSchema: boolean) => {
  const newCities = {} as any;

  for (let i = 0; i < databases.length; i++) {
    const c = isSchema
      ? databases[i].schemaName[0].toUpperCase()
      : databases[i].apiName[0].toUpperCase();
    if (newCities[c] && newCities[c].length >= 0)
      newCities[c].push(databases[i]);
    else {
      newCities[c] = [];
      newCities[c].push(databases[i]);
    }
  }

  // Sort the data alphabetically
  const sorted = Object.keys(newCities)
    .sort()
    .reduce((obj: any, key: any) => {
      obj[key] = newCities[key];
      return obj;
    }, {});

  return sorted;
};

const ScopesAlphabeticalView: React.FC<ScopesAlphabeticalSchemaViewProps> = ({
  databases,
  openScope
}) => {
  const history = useHistory();
  const { pathname } = history.location;
  const isSchema = pathname === '/schema';
  const alphabets = mapAlphabets(databases, isSchema);

  useEffect(() => {
    // Append to stack
  }, [isSchema]);

  const handleKeyPress = (e: any, data: any) => {
    if (e.key === "Enter") {
      openScope(data);
    }
  }

  return (
    <>
      <Typography style={{ fontSize: 18 }} color="textPrimary">
        HCL Domino REST API Databases Scope A - Z
      </Typography>
      <AlphabeticalViewContainer>
        {
          databases.length > 0 ? (
            Object.keys(alphabets).map((letter) => (
              <BlockContainer key={letter}>
                <Typography className="letter" color="textPrimary">
                  {letter}
                </Typography>
                {alphabets[letter].map((data: any, index: number) => (
                  // Hide keppconfig database to
                  <Db onClick={() => openScope(data)} key={index} tabIndex={1} onKeyDown={(e) => {handleKeyPress(e, data)}}>
                    {checkIcon(data.iconName) ? (
                      <img
                        style={{ height: 30, marginRight: 10 }}
                        src={`data:image/svg+xml;base64, ${
                          appIcons[data.iconName]
                        }`}
                        alt="database-icon"
                      />
                    ) : (
                      <DBIcon style={{}} />
                    )}
                    <Tooltip title={data.apiName}>
                      <Typography
                        key={data.apiName}
                        className="api-name"
                        color="textPrimary"
                      >
                        {data.apiName}
                      </Typography>
                    </Tooltip>
                  </Db>
                ))}
              </BlockContainer>
            ))
          ) : (
            <ZeroResultsWrapper
              mainLabel=" Sorry, No result found"
              secondaryLabel={`What you search was unfortunately not found or doesn't exist.`}
            />
          )
        }
      </AlphabeticalViewContainer>
    </>
  );
};

export default ScopesAlphabeticalView;
