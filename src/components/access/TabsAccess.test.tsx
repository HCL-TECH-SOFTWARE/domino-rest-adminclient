import '@testing-library/jest-dom';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import TabsAccess from './TabsAccess';

// ---- Mocks ----

// Heavy child component mocks
jest.mock('./FieldDndContainer', () => {
  return function MockFieldDNDContainer(props: any) {
    return (
      <div data-testid="field-dnd">
        <button
          data-testid="change-scripts"
          onClick={() =>
            props.setScripts({
              ...props.data,
              computeWithForm: !props.data.computeWithForm,
            })
          }
        >
          Toggle computeWithForm
        </button>
        <button
          data-testid="revert-scripts"
          onClick={() =>
            props.setScripts({ ...props.data })
          }
        >
          Revert Scripts
        </button>
        <button
          data-testid="change-required"
          onClick={() =>
            props.setRequired([...(props.required || []), 'NewField'])
          }
        >
          Add Required
        </button>
        <button
          data-testid="revert-required"
          onClick={() =>
            props.setRequired(props.required?.filter((r: string) => r !== 'NewField') || [])
          }
        >
          Revert Required
        </button>
        <button
          data-testid="change-validation"
          onClick={() =>
            props.setValidationRules({ ...(props.validationRules || {}), test: 'rule' })
          }
        >
          Add Validation
        </button>
        <button
          data-testid="revert-validation"
          onClick={() => {
            const { test: _, ...rest } = props.validationRules || {};
            props.setValidationRules(rest);
          }}
        >
          Revert Validation
        </button>
      </div>
    );
  };
});

jest.mock('./AddModeDialog', () => {
  return function MockAddModeDialog() {
    return <div data-testid="add-mode-dialog" />;
  };
});

jest.mock('../applications/FormDrawer', () => {
  return function MockFormDrawer() {
    return <div data-testid="form-drawer" />;
  };
});

jest.mock('../applications/DeleteApplicationDialog', () => {
  return function MockDeleteApplicationDialog() {
    return <div data-testid="delete-dialog" />;
  };
});

jest.mock('../../store/databases/action', () => ({
  testFormula: jest.fn(() => () => Promise.resolve()),
  updateFormMode: jest.fn(() => () => Promise.resolve()),
  deleteFormMode: jest.fn(() => () => Promise.resolve()),
  updateSchema: jest.fn(() => () => Promise.resolve()),
}));

jest.mock('../../store/drawer/action', () => ({
  toggleApplicationDrawer: jest.fn(() => ({ type: 'NOOP' })),
}));

jest.mock('../../store/dialog/action', () => ({
  toggleDeleteDialog: jest.fn(() => ({ type: 'NOOP' })),
}));

jest.mock('../../store/alerts/action', () => ({
  toggleAlert: jest.fn(() => ({ type: 'NOOP' })),
}));

jest.mock('../../store/databases/scripts', () => ({
  findScopeBySchema: jest.fn(() => -1),
}));

jest.mock('../../utils/form', () => ({
  isEmptyOrSpaces: jest.fn((s: string) => !s || s.trim().length === 0),
  verifyModeName: jest.fn(() => true),
}));

jest.mock('../../store/styles/action', () => ({
  getTheme: jest.fn(() => ({
    textColorPrimary: '#000',
    borderColor: '#ccc',
    hoverColor: '#eee',
  })),
}));

// ---- Helpers ----

function createMockStore() {
  return configureStore({
    reducer: {
      databases: (state = { scopes: [], newForm: { enabled: false } }) => state,
      styles: (state = { themeMode: 'light' }) => state,
      dialog: (state = { deleteDialogVisible: false }) => state,
    },
  });
}

function makeMode(overrides: any = {}) {
  return {
    modeName: 'default',
    computeWithForm: false,
    readAccessFormula: { formulaType: 'domino', formula: '' },
    writeAccessFormula: { formulaType: 'domino', formula: '' },
    deleteAccessFormula: { formulaType: 'domino', formula: '' },
    onLoad: { formulaType: 'domino', formula: '' },
    onSave: { formulaType: 'domino', formula: '' },
    sign: { formulaType: 'domino', formula: '' },
    continueOnError: true,
    required: ['Field1'],
    validationRules: {},
    fields: [
      { name: 'Field1', type: 'string', fieldAccess: 'RW' },
    ],
    ...overrides,
  };
}

function makeSchemaData(): any {
  return {
    '@unid': 'test-unid',
    apiName: 'testapi',
    schemaName: 'testschema',
    description: 'Test',
    nsfPath: 'test.nsf',
    icon: 'beach',
    iconName: 'beach',
    isActive: 'true',
    owners: [],
    isModeFetch: true,
    modes: [makeMode()],
    forms: [
      {
        formName: 'TestForm',
        alias: ['TestForm'],
        formModes: [makeMode()],
      },
    ],
    configuredForms: ['TestForm'],
  };
}

