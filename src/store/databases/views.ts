/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import {
  Database,
  SET_VIEWS,
  UPDATE_VIEW,
  SET_ACTIVEVIEWS,
  UPDATE_AGENT,
  SET_ACTIVEAGENTS,
  ViewObj,
  AgentObj,
  ADD_ACTIVEVIEW,
  DELETE_ACTIVEVIEW,
  VIEWS_ERROR,
} from './types';
import { AppDispatch } from '..';
import { toggleAlert } from '../alerts/action';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading } from '../dialog/action';
import { fullEncode } from '../../utils/common';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { log, setDBError, clearDBError } from './shared';
import { isActiveAgent } from './agents';

/**
 * Retrieves views for a particular database and
 * passes them to Redux.
 *
 * @param nsfPath the name of the database
 */
export const fetchViews = (dbName: string, nsfPath: string) => {
  return async (dispatch: Dispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/views?nsfPath=${nsfPath}`, {
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
        setViews(
          dbName,
          data.views.map((view: any) => {
            let aliasArray: Array<any> = [];
            if (view['@alias'] != null && view['@alias'].length > 0) {
              if (Array.isArray(view['@alias'])) {
                aliasArray = view['@alias'];
              } else {
                aliasArray.push(view['@alias']);
              }
            }
            return {
              viewName: view['@name'],
              viewAlias: aliasArray,
              viewUnid: view['@unid'],
              viewUpdated: view['columns'] && view['columns'].length ? true : false,
              viewSelectionFormula: view['@selectionformula']
            };
          })
        ) as any
      );
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      log.error('Error fetching views', { error });
    }
  };
};
/**
 * Add/remove active view/s and then send them to the server
 */
export const handleDatabaseViews = (
  viewsArray: Array<any>,
  activeViews: any,
  dbName: string,
  schemaData: Database,
  active: boolean,
  setSchemaData: (data: any) => void,
  folderNames: Array<string>
) => {
  return async (dispatch: AppDispatch) => {
    // Build redux data
    const viewsData = viewsArray.map((view: any) => {
      return buildReduxViewData(view, active);
    });

    // Update panels
    viewsData.forEach((view: any) => {
      dispatch(updatePanels(dbName, view));
    });

    // Save views
    //  Build the array of new views
    const viewsList: Array<any> = [];
    if (viewsArray.length === 1) {
      activeViews.forEach((view: any) => {
        if (view.viewName !== viewsData[0].viewName) {
          viewsList.push(saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName)));
        } else if (view.viewName === viewsData[0].viewName && active) {
          viewsList.push(saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName)));
        }
      });
      if (active) {
        viewsList.push(
          saveViewDetails(viewsArray[0], schemaData.nsfPath, active, folderNames.includes(viewsArray[0].viewName), true)
        );
      }
    } else if (active) {
      const activeViewNames = activeViews.map((view: any) => {
        return view.viewName;
      });
      viewsArray.forEach(async (view: any) => {
        // if a view was already active, don't add it again to the active views list
        if (!activeViewNames.includes(view.viewName)) {
          const viewDetails = saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName), true);
          viewsList.push(viewDetails);
        }
      });
      activeViews.forEach(async (view: any) => {
        const viewDetails = saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName));
        viewsList.push(viewDetails);
      });
    }

    const finalViews = await Promise.all(viewsList);

    // Send the new views to the server
    dispatch(updateViews(schemaData, finalViews, setSchemaData));
  };
};
/**
 * update views to server
 */
const updateViews = (schemaData: Database, viewsData: any, setSchemaData: (data: any) => void) => {
  return async (dispatch: Dispatch) => {
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
      views: viewsData
    };
    try {
      dispatch(setApiLoading(true));
      try {
        let { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`, {
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

        dispatch(toggleAlert(`Views have been successfully saved.`));
        setSchemaData({
          ...data,
          nsfPath: newSchemaData.nsfPath,
          schemaName: newSchemaData.schemaName
        });
        response = {
          ...data,
          nsfPath: newSchemaData.nsfPath,
          schemaName: newSchemaData.schemaName
        };
      } catch (e: any) {
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)

        dispatch(toggleAlert(`Update views failed! ${error.message}`));
        dispatch({
          type: VIEWS_ERROR,
          payload: true
        });
      }
      dispatch(setApiLoading(false));
      dispatch(clearDBError());
    } catch (err: any) {
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
      } else {
        dispatch(setDBError(err.message));
      }
    }
  };
};
async function saveViewDetails(currentView: any, nsfPath: string, active: boolean, isFolder: boolean, callFetch = false) {
  let aliasArray: Array<any> = [];
  if (currentView.viewAlias != null && currentView.viewAlias.length > 0) {
    if (Array.isArray(currentView.viewAlias)) {
      aliasArray = currentView.viewAlias;
    } else {
      aliasArray.push(currentView.viewAlias);
    }
  }

  let viewDesign: any = {};

  if (active && callFetch) {
    viewDesign = await getViewDesign(currentView.viewName, nsfPath, isFolder);
  } else {
    viewDesign = {
      ...viewDesign,
      '@selectionFormula': currentView.viewSelectionFormula
    };
  }

  if (isFolder) {
    return {
      name: currentView.viewName,
      alias: aliasArray,
      unid: currentView.viewUnid,
      columns: currentView.viewColumns,
      viewUpdated: currentView.viewUpdated
    };
  } else {
    return {
      name: currentView.viewName,
      alias: aliasArray,
      unid: currentView.viewUnid,
      columns: currentView.viewColumns,
      viewUpdated: currentView.viewUpdated,
      selectionFormula: viewDesign['@selectionFormula']
    };
  }
}

