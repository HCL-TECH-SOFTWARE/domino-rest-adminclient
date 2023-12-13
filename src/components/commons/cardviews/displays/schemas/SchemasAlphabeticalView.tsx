/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import DBIcon from '@material-ui/icons/Storage';
import { useHistory } from 'react-router-dom';
import { checkIcon } from '../../../../../styles/scripts';
import appIcons from '../../../../../styles/app-icons';
import { Scope } from '../../../../../store/databases/types';
import { Box } from '@material-ui/core';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../../../../store';
import { DeleteIcon } from '../../../../../styles/CommonStyles';
import DeleteDialog from '../../../../dialogs/DeleteDialog';
import { toggleDeleteDialog } from '../../../../../store/dialog/action';
import { toggleAlert } from '../../../../../store/alerts/action';

const AlphabeticalViewContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  padding: 20px 0;

  .letters {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .all-rows {
    height: 50vh;
    overflow-y: scroll;
    scroll-behavior: smooth;
  }

  .each-letter {
    padding: 0 10px;
    font-size: 20px;
    color: #000000;
    cursor: pointer;
  }

  .focused {
    font-weight: bold;
  }

  .no-schema {
    color: #A2A6A8;
    cursor: default;
  }

  .rows {
    display: block;
  }

  @media only screen and (max-height: 943px) {
    .all-rows {
      height: 40vh;
      overflow-y: scroll;
    }
  }
`;

const BlockContainer = styled.div`
  width: 100%;
  padding: 20px 0;
  display: flex;
  flex-direction: row;
  x-overflow: wrap;
  align-items: center;

  .letter {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    text-transform: uppercase;
    width: 60px;
    height: 60px;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIiBmaWxsPSJub25lIj4KICAgIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjMwIiBmaWxsPSIjRTZFQkY1Ii8+Cjwvc3ZnPg==');
  }

  .schemas {
    width: calc(100% - 60px);
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px 0;
  }

  .text-container {
    display: flex;
    flex-direction: column;
    width: calc(100% - 9px - 44px - 10px - 15px - 10%);

    &:hover {
      text-decoration: underline;
    }
  }

  .api-name {
    font-size: 16px;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 25vw;
    font-weight: bold;
    line-height: 1.2em;
  }

  .api-nsf {
    font-weight: 400;
    font-style: italic;
    color: #5B666D;
  }

  .api-status {
    width: 9px;
    height: 44px;
    flex-shrink: 0;
    background: #82DC73;
  }

  .unused {
    background: #F75764;
  }

  .delete {
    display: flex;
    width: 10%;
    justify-content: flex-end;
  }

  .delete-icon {
    right: 0;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
  }
`;

const Db = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  margin: 0 50px;
  width: 318px;
  height: 45px;
`;

interface AlphabeticalSchemaViewProps {
  databases: Array<Scope>;
}

const mapAlphabets = (databases: Array<any>, isSchema: boolean) => {
  const newCities = {} as any;

  for (const element of databases) {
    const c = isSchema
      ? element.schemaName[0].toUpperCase()
      : element.apiName[0].toUpperCase();
    if (newCities[c] && newCities[c].length >= 0)
      newCities[c].push(element);
    else {
      newCities[c] = [];
      newCities[c].push(element);
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

const getAllLetters = () => {
  const allLetters = [];
  
  for (let i = 65; i <= 90; i++) {
    allLetters.push(String.fromCharCode(i));
  }

  return allLetters
}

const SchemasAlphabeticalView: React.FC<AlphabeticalSchemaViewProps> = ({
  databases
}) => {
  const history = useHistory();
  const { pathname } = history.location;
  const isSchema = pathname === '/schema';
  const alphabets = mapAlphabets(databases, isSchema);
  const allLetters = getAllLetters();

  const { scopes, permissions } = useSelector((state: AppState) => state.databases);
  const { deleteDialog } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();
  const [schemasWithScopes, setSchemasWithScopes] = useState([]) as any;
  const [selectedNsf, setSelectedNsf] = useState('');
  const [selectedDB, setSelectedDB] = useState('');
  const [chosenLetter, setChosenLetter] = useState('');
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Append to stack
  }, [isSchema]);

  useEffect(() => {
    const schemasScopes = scopes.map((scope) => {
      return scope.nsfPath + ":" + scope.schemaName;
    });
    setSchemasWithScopes(schemasScopes);
  }, [scopes]);

  const openDatabase = (database: any) => {
    history.push(
      `/schema/${encodeURIComponent(database.nsfPath)}/${
        database.schemaName
      }`
    );
  };

  const handleKeyPress = (e: any, database: any) => {
    if (e.key === "Enter") {
      openDatabase(database)
    }
  };

  const handleClickLetter = (letter: string) => {
    if (Object.keys(alphabets).includes(letter)) {
      setChosenLetter(letter);
    }
  };

  const handleKeyPressLetter = (e: any, letter: string) => {
    if (e.key === "Enter") {
      handleClickLetter(letter);
    }
  };

  const handleClickDelete = (data: any) => {
    setChosenLetter('');
    if (permissions.deleteDbMapping) {
      setSelectedNsf(data.nsfPath);
      setSelectedDB(data.schemaName);
      dispatch(toggleDeleteDialog());
    } else {
      dispatch(toggleAlert(`You don't have permission to delete schema.`));
    }
  };

  const handleKeyPressDelete = (e: any, database: any) => {
    if (e.key === "Enter") {
      handleClickDelete(database);
    }
  };

  useEffect(() => {
    const rowElement = rowRef.current;
    rowElement?.scrollIntoView();
  })

  return (
    <>
      <Typography style={{ fontSize: 18 }} color="textPrimary">
        HCL Domino REST API Databases Schema A - Z
      </Typography>
      <AlphabeticalViewContainer>
        <Box className='letters'>
          {
            allLetters.map((letter: string) => (
              <Box 
                className={`each-letter ${Object.keys(alphabets).includes(letter) ? '' : 'no-schema'} ${letter === chosenLetter ? 'focused' : ''}`} 
                onClick={() => {handleClickLetter(letter)}}
                key={letter}
                tabIndex={Object.keys(alphabets).includes(letter) ? 1 : -1} // Can't focus via tab if letter is disabled
                onKeyDown={(e) => {handleKeyPressLetter(e, letter)}}
              >
                  {letter}
              </Box>
            ))
          }
        </Box>
        <hr color='#C8D2DD' style={{ height: 1, margin: '30px 0 0 0' }} />
        <Box className='all-rows'>
          {
            Object.keys(alphabets).map((letter) => (
              <Box key={letter}>
                <BlockContainer key={letter} ref={letter === chosenLetter ? rowRef : null}>
                  <Typography className="letter" color="textPrimary">
                    {letter}
                  </Typography>
                  <Box className='schemas'>
                    {alphabets[letter].map((data: any, index: number) => (
                      <Db key={data.schemaName + data.nsfPath}>
                        <Tooltip title={schemasWithScopes?.includes(data.nsfPath + ":" + data.schemaName) ? 'Used by Scopes' : 'Not used by Scopes'}>
                          <Box className={`api-status ${schemasWithScopes?.includes(data.nsfPath + ":" + data.schemaName) ? '' : 'unused'}`} />
                        </Tooltip>
                        {checkIcon(data.iconName) ? (
                          <img
                            style={{ height: 44, paddingRight: 15, paddingLeft: 10 }}
                            src={`data:image/svg+xml;base64, ${
                              appIcons[data.iconName]
                            }`}
                            alt="database-icon"
                          />
                        ) : (
                          <DBIcon />
                        )}
                        <Box onClick={() => openDatabase(data)} className='text-container' tabIndex={1} onKeyDown={(e) => {handleKeyPress(e, data)}}>
                          <Tooltip onClick={() => openDatabase(data)} title={`${data.schemaName}(${data.nsfPath})`}>
                            <Typography
                              key={data.apiName}
                              className="api-name"
                              color="textPrimary"
                            >
                              {data.schemaName}
                            </Typography>
                          </Tooltip>
                          {isSchema && <Typography className='api-name api-nsf' onClick={() => openDatabase(data)}>
                            {data.nsfPath}
                          </Typography>}
                        </Box>
                        {isSchema && <div className='delete'>
                          <Tooltip onClick={() => {handleClickDelete(data)}} title="Delete schema" arrow>
                            <DeleteIcon className="delete-icon" tabIndex={1} onKeyUp={(e) => {handleKeyPressDelete(e, data)}} />
                          </Tooltip>
                        </div>}
                      </Db>
                    ))}
                  </Box>
                </BlockContainer>
                <hr color='#C8D2DD' style={{ height: 1, margin: 0 }} />
              </Box>
            ))
          }
        </Box>
      </AlphabeticalViewContainer>
      <DeleteDialog
        selected={{
          isDeleteSchema: true,
          nsfPath: selectedNsf,
          schemaName: selectedDB,
        }}
        open={deleteDialog}
      />
    </>
  );
};

export default SchemasAlphabeticalView;