function makeState() {
  return {
    ReadAccess: [
      { name: 'Field1', type: 'string', fieldAccess: 'RW', content: '', id: '1' },
    ],
  };
}

interface RenderOptions {
  modes?: any[];
  currentModeIndex?: number;
  state?: any;
}

function renderTabsAccess(options: RenderOptions = {}) {
  const {
    modes = [makeMode()],
    currentModeIndex = 0,
    state = makeState(),
  } = options;

  const setHasUnsavedChanges = jest.fn();
  const setPageIndex = jest.fn();
  const setCurrentModeIndex = jest.fn();
  const saveRef = { current: jest.fn(() => Promise.resolve()) };
  const postSaveActionRef = { current: null as 'add' | 'clone' | null };

  const store = createMockStore();

  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/schema/test.nsf/testschema/TestForm']}>
        <TabsAccess
          state={state}
          width={100}
          modes={modes}
          top={0}
          currentModeIndex={currentModeIndex}
          setPageIndex={setPageIndex}
          setCurrentModeIndex={setCurrentModeIndex}
          remove={jest.fn()}
          update={jest.fn()}
          addField={jest.fn(() => '')}
          schemaData={makeSchemaData()}
          setSchemaData={jest.fn()}
          fieldIndex={0}
          setFieldIndex={jest.fn()}
          setHasUnsavedChanges={setHasUnsavedChanges}
          saveRef={saveRef}
          postSaveActionRef={postSaveActionRef}
        />
      </MemoryRouter>
    </Provider>
  );

  return {
    ...utils,
    setHasUnsavedChanges,
    setPageIndex,
    setCurrentModeIndex,
    saveRef,
    postSaveActionRef,
    store,
  };
}

// ---- Tests ----

