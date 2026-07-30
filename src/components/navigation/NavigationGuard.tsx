/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useCallback, useEffect } from 'react';
import { useSelector, useStore } from 'react-redux';
import { useNavigate } from '../../router/react';
import type { AppState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import {
  allowNavigation,
  blockNavigation,
  cancelNavigation,
  setNavigationDirty,
} from '../../store/navigationGuard/action';
import { selectIsDirty, selectPendingPath } from '../../store/navigationGuard/selectors';
import { runSaveFunction, setSaveFunction } from '../../store/navigationGuard/saveFunction';
import { BACK_NAVIGATION } from '../../store/navigationGuard/types';
import { KeepUnsavedChangesDialog } from '../keep-elements/react/KeepUnsavedChangesDialog';

/**
 * The three-function channel the editing screens use — unchanged in shape, and now backed
 * by the store rather than by a React context (#806 decision 1).
 *
 * The names and signatures are the ones `NavigationGuardContext` published, because the
 * point of moving the state is that its consumers do not have to move with it.
 */
export interface NavigationGuardApi {
  /** Mark the current page as having unsaved changes. */
  setDirty: (dirty: boolean) => void;
  /** Register (or clear, with `null`) the async save function the dialog should call. */
  setSaveFunction: (fn: (() => Promise<void>) | null) => void;
  /**
   * Navigate to `path` — if there are unsaved changes the dialog is shown instead. Use this
   * in place of `navigate()` for programmatic navigation (e.g. breadcrumb click handlers).
   */
  guardedNavigate: (path: string) => void;
}

/**
 * Reach the unsaved-changes guard from a React component.
 *
 * **No provider.** This used to be `useContext`, which meant a component only had a guard
 * if it happened to be rendered inside `NavigationGuardProvider`, and got three silent
 * no-ops if it was not — the same invisible failure mode as #884, waiting for the first
 * component that #806 moved out of that subtree. The state is in the store now, so this
 * works wherever it is called from.
 *
 * It does need a **router** in scope, which the context version did not: `guardedNavigate`
 * ends in a `navigate()` call. Both callers already use `useLocation()`, and a component
 * that navigates without a router is the error `useRouter` exists to raise.
 */
export const useNavigationGuard = (): NavigationGuardApi => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  /*
   * The store itself, not `useSelector(selectIsDirty)`.
   *
   * `guardedNavigate` needs the value *at the moment of the click*, which is what the
   * provider's `isDirtyRef` was for — and reading it here rather than subscribing keeps
   * this hook free of re-renders. The breadcrumb calls it and would otherwise re-render
   * every time the access-mode editor went from clean to dirty and back.
   */
  const store = useStore<AppState>();

  const setDirty = useCallback(
    (dirty: boolean) => {
      dispatch(setNavigationDirty(dirty));
    },
    [dispatch],
  );

  const guardedNavigate = useCallback(
    (path: string) => {
      if (selectIsDirty(store.getState())) {
        dispatch(blockNavigation(path));
      } else {
        navigate(path);
      }
    },
    [dispatch, navigate, store],
  );

  // `setSaveFunction` is a module singleton and already stable, so it is passed straight
  // through — wrapping it would only give callers a new identity on every render.
  return { setDirty, setSaveFunction, guardedNavigate };
};

interface Props {
  /** Router basename so we can strip it from anchor `href` values (e.g. "/admin/ui"). */
  basename?: string;
}

/**
 * Guards against navigation away from a page with unsaved changes.
 *
 * Renders nothing but the dialog, and takes no children: the listeners below are on
 * `document` and `window`, so what is guarded is the whole app rather than a subtree. It
 * was a provider wrapping the routes, which implied a scope it never actually had — a
 * component moved out of that subtree by #806 would have looked guarded and not been.
 *
 * Four kinds of navigation are intercepted:
 *
 * 1. **Hard navigation** (address-bar change, refresh, tab close) → `beforeunload`.
 * 2. **In-app anchor links** (`<NavLink>`, `<Link>`) → a document-level click listener in
 *    the *capture* phase. Anchors inside a component's shadow root count: see the
 *    `composedPath()` note below (#884, fixed in #901).
 * 3. **Browser back / forward** → `popstate`.
 * 4. **Programmatic `navigate()`** → callers use `useNavigationGuard().guardedNavigate`.
 *
 * All three listeners are registered only while something is dirty. The old provider kept
 * them installed permanently and had each handler return early, which put a capture-phase
 * listener in front of every click in the app for the whole session.
 */
