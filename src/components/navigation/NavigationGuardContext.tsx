/* ========================================================================== *
 * Copyright (C) 2024 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import UnsavedChangesDialog from '../dialogs/UnsavedChangesDialog';

interface NavigationGuardContextType {
  /** Mark the current page as having unsaved changes */
  setDirty: (dirty: boolean) => void;
  /** Register (or clear) the async save function the dialog should call */
  setSaveFunction: (fn: (() => Promise<void>) | null) => void;
  /**
   * Navigate to `path` — if there are unsaved changes the dialog is shown
   * instead. Use this in place of `navigate()` for programmatic navigation
   * (e.g. breadcrumb onClick handlers).
   */
  guardedNavigate: (path: string) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  setDirty: () => {},
  setSaveFunction: () => {},
  guardedNavigate: () => {},
});

export const useNavigationGuard = () => useContext(NavigationGuardContext);

interface Props {
  /** Router basename so we can strip it from <a href> values (e.g. "/admin/ui") */
  basename?: string;
  children: React.ReactNode;
}

/**
 * Wraps the route content and guards against navigation when there are
 * unsaved changes.  Three kinds of navigation are intercepted:
 *
 * 1. **Hard navigation** (address-bar change, refresh, tab close) →
 *    `beforeunload` event.
 * 2. **In-app anchor links** (`<NavLink>`, `<Link>`) → captured with a
 *    document-level click listener in the *capture* phase.
 * 3. **Browser back / forward** → `popstate` event.
 *
 * Programmatic `navigate()` calls (e.g. in the breadcrumb component) are
 * handled by exposing `guardedNavigate()` via context.
 */
export const NavigationGuardProvider: React.FC<Props> = ({
  basename = '',
  children,
}) => {
  const navigate = useNavigate();

  /* ------------------------------------------------------------------ *
   *  State & refs                                                       *
   * ------------------------------------------------------------------ */
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const pendingRef = useRef<string | null>(null);

  // Keep refs in sync so event handlers always read the latest value.
  isDirtyRef.current = isDirty;
  pendingRef.current = pendingNavPath;

  /* ------------------------------------------------------------------ *
   *  Context API                                                        *
   * ------------------------------------------------------------------ */
  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
    isDirtyRef.current = dirty;
  }, []);

  const setSaveFunction = useCallback(
    (fn: (() => Promise<void>) | null) => {
      saveRef.current = fn;
    },
    []
  );

  const guardedNavigate = useCallback(
    (path: string) => {
      if (isDirtyRef.current) {
        setPendingNavPath(path);
      } else {
        navigate(path);
      }
    },
    [navigate]
  );

  /* ------------------------------------------------------------------ *
   *  1. beforeunload — browser address-bar / refresh / close            *
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        // Required by some browsers (Chrome, older Edge)
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  /* ------------------------------------------------------------------ *
   *  2. Capture-phase click — intercept <a> (NavLink / Link) clicks     *
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;

      // Walk up from the click target to find the nearest <a>
      const anchor = (e.target as HTMLElement).closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('#')
      ) {
        return; // external / mail / hash links — let them through
      }

      // Prevent React Router (and the browser) from navigating
      e.preventDefault();
      e.stopPropagation();

      // Strip the router basename to recover the route-relative path
      const routePath =
        basename && href.startsWith(basename)
          ? href.slice(basename.length) || '/'
          : href;

      setPendingNavPath(routePath);
    };

    // Capture phase so we run *before* React Router's handler
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [basename]);

  /* ------------------------------------------------------------------ *
   *  3. popstate — browser back / forward buttons                       *
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isDirty) return;

    const handler = () => {
      // Push the current URL back to undo the navigation
      window.history.pushState(null, '', window.location.href);
      setPendingNavPath('__BACK__');
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isDirty]);

  /* ------------------------------------------------------------------ *
   *  Helpers — perform the deferred navigation                          *
   * ------------------------------------------------------------------ */
  const performPendingNavigation = useCallback(
    (navPath: string | null) => {
      if (!navPath) return;
      if (navPath === '__BACK__') {
        navigate(-1 as any);
      } else {
        navigate(navPath);
      }
    },
    [navigate]
  );

  /* ------------------------------------------------------------------ *
   *  Dialog callbacks                                                    *
   * ------------------------------------------------------------------ */
  const handleSave = useCallback(async () => {
    if (saveRef.current) {
      await saveRef.current();
    }
    const navPath = pendingRef.current;
    setDirty(false);
    setPendingNavPath(null);
    performPendingNavigation(navPath);
  }, [setDirty, performPendingNavigation]);

  const handleDiscard = useCallback(() => {
    const navPath = pendingRef.current;
    setDirty(false);
    setPendingNavPath(null);
    performPendingNavigation(navPath);
  }, [setDirty, performPendingNavigation]);

  const handleCancel = useCallback(() => {
    setPendingNavPath(null);
  }, []);

  /* ------------------------------------------------------------------ *
   *  Render                                                             *
   * ------------------------------------------------------------------ */
  return (
    <NavigationGuardContext.Provider
      value={{ setDirty, setSaveFunction, guardedNavigate }}
    >
      {children}
      <UnsavedChangesDialog
        open={pendingNavPath !== null}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />
    </NavigationGuardContext.Provider>
  );
};
