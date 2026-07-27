/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
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

// No `setBasePath()` here on purpose. In WebAwesome 3.x the base path feeds exactly
// one consumer — the autoloader, which lazily `import()`s `components/<tag>/<tag>.js`
// from it. This app does not autoload; it imports each of the 18 WebAwesome components
// it uses explicitly, so nothing ever reads the value. Icons are unaffected either way: they
// resolve through `setIconPath()`/kit code, which is a separate setting, and this app
// serves its own glyphs from `services/icon-library.ts`.
//
// The call that used to live here passed `.../webawesome@3.6.0/webawesome.loader.js`
// — a *file*, where a directory is expected, and pinned to a version no longer
// installed. It was inert, so it never failed loudly. Guarded by icon-library.test.ts.

const store = configureStore({ reducer: rootReducer });
const root = ReactDOM.createRoot(document.getElementById('root') as Element);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
