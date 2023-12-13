import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import LoginPage from '../LoginPage';
import configureStore from '../../../store';

const store = configureStore();

describe('tests for login page errors', () => {
  test('show error for 401 message when error 401 is encountered', () => {
    store.getState().account.error401 = true;

    render(
      <Provider store={store}>
        <Router basename="/admin/ui/">
          <LoginPage/>
        </Router>
      </Provider>
    );

    expect(screen.getByText('Invalid credentials. Please try to sign in again.')).toBeInTheDocument();
  });
});