export const NavigationGuard: React.FC<Props> = ({ basename = '' }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isDirty = useSelector(selectIsDirty);
  const pendingPath = useSelector(selectPendingPath);

  /* ------------------------------------------------------------------ *
   *  1. beforeunload — browser address-bar / refresh / close            *
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by some browsers (Chrome, older Edge)
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /* ------------------------------------------------------------------ *
   *  2. Capture-phase click — intercept <a> (NavLink / Link) clicks     *
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: MouseEvent) => {
      // The nearest <a> the click actually passed through. `composedPath()` rather than
      // `closest()` because `e.target` is **retargeted to the host** for anything inside a
      // shadow root, and `closest()` then walks light-DOM ancestors that hold no anchor: the
      // handler returned here and navigation proceeded with the user's work discarded, with no
      // error and nothing to notice (#884). The path is ordered target-outward, so `find`
      // gives the nearest anchor, which is what `closest()` meant.
      //
      // A *closed* shadow root is still invisible — `composedPath()` stops at one, and no
      // traversal gets past it. Nothing here uses one; Lit and Web Awesome both open theirs.
      const anchor = e.composedPath().find(
        (node): node is HTMLAnchorElement =>
          node instanceof HTMLAnchorElement && node.hasAttribute('href'),
      );
      if (!anchor) return;

      // The attribute, not `anchor.href`: the resolved property is absolute
      // ("http://host/scope"), which the `startsWith('http')` test below would read as an
      // external link and wave through — and the basename stripping wants the attribute form.
      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('#')
      ) {
        return; // external / mail / hash links — let them through
      }

      // Stop the browser navigating, and the Link's own onClick handler from running —
      // this listener is on the capture phase precisely so it decides first. (react-router
      // was removed in #716; the in-repo router is what handles the click otherwise.)
      e.preventDefault();
      e.stopPropagation();

      // Strip the router basename to recover the route-relative path
      const routePath =
        basename && href.startsWith(basename)
          ? href.slice(basename.length) || '/'
          : href;

      dispatch(blockNavigation(routePath));
    };

    // Capture phase so we run *before* the router's own handler
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [basename, dispatch, isDirty]);

  /* ------------------------------------------------------------------ *
   *  3. popstate — browser back / forward buttons                       *
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isDirty) return;

    const handler = () => {
      // Push the current URL back to undo the navigation
      window.history.pushState(null, '', window.location.href);
      dispatch(blockNavigation(BACK_NAVIGATION));
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [dispatch, isDirty]);

  /* ------------------------------------------------------------------ *
   *  Dialog callbacks                                                    *
   * ------------------------------------------------------------------ */

  /**
   * The user is leaving: clear the guard, then perform what was held.
   *
   * `pendingPath` can legitimately be `null` here — the dialog is always mounted and only
   * its `open` changes, so its events can arrive with nothing queued. A stray one must not
   * navigate the user anywhere.
   */
  const leave = useCallback(() => {
    dispatch(allowNavigation());
    if (!pendingPath) return;
    if (pendingPath === BACK_NAVIGATION) {
      navigate(-1);
    } else {
      navigate(pendingPath);
    }
  }, [dispatch, navigate, pendingPath]);

  const handleSave = useCallback(async () => {
    await runSaveFunction();
    leave();
  }, [leave]);

  const handleCancel = useCallback(() => {
    dispatch(cancelNavigation());
  }, [dispatch]);

  return (
    <KeepUnsavedChangesDialog
      open={pendingPath !== null}
      onSave={handleSave}
      onDiscard={leave}
      onCancel={handleCancel}
    />
  );
};
