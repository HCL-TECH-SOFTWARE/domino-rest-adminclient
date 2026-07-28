/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useDispatch } from 'react-redux';
import type { AppDispatch } from './index';

/**
 * Typed replacement for `useDispatch()` (#694).
 *
 * `useDispatch()` returns redux's plain `Dispatch`, which accepts action objects only.
 * Dispatching a thunk through it does not type-check, which is why 86 call sites carried
 * `dispatch(someThunk() as any)` — a cast that also erased checking of the thunk's own
 * arguments, exactly where the app talks to its store.
 *
 * `useAppDispatch()` returns `AppDispatch`, which carries the thunk overload, so the cast
 * is unnecessary and thunk arguments are checked again.
 *
 * This is the React binding layer and is expected to be deleted by #715, when a
 * StoreController takes over from react-redux. Keep store-shape types in `./index`.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
