/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import EditViewDialog from '../../../src/components/forms/EditView';
import * as databasesActions from '../../../src/store/databases/action';

// ---- Mocks ----

/**
 * The column pane is `keep-column-details` since #806, so the stand-in replaces its
 * `@lit/react` wrapper rather than a React module. Same minimal table as before; the two
 * buttons now hand back real `CustomEvent`s, because that is what the wrapper delivers and
 * a plain-argument mock would let a mis-read `event.detail` pass here.
 */
vi.mock('../../../src/components/keep-elements/react/KeepColumnDetails', () => ({
  KeepColumnDetails: function MockColumnDetails({ columns, onColumnEdit, onColumnRemove }: any) {
    return (
      <div data-testid="column-details">
        {columns.map((col: any) => (
          <div key={col.name} data-testid={`column-${col.name}`}>
            <span data-testid={`name-${col.name}`}>{col.name}</span>
            <span data-testid={`ext-${col.name}`}>{col.externalName}</span>
            <button
              data-testid={`remove-${col.name}`}
              onClick={() =>
                onColumnRemove(new CustomEvent('column-remove', { detail: { name: col.name } }))
              }
            >
              Remove
            </button>
            <button
              data-testid={`edit-${col.name}`}
              onClick={() =>
                onColumnEdit(
                  new CustomEvent('column-edit', {
                    detail: { column: col, externalName: col.externalName + '_edited' },
                  }),
                )
              }
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('../../../src/store/databases/action', () => ({
  fetchViews: vi.fn(() => ({ type: 'NOOP' })),
  updateSchema: vi.fn(() => ({ type: 'NOOP' })),
}));

vi.mock('../../../src/store/loading/action', () => ({
  setLoading: vi.fn((payload: any) => ({ type: 'SET_LOADING', payload })),
}));

vi.mock('../../../src/store/account/action', () => ({
  getToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../../src/styles/scripts', () => ({
  checkIcon: vi.fn(() => true),
}));

vi.mock('../../../src/styles/app-icons', () => ({ default: {} }));

vi.mock('../../../src/utils/common', () => ({
  fullEncode: vi.fn((v: string) => encodeURIComponent(v)),
}));

vi.mock('../../../src/utils/api-retry', () => ({
  apiRequestWithRetry: vi.fn(() =>
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

/*
 * The `APILoadingProgress` stand-in that used to sit here is gone with the component: #806
 * folded it into `keep-page-loading`, so the column pane's loading state is now a custom
 * element that renders in jsdom on its own. It arrives through the `KeepElements` bridge
 * mocked below, whose `importOriginal` spread keeps it real. No test here asserts on it.
 */

/**
 * #806 turned the dialog into `keep-unsaved-changes-dialog`, so it now arrives through the
 * `KeepElements` bridge rather than its own module. Only that one export is replaced —
 * spreading the original keeps every other `Keep*` wrapper this file renders real. These tests
 * are about EditView's behaviour, so a plain div is still the right stand-in.
 */
vi.mock('../../../src/components/keep-elements/KeepElements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/components/keep-elements/KeepElements')>()),
  KeepUnsavedChangesDialog: function MockUnsavedChangesDialog({
    open,
    onSave,
    onDiscard,
    onCancel,
  }: any) {
    if (!open) return null;
    return (
      <div role="dialog">
        <span>Unsaved Changes</span>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onDiscard}>No</button>
        <button onClick={onSave}>Yes</button>
      </div>
    );
  },
}));

// ---- Helpers ----

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
  const handleClose = vi.fn();
  const setOpen = vi.fn();
  const setSchemaData = vi.fn();

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

  const utils = renderWithProviders(<EditViewDialog {...props} />);

  return { ...utils, handleClose, setOpen, setSchemaData, props };
}

// ---- Tests ----

describe('EditViewDialog — dirty form tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress fetch errors from the useEffect
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore?.();
  });

  describe('clean state (no changes)', () => {
    it('closes without showing dirty dialog when X is clicked', async () => {
      const { handleClose } = renderEditView();

      // Wait for columns to be loaded
      await waitFor(() => {
        expect(screen.getByText(/Edit TestView Columns/)).toBeInTheDocument();
      });

      // Click X button
      const closeBtn = document.querySelector('.edit-view-close-button');
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
        const columnItems = document.querySelectorAll('.all-columns-column-name');
        expect(columnItems.length).toBeGreaterThan(0);
      });

      // Click a column from the left panel to add it (if not already added)
      const allItems = document.querySelectorAll('.all-columns-list-item:not(.all-columns-added-column)');
      if (allItems.length > 0) {
        fireEvent.click(allItems[0]);
      }

      // Click X
      const closeBtn = document.querySelector('.edit-view-close-button');
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
      const closeBtn = document.querySelector('.edit-view-close-button');
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
      const closeBtn = document.querySelector('.edit-view-close-button');
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
      const closeBtn = document.querySelector('.edit-view-close-button');
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
      const closeBtn = document.querySelector('.edit-view-close-button');
      fireEvent.click(closeBtn!);

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click No (discard)
      // { selector: 'button' } targets the mocked dialog's plain <button>. Since #701
      // the real confirm button is <keep-button>No</keep-button>, so its label is now a
      // text node too and a bare getByText('No') matches both.
      fireEvent.click(screen.getByText('No', { selector: 'button' }));

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
      const { updateSchema } = databasesActions;
      const { handleClose } = renderEditView();

      await waitFor(() => {
        expect(screen.getByTestId('column-Col1')).toBeInTheDocument();
      });

      // Remove a column to make dirty
      fireEvent.click(screen.getByTestId('remove-Col1'));

      // Click X
      const closeBtn = document.querySelector('.edit-view-close-button');
      fireEvent.click(closeBtn!);

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click Yes (save)
      fireEvent.click(screen.getByText('Yes', { selector: 'button' }));

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
        const notAdded = document.querySelectorAll('.all-columns-list-item:not(.all-columns-added-column)');
        expect(notAdded.length).toBeGreaterThan(0);
      });

      const notAdded = document.querySelectorAll('.all-columns-list-item:not(.all-columns-added-column)');
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
      const closeBtn = document.querySelector('.edit-view-close-button');
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

      const closeBtn = document.querySelector('.edit-view-close-button');
      fireEvent.click(closeBtn!);

      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      expect(handleClose).toHaveBeenCalled();
    });

    it('shows dirty dialog when columns are added to a new view', async () => {
      renderEditView({
        schemaData: makeSchemaData(undefined), // no initial columns
      });

      await waitFor(() => {
        const columnItems = document.querySelectorAll('.all-columns-column-name');
        expect(columnItems.length).toBeGreaterThan(0);
      });

      // Click a column to add it
      const items = document.querySelectorAll('.all-columns-list-item:not(.all-columns-added-column)');
      if (items.length > 0) {
        fireEvent.click(items[0]);
      }

      const closeBtn = document.querySelector('.edit-view-close-button');
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
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('does not call preventDefault on beforeunload when clean', async () => {
      renderEditView();

      await waitFor(() => {
        expect(screen.getByText(/Edit TestView Columns/)).toBeInTheDocument();
      });

      const event = new Event('beforeunload', { cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not call preventDefault when dialog is closed', async () => {
      renderEditView({ open: false });

      const event = new Event('beforeunload', { cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
