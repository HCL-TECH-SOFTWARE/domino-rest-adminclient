import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { configureStore, type Store } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

/**
 * Shared render helper for React component tests — the counterpart to `lit.ts`'s
 * `mountLit`/`cleanupLit` for the Lit elements.
 *
 * Every suite that needed a store used to declare its own `createMockStore()`, each an
 * identity reducer over a handful of fixed slices, and repeat the `Provider` (+ router)
 * wrapping by hand.
 *
 * The store here is deliberately the same shape those hand-rolled ones were: **static
 * slices, not real reducers.** These are component tests — they assert what renders for
 * a given state, never that dispatching changes it. A real reducer tree would couple
 * every component test to store behaviour that `test/store/**` already covers.
 */

/** Slices present for every caller, so a test only names what it actually reads. */
const DEFAULT_STATE: Record<string, unknown> = {
  databases: { folders: [], scopes: [] },
  loading: { loading: { status: false } },
  styles: { themeMode: 'light' },
  dialog: { deleteDialogVisible: false },
};

/** One identity reducer per slice — `configureStore` needs a reducer map, not a value. */
const staticReducers = (state: Record<string, unknown>) =>
  Object.fromEntries(Object.keys(state).map((key) => [key, (slice = state[key]) => slice]));

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Slices to merge over {@link DEFAULT_STATE}. Merging is one level deep: naming
   * `databases` replaces that slice wholesale rather than deep-merging into it, which
   * keeps the state a test declares readable at the call site.
   */
  preloadedState?: Record<string, unknown>;
  /**
   * Wrap in a `MemoryRouter` at this entry. Omit for components that never touch the
   * router — an unnecessary router changes what `useLocation`-style hooks see.
   */
  route?: string;
}

export interface RenderWithProvidersResult extends RenderResult {
  store: Store;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { preloadedState, route, ...renderOptions }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const state = { ...DEFAULT_STATE, ...preloadedState };
  const store = configureStore({ reducer: staticReducers(state) });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      {route === undefined ? children : <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>}
    </Provider>
  );

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store };
}