describe('TabsAccess — Form Schema dirty tracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state (no user edits)', () => {
    it('does not mark dirty on mount', () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      // Advance past the pauseDirtyTracking delay
      act(() => { jest.advanceTimersByTime(600); });

      // setHasUnsavedChanges may have been called with false during init, but not true
      const calls = setHasUnsavedChanges.mock.calls;
      const trueCalls = calls.filter((c: any[]) => c[0] === true);
      expect(trueCalls.length).toBe(0);
    });
  });

  describe('scripts change marks dirty', () => {
    it('marks dirty when computeWithForm is toggled', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      // Let the pauseDirtyTracking timer expire so edits are tracked
      act(() => { jest.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      // Toggle computeWithForm via the mocked FieldDndContainer
      fireEvent.click(screen.getByTestId('change-scripts'));

      // The useEffect should fire and mark dirty
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('scripts change reverted clears dirty', () => {
    it('clears dirty when scripts are reverted to original values', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      // Let init settle
      act(() => { jest.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      // Change scripts
      fireEvent.click(screen.getByTestId('change-scripts'));

      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      setHasUnsavedChanges.mockClear();

      // Revert scripts — toggle again restores original
      fireEvent.click(screen.getByTestId('change-scripts'));

      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('required field change marks dirty', () => {
    it('marks dirty when a required field is added', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      act(() => { jest.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      fireEvent.click(screen.getByTestId('change-required'));

      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('required field reverted clears dirty', () => {
    it('clears dirty when required fields revert to original', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      act(() => { jest.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      // Add required
      fireEvent.click(screen.getByTestId('change-required'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      setHasUnsavedChanges.mockClear();

      // Revert required
      fireEvent.click(screen.getByTestId('revert-required'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('validation rules change marks dirty', () => {
    it('marks dirty when validation rules change', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      act(() => { jest.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      fireEvent.click(screen.getByTestId('change-validation'));

      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('validation rules reverted clears dirty', () => {
    it('clears dirty when validation rules revert to original', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      act(() => { jest.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      fireEvent.click(screen.getByTestId('change-validation'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      setHasUnsavedChanges.mockClear();

      fireEvent.click(screen.getByTestId('revert-validation'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('guard action — mode switch while dirty', () => {
    it('shows unsaved changes dialog when switching mode while dirty', async () => {
      const modes = [
        makeMode({ modeName: 'default' }),
        makeMode({ modeName: 'readOnly' }),
      ];
      const { setHasUnsavedChanges } = renderTabsAccess({ modes });

      act(() => { jest.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      // Make dirty
      fireEvent.click(screen.getByTestId('change-scripts'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Find the mode dropdown button and click it
      const modeButton = screen.getByText('default');
      fireEvent.click(modeButton);

      // Click on the other mode
      const readOnlyOption = await screen.findByText('readOnly');
      fireEvent.click(readOnlyOption);

      // Should show unsaved changes dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });

    it('does not show dialog when switching mode while clean', async () => {
      const modes = [
        makeMode({ modeName: 'default' }),
        makeMode({ modeName: 'readOnly' }),
      ];
      renderTabsAccess({ modes });

      act(() => { jest.advanceTimersByTime(600); });

      // Without making dirty, switch mode
      const modeButton = screen.getByText('default');
      fireEvent.click(modeButton);

      const readOnlyOption = await screen.findByText('readOnly');
      fireEvent.click(readOnlyOption);

      // Should NOT show unsaved changes dialog
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });
  });

  describe('dirty dialog — Cancel', () => {
    it('closes the dirty dialog and stays on current mode', async () => {
      const modes = [
        makeMode({ modeName: 'default' }),
        makeMode({ modeName: 'readOnly' }),
      ];
      const { setHasUnsavedChanges, setCurrentModeIndex } = renderTabsAccess({ modes });

      act(() => { jest.advanceTimersByTime(600); });

      // Make dirty
      fireEvent.click(screen.getByTestId('change-scripts'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Try to switch mode
      fireEvent.click(screen.getByText('default'));
      fireEvent.click(await screen.findByText('readOnly'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click Cancel
      fireEvent.click(screen.getByText('Cancel'));

      // Dialog dismissed (MUI keeps closed dialogs in DOM, check aria-hidden)
      await waitFor(() => {
        const dialogs = screen.queryAllByText('Unsaved Changes');
        const visible = dialogs.filter((el) => el.closest('[role="dialog"]')?.getAttribute('aria-hidden') !== 'true');
        expect(visible.length).toBe(0);
      });
      // Did not switch mode
      expect(setCurrentModeIndex).not.toHaveBeenCalled();
    });
  });

  describe('dirty dialog — No (discard)', () => {
    it('discards changes and switches mode when No is clicked', async () => {
      const modes = [
        makeMode({ modeName: 'default' }),
        makeMode({ modeName: 'readOnly' }),
      ];
      const { setHasUnsavedChanges } = renderTabsAccess({ modes });

      act(() => { jest.advanceTimersByTime(600); });

      // Make dirty
      fireEvent.click(screen.getByTestId('change-scripts'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Try to switch mode
      fireEvent.click(screen.getByText('default'));
      fireEvent.click(await screen.findByText('readOnly'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click No (discard)
      fireEvent.click(screen.getByText('No'));

      // Dialog dismissed (MUI keeps closed dialogs in DOM)
      await waitFor(() => {
        const dialogs = screen.queryAllByText('Unsaved Changes');
        const visible = dialogs.filter((el) => el.closest('[role="dialog"]')?.getAttribute('aria-hidden') !== 'true');
        expect(visible.length).toBe(0);
      });
      // Dirty cleared
      expect(setHasUnsavedChanges).toHaveBeenCalledWith(false);
    });
  });

  describe('dirty dialog — Yes (save)', () => {
    it('saves and switches mode when Yes is clicked', async () => {
      const modes = [
        makeMode({ modeName: 'default' }),
        makeMode({ modeName: 'readOnly' }),
      ];
      const { setHasUnsavedChanges, saveRef } = renderTabsAccess({ modes });

      act(() => { jest.advanceTimersByTime(600); });

      // Make dirty
      fireEvent.click(screen.getByTestId('change-scripts'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Try to switch mode
      fireEvent.click(screen.getByText('default'));
      fireEvent.click(await screen.findByText('readOnly'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Click Yes (save)
      await act(async () => {
        fireEvent.click(screen.getByText('Yes'));
      });

      // Save action was dispatched (saveRef.current gets overwritten by the component,
      // so we verify the Redux action was called instead)
      const { updateFormMode } = jest.requireMock('../../store/databases/action');
      expect(updateFormMode).toHaveBeenCalled();
      // Dialog dismissed (MUI keeps closed dialogs in DOM)
      await waitFor(() => {
        const dialogs = screen.queryAllByText('Unsaved Changes');
        const visible = dialogs.filter((el) => el.closest('[role="dialog"]')?.getAttribute('aria-hidden') !== 'true');
        expect(visible.length).toBe(0);
      });
    });
  });

  describe('clone mode while dirty', () => {
    it('shows dirty dialog when Clone Mode is clicked while dirty', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      act(() => { jest.advanceTimersByTime(600); });

      // Make dirty
      fireEvent.click(screen.getByTestId('change-scripts'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Click Clone Mode
      fireEvent.click(screen.getByText('Clone Mode'));

      // Should show unsaved changes dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });

  describe('add mode while dirty', () => {
    it('shows dirty dialog when Add Mode is clicked while dirty', async () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      act(() => { jest.advanceTimersByTime(600); });

      // Make dirty
      fireEvent.click(screen.getByTestId('change-scripts'));
      await waitFor(() => {
        expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Click Add Mode
      fireEvent.click(screen.getByText('Add Mode'));

      // Should show unsaved changes dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });
  });
});
