import { test, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from "react-redux";
import { rootReducer } from "../src/store";

const mockFetch = (data: any) => vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => data,
  }),
);

// jsdom 29 ships its own `attachInternals`, so the guarded polyfill in
// setupTests.ts is skipped and jsdom's implementation wins — but it is
// incompatible with WebAwesome's form-associated <wa-button> (its
// ElementInternals lacks `setValidity`, throwing async during Lit updates).
// Unconditionally override with a complete stub so the full <App> render is
// clean. (This is the one stub that is NOT a global duplicate.)
beforeAll(() => {
  HTMLElement.prototype.attachInternals = vi.fn(() => ({
    setFormValue: vi.fn(),
    setValidity: vi.fn(),
    checkValidity: vi.fn(() => true),
    reportValidity: vi.fn(() => true),
    validationMessage: '',
    validity: {},
    willValidate: true,
    states: { add: vi.fn(), delete: vi.fn(), has: vi.fn(() => false) },
    shadowRoot: null,
  }) as any);
});

test("renders home page", async () => {
  window.fetch = mockFetch({ ok: true, json: () => ({}) });
  const store = configureStore({ reducer: rootReducer });

  render(<Provider store={store}><App /></Provider>);

  // Wait for async effects in LoginPage (getIdpList, getKeepIdpActive, canDoPasskey)
  // to settle before the test ends, avoiding "not wrapped in act(...)" warnings
  await waitFor(() => {
    expect(screen.getByText(/log in with password/i)).toBeDefined();
  });
});
