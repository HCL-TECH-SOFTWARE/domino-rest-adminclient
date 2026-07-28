/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './index';

/**
 * The application store, as a module singleton (#715).
 *
 * It used to be constructed inside `src/index.tsx` and handed to react-redux's
 * `<Provider>`, which made React the only way to reach it. Lit elements have no
 * provider to read from, so the store has to be importable like any other module
 * before `StoreController` can exist.
 *
 * This app has exactly one store, so a singleton is simpler than `@lit/context` and
 * avoids re-plumbing every file with a consumer. `@lit/context` remains the answer if
 * per-subtree stores are ever needed — they are not today.
 *
 * `<Provider store={store}>` still wraps the React tree in the entry point, and must
 * keep doing so until the last `useSelector` is gone: both bindings read the *same*
 * store instance, which is what lets the migration proceed one component at a time
 * rather than as a big-bang switch.
 *
 * `AppState` and `AppDispatch` deliberately stay in `./index` — they describe the
 * store's shape, not its instance, and keeping them there means nothing has to import
 * this module just to name a type.
 */
export const store = configureStore({ reducer: rootReducer });
