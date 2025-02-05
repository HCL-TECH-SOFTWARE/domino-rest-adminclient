/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import App from './App';
import { configureStore } from '@reduxjs/toolkit';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '../src/styles/shoelace-overrides.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';
import { rootReducer } from './store';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.19.1/cdn/');

const store = configureStore({ reducer: rootReducer });
const root = ReactDOM.createRoot(document.getElementById('root') as Element);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
