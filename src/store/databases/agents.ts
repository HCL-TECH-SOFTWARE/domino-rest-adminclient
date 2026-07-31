/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { Dispatch } from '@reduxjs/toolkit';
import { Database, SET_ACTIVEAGENTS, AgentObj } from './types';
import { AppDispatch } from '..';
import { toggleAlert } from '../alerts/action';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading } from '../dialog/action';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { encodeQueryValue } from '../../utils/common';
import { log, setDBError, clearDBError } from './shared';
import { addActiveAgent, deleteActiveAgent, setAgents as setAgentsAction, updateAgent } from './reducer';

/**
 * Retrieves agents for a particular database and
 * passes them to Redux.
 *
 * @param dbName the name of the database
 * @param nsfPath the name of the database
 */
export const fetchAgents = (dbName: string, nsfPath: string) => {
  return async (dispatch: Dispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/agents?nsfPath=${encodeQueryValue(nsfPath)}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch(
        setAgents(
          dbName,
          data.agents.map((agent: any) => {
            let aliasArray: Array<any> = [];
            if (agent['@alias'] != null && agent['@alias'].length > 0) {
              if (Array.isArray(agent['@alias'])) {
                aliasArray = agent['@alias'];
              } else {
                aliasArray.push(agent['@alias']);
              }
            }
            return {
              agentName: agent['@name'],
              agentAlias: aliasArray,
              agentUnid: agent['@unid']
            };
          })
        ) as any
      );
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      log.error('Error fetching agents', { error });
    }
  };
};
export const handleDatabaseAgents = (
  agentsArray: Array<any>,
  activeAgents: Array<any>,
  dbName: string,
  schemaData: Database,
  active: boolean,
  currentAgents: Array<any>,
) => {
  return async (dispatch: AppDispatch) => {
    // Build redux data
    const agentsData = agentsArray.map((agent: any) => {
      return buildReduxAgentData(agent, active);
    });

    // Update panels
    agentsData.forEach((agent: any) => {
      dispatch(updateActiveAgents(dbName, agent));
    });

    // Save agents
    //  Build the array of new agents
    const agentsList: Array<any> = [];
    if (agentsArray.length === 1) {
      activeAgents.forEach((agent: any) => {
        if (agent.agentName !== agentsData[0].agentName) {
          agentsList.push(saveAgentDetails(agent));
        }
      });
      if (active) {
        // add to active agents
        agentsList.push(saveAgentDetails(agentsArray[0]));
      }
    } else if (active) {
      const activeAgentNames = activeAgents.map((agent: any) => {
        return agent.agentName;
      });
      agentsArray.forEach((agent: any) => {
        // if agent was already active, don't add it again to the active views list
        if (!activeAgentNames.includes(agent.agentName)) {
          agentsList.push(saveAgentDetails(agent));
        }
      });
      activeAgents.forEach((agent: any) => {
        agentsList.push(saveAgentDetails(agent));
      });
    }

    // Send the new agents to the server
    dispatch(updateAgents(schemaData, agentsList, dbName, currentAgents));
  };
};
function buildReduxAgentData(currentAgent: any, agentActive: boolean) {
  return {
    agentName: currentAgent.agentName,
    agentAlias: currentAgent.agentAlias,
    agentUnid: currentAgent.agentUnid,
    agentActive: agentActive,
    agentUpdated: currentAgent.agentUpdated
  };
}
function updateActiveAgents(dbName: string, agentData: AgentObj) {
  return async (dispatch: Dispatch) => {
    // Update All Panel
    dispatch(updateAgent({
        db: dbName,
        agent: agentData
      }));

    // Update Active Panel
    if (agentData.agentActive) {
      dispatch(addActiveAgent({
          db: dbName,
          activeAgent: agentData
        }));
    } else {
      dispatch(deleteActiveAgent({
          db: dbName,
          activeAgent: agentData.agentUnid
        }));
    }
  };
}
function saveAgentDetails(currentAgent: any) {
  let aliasArray: Array<any> = [];
  if (currentAgent.agentAlias != null && currentAgent.agentAlias.length > 0) {
    if (Array.isArray(currentAgent.agentAlias)) {
      aliasArray = currentAgent.agentAlias;
    } else {
      aliasArray.push(currentAgent.agentAlias);
    }
  }

  return {
    name: currentAgent.agentName,
    alias: aliasArray,
    unid: currentAgent.agentUnid,
    columns: currentAgent.agentColumns,
    agentUpdated: currentAgent.agentUpdated
  };
}
/**
 * update agents to server
 */
export const updateAgents = (schemaData: Database, agentsData: any, dbName: string, currentAgents: Array<any>) => {
  return async (dispatch: AppDispatch) => {
    let filteredForms = schemaData.forms
      .filter((form) => form.formModes.length > 0)
      .map((form) => {
        return {
          formName: form.formName,
          formModes: form.formModes,
          alias: form.alias
        };
      });
    const newSchemaData: any = {
      ...schemaData,
      forms: filteredForms,
      agents: agentsData
    };
    try {
      dispatch(setApiLoading(true));
      try {
        const { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(newSchemaData.nsfPath)}&configName=${encodeQueryValue(newSchemaData.schemaName)}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSchemaData),
          }), { notifyOnError: false })

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        dispatch(setApiLoading(false));
        dispatch(toggleAlert(`Agents have been successfully saved.`));
      } catch (e: any) {
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)

        dispatch(setApiLoading(false));
        dispatch(setAgents(dbName, currentAgents))
        dispatch(toggleAlert(`Update agents failed! ${error.message}`));
      }
      dispatch(clearDBError());
    } catch (err: any) {
      dispatch(setApiLoading(false));
      dispatch(setAgents(dbName, currentAgents))
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
        dispatch(toggleAlert(`Update agents failed! ${err.response.statusText}`));
      } else {
        dispatch(setDBError(err.message));
        dispatch(toggleAlert(`Update agents failed! ${err.message}`));
      }
    }
  };
};
/**
 * isActiveAgent determines if a particular Agent has been
 * activated.
 *
 * @param unid the id of the view to check
 * @param activeList the list of activated Views
 *
 */
export const isActiveAgent = (unid: string, activeList: Array<AgentObj>) => {
  for (let ii = 0; ii < activeList.length; ii++) {
    if (unid === activeList[ii].agentUnid) {
      return true;
    }
  }
  return false;
};
/**
 * Save a list of agents for a particular database
 *
 * @param dbname the database containing the agents
 * @param agents the array of agents
 */
export const setAgents = (dbName: string, agents: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch(setAgentsAction({
        db: dbName,
        agents
      }));
  };
};
/*
 * Save a list of agents for a particular database
 *
 * @param dbname the database containing the agents
 * @param agents the array of agents
 */
export const setActiveAgents = (dbName: string, activeAgents: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_ACTIVEAGENTS,
      payload: {
        db: dbName,
        activeAgents
      }
    });
  };
};
