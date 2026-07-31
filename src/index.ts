/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The application entry — `index.tsx` until #719 half 2.
 *
 * There is no mount call any more, and that is most of the diff: `index.html` contains a
 * `<keep-app>` element, so the browser upgrades it the moment this module registers the tag.
 * `ReactDOM.createRoot(document.getElementById('root'))` and the `<Provider store={store}>`
 * around it are both gone — the store has been a module singleton since #715 and every element
 * reaches it through `StoreController`, so the provider had nothing left to provide.
 *
 * What remains is a load order that decides what the app looks like and that nothing in the
 * test suite can check: the suite runs with `css: false`, so an imported stylesheet is absent
 * there rather than mis-ordered.
 */

// A bare import: it registers `keep-app` as a side effect, and `index.html` names the tag.
import './components/keep-elements/keep-app';

/*
 * The chain that matters is the last three:
 *
 *   webawesome.css      the component library's own tokens and native-element styling
 *   keep-theme.css      overrides Web Awesome's brand ramp — must follow it
 *   keep-overrides.css  builds component rules on those tokens — must follow keep-theme
 *
 * `index.css` and `styles.css` are the app's own document-scope sheets and sit outside it.
 * `app-shell.css` is deliberately *not* here: `keep-app-shell` imports it, so it travels in
 * the shell's chunk rather than the entry's (#974).
 */
import './index.css';
import './styles/styles.css';
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import './styles/keep-theme.css';
import './styles/keep-overrides.css';

import { loadAppIcons } from './services/app-icons';

/*
 * Warm the lazy icon chunk (#772) instead of waiting for a card to mount. It is off the
 * critical path either way, but starting here means it downloads while the app is still
 * authenticating and fetching schemas, so the skeleton state the card views can show is in
 * practice never reached. Failures are the loader's problem — it clears its cache so the next
 * consumer retries.
 */
void loadAppIcons().catch(() => {});