// Get view elements by calling the design API
async function getViewDesign(viewName: string, nsfPath: string, isFolder: boolean) {
  const { data } = await apiRequestWithRetry(() =>
    fetch(
      `${SETUP_KEEP_API_URL}/design/${isFolder ? 'folders' : 'views'}/${fullEncode(viewName)}?nsfPath=${fullEncode(nsfPath)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      }
    ), { notifyOnError: false })

  // const obj = await response.json();
  const obj = data
  return obj;
}
function buildReduxViewData(currentView: any, viewActive: boolean) {
  return {
    viewName: currentView.viewName,
    viewAlias: currentView.viewAlias,
    viewUnid: currentView.viewUnid,
    viewActive: viewActive,
    viewUpdated: !viewActive ? false : currentView.viewUpdated,
    viewSelectionFormula: currentView.viewSelectionFormula
  };
}
function updatePanels(dbName: string, viewData: ViewObj) {
  return async (dispatch: Dispatch) => {
    // Update All Panel
    dispatch({
      type: UPDATE_VIEW,
      payload: {
        db: dbName,
        view: viewData
      }
    });

    // Update Active Panel
    if (viewData.viewActive) {
      dispatch({
        type: ADD_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: viewData
        }
      });
    } else {
      dispatch({
        type: DELETE_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: viewData.viewUnid
        }
      });
    }
  };
}
/**
 * Retrieves the information for a particular database and
 * either uses it to populate the active views and agents
 * panels, or to save the active views and agents panels.
 *
 * @param dbName the name of the database
 * @param action "init" to initialize state and "save" to save it
 * @param type "views", "agents", "both"
 * @param allViewsList complete views list
 * @param allAgentsList complete agents list
 * @param viewData views to save
 * @param agentData agents to save
 *
 */
export const processViewsAgents = (
  dbName: string,
  nsfPath: string,
  action: string,
  type: string,
  allViewsList: Array<ViewObj>,
  allAgentsList: Array<any>,
  viewData: Array<any>,
  agentData: Array<any>
) => {
  return async (dispatch: Dispatch) => {
    try {
      let { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${dbName}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Initialize Views and Agents
      if (action === 'init') {
        // Get list of Active Views and Agents
        let views: Array<any> = data.availableViews;
        let agents: Array<any> = data.agents;

        // Build Active View list
        const viewsList: Array<any> = [];
        Object.values(views).forEach((view) => {
          let alias = view.alias != null && view.alias.length > 0 ? view.alias[0] : '';

          // Suppress alias when it's a duplicate of the name LABS-1903
          alias = alias === view.name ? '' : alias;
          let viewUpdatedBool = view.columns && view.columns.length > 0 ? true : false;
          viewsList.push({
            viewName: view.name,
            viewAlias: alias,
            viewUnid: view.unid,
            viewActive: true,
            viewUpdated: viewUpdatedBool
          });
        });

        // Build Active Agent list
        const agentsList: Array<any> = [];
        Object.values(agents).forEach((agent) => {
          let alias = agent.alias != null && agent.alias.length > 0 ? agent.alias[0] : '';

          // Suppress alias when it's a duplicate of the name LABS-1903
          alias = alias === agent.name ? '' : alias;
          agentsList.push({
            agentName: agent.name,
            agentAlias: alias,
            agentUnid: agent.unid,
            agentActive: true
          });
        });

        // Save Active Views \ Agents Data
        dispatch({
          type: SET_ACTIVEVIEWS,
          payload: {
            db: dbName,
            activeViews: viewsList
          }
        });
        dispatch({
          type: SET_ACTIVEAGENTS,
          payload: {
            db: dbName,
            activeAgents: agentsList
          }
        });

        // Mark Active Views (left Panel)
        allViewsList.forEach((view: ViewObj) => {
          if (isActiveView(view.viewUnid, viewsList)) {
            const viewData: ViewObj = {
              viewName: view.viewName,
              viewAlias: view.viewAlias,
              viewUnid: view.viewUnid,
              viewActive: true,
              viewUpdated: view.viewUpdated
            };
            dispatch({
              type: UPDATE_VIEW,
              payload: {
                db: dbName,
                view: viewData
              }
            });
          }
        });

        // Mark Active Agents (left Panel)
        allAgentsList.forEach((agent: AgentObj) => {
          if (isActiveAgent(agent.agentUnid, agentsList)) {
            const agentData: AgentObj = {
              agentName: agent.agentName,
              agentAlias: agent.agentAlias,
              agentUnid: agent.agentUnid,
              agentActive: true
            };
            dispatch({
              type: UPDATE_AGENT,
              payload: {
                db: dbName,
                agent: agentData
              }
            });
          }
        });
      }

      // Save Views and Agents
      else {
        // Build data
        if (type === 'views') {
          data.availableViews = viewData;
        } else {
          data.agents = agentData;
        }

        try {
          // Destructured under different names on purpose. Called `data`, this
          // binding shadowed the outer `data` for the whole block — including the
          // `JSON.stringify(data)` in the request body below, which runs inside the
          // callback while the binding is still in its temporal dead zone. Every
          // save therefore raised "Cannot access 'data' before initialization"
          // inside apiRequestWithRetry, which caught it and returned a failure: the
          // POST was never sent, the user got a toast quoting a JavaScript error,
          // and the thunk resolved as though it had merely failed. (#803)
          const { response: saveResponse, data: saveData } = await apiRequestWithRetry(() =>
            fetch(`${SETUP_KEEP_API_URL}/admin/scope`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            })
          )
          const res = saveResponse
          const resData = saveData

          if (!res.ok) {
            throw new Error(JSON.stringify(resData))
          }

          // Notify user
          if (type === 'views') {
            dispatch(toggleAlert('Activated Views have been saved'));
          } else {
            dispatch(toggleAlert('Activated Agents have been saved'));
          }
        } catch (e: any) {
          const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
          const error = JSON.parse(err)

          log.error('Error in saveViewsAgents', { statusCode: error.statusCode, message: error.message });
        }
      }
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      log.error('Error in processViewsAgents', { statusCode: error.statusCode, message: error.message });
    }
  };
};
/**
 * isActiveView determines if a particular View has been
 * activated.
 *
 * @param unid the id of the view to check
 * @param activeList the list of activated Views
 *
 */
export const isActiveView = (unid: string, activeList: Array<ViewObj>) => {
  for (let ii = 0; ii < activeList.length; ii++) {
    if (unid === activeList[ii].viewUnid) {
      return true;
    }
  }
  return false;
};
/**
 * Save a list of views for a particular database
 *
 * @param dbname the database containing the views
 * @param views the array of views
 */
export const setViews = (dbName: string, views: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_VIEWS,
      payload: {
        db: dbName,
        views
      }
    });
  };
};
/*
 * Save a list of views for a particular database
 *
 * @param dbname the database containing the views
 * @param views the array of views
 */
export const setActiveViews = (dbName: string, activeViews: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_ACTIVEVIEWS,
      payload: {
        db: dbName,
        activeViews
      }
    });
  };
};
