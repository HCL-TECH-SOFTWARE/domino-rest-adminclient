import { render, screen } from "@testing-library/react";
import App from "./App";
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from "react-redux";
import { rootReducer } from "./store";

test("renders home page", () => {
  const store = configureStore({ reducer: rootReducer });

  render(<Provider store={store}><App /></Provider>);
  const linkElement = screen.getByText(/login your account/i);
  expect(linkElement).toBeDefined();
});
