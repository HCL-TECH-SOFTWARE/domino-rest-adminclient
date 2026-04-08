import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from "react-redux";
import { rootReducer } from "./store";

const mockFetch = (data: any) => jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => data,
  }),
);

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
