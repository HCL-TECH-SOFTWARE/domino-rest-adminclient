import { render, screen } from "@testing-library/react";
import App from "./App";
import { Provider } from "react-redux";
import { store } from "./store";

test("renders home page", () => {

  render(<Provider store={store}><App /></Provider>);
  const linkElement = screen.getByText(/login your account/i);
  expect(linkElement).toBeDefined();
});
