import { render, screen } from "@testing-library/react";
import App from "./App";
import configureStore from "./store";
import { Provider } from "react-redux";

test("renders home page", () => {
  const store = configureStore();

  render(<Provider store={store}><App /></Provider>);
  const linkElement = screen.getByText(/login your account/i);
  expect(linkElement).toBeDefined();
});
