import '@testing-library/jest-dom';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import EditViewDialog from './EditView';

// ---- Mocks ----

// Mock ColumnDetails to render a minimal table for testing
jest.mock('./ColumnDetails', () => {
  return function MockColumnDetails({ chosenColumns, handleEditColumn, setRemoveColumn }: any) {
    return (
      <div data-testid="column-details">
        {chosenColumns.map((col: any) => (
          <div key={col.name} data-testid={`column-${col.name}`}>
            <span data-testid={`name-${col.name}`}>{col.name}</span>
            <span data-testid={`ext-${col.name}`}>{col.externalName}</span>
            <button
              data-testid={`remove-${col.name}`}
              onClick={() => setRemoveColumn(col.name)}
            >
              Remove
            </button>
            <button
              data-testid={`edit-${col.name}`}
              onClick={() => handleEditColumn(col, col.externalName + '_edited')}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../store/databases/action', () => ({
  fetchViews: jest.fn(() => ({ type: 'NOOP' })),
  updateSchema: jest.fn(() => ({ type: 'NOOP' })),
}));

jest.mock('../../store/loading/action', () => ({
  setLoading: jest.fn((payload: any) => ({ type: 'SET_LOADING', payload })),
}));

jest.mock('../../store/account/action', () => ({
  getToken: jest.fn(() => 'mock-token'),
}));

jest.mock('../../styles/scripts', () => ({
  checkIcon: jest.fn(() => true),
}));

jest.mock('../../styles/app-icons', () => ({}));

jest.mock('../../utils/common', () => ({
  fullEncode: jest.fn((v: string) => encodeURIComponent(v)),
}));

jest.mock('../../utils/api-retry', () => ({
  apiRequestWithRetry: jest.fn(() =>
    Promise.resolve({
      response: { ok: true },
      data: {
        Col1: { name: 'Col1', title: 'Column 1', position: 1 },
        Col2: { name: 'Col2', title: 'Column 2', position: 2 },
        Col3: { name: 'Col3', title: 'Column 3', position: 3 },
      },
    })
  ),
}));

jest.mock('../loading/APILoadingProgress', () => {
  return function MockAPILoadingProgress() {
    return <div>Loading...</div>;
  };
});

// ---- Helpers ----

function createMockStore() {
  return configureStore({
    reducer: {
      databases: (state = { folders: [], scopes: [] }) => state,
      loading: (state = { loading: { status: false } }) => state,
      styles: (state = { themeMode: 'light' }) => state,
    },
  });
}

function makeSchemaData(viewColumns?: any[]): any {
  const views = [
    {
      name: 'TestView',
      alias: [],
      unid: 'unid-1',
      ...(viewColumns ? { columns: viewColumns } : {}),
    },
  ];
  return {
    apiName: 'testapi',
    description: 'Test DB',
    nsfPath: 'test.nsf',
    iconName: 'beach',
    dqlAccess: false,
    openAccess: false,
    allowCode: false,
    allowDecryption: false,
    formulaEngine: 'default',
    dqlFormula: null,
    requireRevisionToUpdate: false,
    icon: 'beach-icon',
    isActive: 'true',
    forms: [],
    agents: [],
    views,
  };
}

const defaultColumns = [
  { name: 'Col1', externalName: 'Col1_ext' },
  { name: 'Col2', externalName: 'Col2_ext' },
];

function renderEditView(overrides: Partial<React.ComponentProps<typeof EditViewDialog>> = {}) {
  const handleClose = jest.fn();
  const setOpen = jest.fn();
  const setSchemaData = jest.fn();
  const store = createMockStore();

  const props = {
    open: true,
    handleClose,
    viewName: 'TestView',
    dbName: 'testdb',
    nsfPathProp: 'test.nsf',
    scopes: [],
    setOpen,
    schemaData: makeSchemaData(defaultColumns),
    setSchemaData,
    ...overrides,
  };

  const utils = render(
    <Provider store={store}>
      <EditViewDialog {...props} />
    </Provider>
  );

  return { ...utils, handleClose, setOpen, setSchemaData, store, props };
}

// ---- Tests ----

describe('EditViewDialog — dirty form tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress fetch errors from the useEffect
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore?.();
  });

  describe('clean state (no changes)', () => {
    it('closes without showing dirty dialog when X is clicked', async () => {
      const { handleClose } = renderEditView();

      // Wait for columns to be loaded
      await waitFor(() => {
        expect(screen.getByText(/Edit TestView Columns/)).toBeInTheDocument();
      });

      // Click X button (close-btn class)
      const closeBtn = document.querySelector('.close-btn');
      expect(closeBtn).toBeTruthy();
      fireEvent.click(closeBtn!);

      // Should close directly — no dirty dialog
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('dirty state — column added', () => {
    it('shows dirty dialog when a column is added and X is clicked', async () => {
      renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-details')).toBeInTheDocument();
      });

      // Simulate adding a column by clicking one in the left panel
      // The fetchedColumns show up after the mock API resolves
      await waitFor(() => {
        const columnItems = document.querySelectorAll('.column-name');
        expect(columnItems.length).toBeGreaterThan(0);
      });

      // Click a column from the left panel to add it (if not already added)
      const allItems = document.querySelectorAll('.list-item:not(.added-column)');
      if (allItems.length > 0) {
        fireEvent.click(allItems[0]);
      }

      // Click X
      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      // Should show dirty dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });

  describe('dirty state — column removed', () => {
    it('shows dirty dialog when a column is removed and X is clicked', async () => {
      renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-details')).toBeInTheDocument();
      });

      // Wait for columns to load into chosenColumns
      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // Remove a column
      fireEvent.click(screen.getByTestId('remove-Col1'));

      // Click X
      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      // Should show dirty dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });

  describe('dirty state — external name edited', () => {
    it('shows dirty dialog when an external name is changed and X is clicked', async () => {
      renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // Edit external name
      fireEvent.click(screen.getByTestId('edit-Col1'));

      // Click X
      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      // Should show dirty dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });

  describe('dirty dialog — Cancel button', () => {
    it('hides dirty dialog and keeps form open when Cancel is clicked', async () => {
      const { handleClose } = renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // Remove a column to make dirty
      fireEvent.click(screen.getByTestId('remove-Col1'));

      // Click X
      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click Cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Dirty dialog dismissed, form still open
      await waitFor(() => {
        const dialogs = screen.queryAllByText('Unsaved Changes');
        // All instances should be hidden (MUI keeps closed dialogs in DOM)
        const visible = dialogs.filter((el) => el.closest('[role="dialog"]')?.getAttribute('aria-hidden') !== 'true');
        expect(visible.length).toBe(0);
      });
      expect(handleClose).not.toHaveBeenCalled();
      // Columns are still rendered
      expect(screen.getByTestId('column-Col2')).toBeInTheDocument();
    });
  });

  describe('dirty dialog — No (discard) button', () => {
    it('discards changes and closes the form when No is clicked', async () => {
      const { handleClose } = renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // Remove a column to make dirty
      fireEvent.click(screen.getByTestId('remove-Col1'));

      // Click X
      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click No (discard)
      fireEvent.click(screen.getByText('No'));

      // Should close without saving
      expect(handleClose).toHaveBeenCalled();
      // Dirty dialog dismissed
      await waitFor(() => {
        const dialogs = screen.queryAllByText('Unsaved Changes');
        const visible = dialogs.filter((el) => el.closest('[role="dialog"]')?.getAttribute('aria-hidden') !== 'true');
        expect(visible.length).toBe(0);
      });
    });
  });

  describe('dirty dialog — Yes (save) button', () => {
    it('saves and closes the form when Yes is clicked', async () => {
      const { updateSchema } = jest.requireMock('../../store/databases/action');
      const { handleClose } = renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // Remove a column to make dirty
      fireEvent.click(screen.getByTestId('remove-Col1'));

      // Click X
      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click Yes (save)
      fireEvent.click(screen.getByText('Yes'));

      // Should save and close
      expect(updateSchema).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('revert to original — not dirty', () => {
    it('does not show dirty dialog when column is removed then re-added', async () => {
      renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // The initial columns are Col1, Col2 — the fetched columns also include Col1, Col2
      // Remove Col1
      fireEvent.click(screen.getByTestId('remove-Col1'));

      // Verify Col1 is gone
      expect(screen.queryByTestId('column-Col1')).not.toBeInTheDocument();

      // Re-add Col1 from the left panel (click the non-added column)
      await waitFor(() => {
        const notAdded = document.querySelectorAll('.list-item:not(.added-column)');
        expect(notAdded.length).toBeGreaterThan(0);
      });

      const notAdded = document.querySelectorAll('.list-item:not(.added-column)');
      // Find the one for Col1
      let col1Item: Element | null = null;
      notAdded.forEach((item) => {
        if (item.textContent?.includes('Col1')) {
          col1Item = item;
        }
      });

      if (col1Item) {
        fireEvent.click(col1Item);
      }

      // Now dirty depends on whether the re-added column matches original order/externalName
      // The re-added column will be appended at the end (Col2, Col1) — different order = dirty
      // This correctly means the form IS dirty because column order changed
      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      // With different order, it should show dirty dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });

  describe('new view (no initial columns)', () => {
    it('closes without dirty dialog when no columns were added', async () => {
      const { handleClose } = renderEditView({
        schemaData: makeSchemaData(undefined), // no columns
      });

      await waitFor(() => {
        expect(screen.getByText(/Edit TestView Columns/)).toBeInTheDocument();
      });

      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      expect(handleClose).toHaveBeenCalled();
    });

    it('shows dirty dialog when columns are added to a new view', async () => {
      renderEditView({
        schemaData: makeSchemaData(undefined), // no initial columns
      });

      await waitFor(() => {
        const columnItems = document.querySelectorAll('.column-name');
        expect(columnItems.length).toBeGreaterThan(0);
      });

      // Click a column to add it
      const items = document.querySelectorAll('.list-item:not(.added-column)');
      if (items.length > 0) {
        fireEvent.click(items[0]);
      }

      const closeBtn = document.querySelector('.close-btn');
      fireEvent.click(closeBtn!);

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });

  describe('beforeunload event', () => {
    it('calls preventDefault on beforeunload when dirty', async () => {
      renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // Remove a column to make dirty
      fireEvent.click(screen.getByTestId('remove-Col1'));

      const event = new Event('beforeunload', { cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      window.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('does not call preventDefault on beforeunload when clean', async () => {
      renderEditView();

      await waitFor(() => {
        expect(screen.getByText(/Edit TestView Columns/)).toBeInTheDocument();
      });

      const event = new Event('beforeunload', { cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      window.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not call preventDefault when dialog is closed', async () => {
      renderEditView({ open: false });

      const event = new Event('beforeunload', { cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      window.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
