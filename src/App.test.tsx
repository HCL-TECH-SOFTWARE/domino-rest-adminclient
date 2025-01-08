import { render, screen } from "@testing-library/react";
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

test("renders home page", () => {
  window.fetch = mockFetch({ ok: true, json: () => ({}) });
  const store = configureStore({ reducer: rootReducer });

  render(<Provider store={store}><App /></Provider>);
  const linkElement = screen.getByText(/login your account/i);
  expect(linkElement).toBeDefined();
});
