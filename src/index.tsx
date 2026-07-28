/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/styles.css';
import './styles/dark-mode.css';
import { Provider } from 'react-redux';
import App from './App';
import { configureStore } from '@reduxjs/toolkit';
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// keep-theme.css must follow webawesome.css (it overrides WA's own brand ramp)
// and precede keep-overrides.css, which builds component rules on those tokens.
import '../src/styles/keep-theme.css';
import '../src/styles/keep-overrides.css';
import { rootReducer } from './store';
import { loadAppIcons } from './services/app-icons';

const store = configureStore({ reducer: rootReducer });
const root = ReactDOM.createRoot(document.getElementById('root') as Element);

// Warm the lazy icon chunk (#772) alongside the first render instead of waiting for a card
// to mount. It is off the critical path either way, but starting here means it downloads
// while the app is still authenticating and fetching schemas, so the skeleton state the
// card views can show is in practice never reached. Failures are the loader's problem —
// it clears its cache so the next consumer retries.
void loadAppIcons().catch(() => {});

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
