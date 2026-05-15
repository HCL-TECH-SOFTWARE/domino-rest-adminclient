/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/dark-mode.css';
import { Provider } from 'react-redux';
import App from './App';
import { configureStore } from '@reduxjs/toolkit';
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '../src/styles/lit-overrides.css';
import { setBasePath } from '@awesome.me/webawesome/dist/utilities/base-path.js';
import { rootReducer } from './store';

setBasePath('https://ka-f.webawesome.com/webawesome@3.6.0/webawesome.loader.js');

const store = configureStore({ reducer: rootReducer });
const root = ReactDOM.createRoot(document.getElementById('root') as Element);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
