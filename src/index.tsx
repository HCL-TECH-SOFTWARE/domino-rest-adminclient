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
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// keep-theme.css must follow webawesome.css (it overrides WA's own brand ramp)
// and precede keep-overrides.css, which builds component rules on those tokens.
import '../src/styles/keep-theme.css';
import '../src/styles/keep-overrides.css';
// The store is a module singleton now (#715), so Lit elements can reach it without a
// provider. `<Provider>` stays until the last useSelector is gone — both bindings read
// this same instance, which is what lets components convert one at a time.
import { store } from './store/store';

const root = ReactDOM.createRoot(document.getElementById('root') as Element);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
