/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import TabsAccess from '../../../src/components/access/TabsAccess';
import * as databasesActions from '../../../src/store/databases/action';

// ---- Mocks ----

vi.mock('../../../src/components/applications/FormDrawer', () => ({
  default: function MockFormDrawer() {
    return <div data-testid="form-drawer" />;
  },
}));

vi.mock('../../../src/store/databases/action', () => ({
  testFormula: vi.fn(() => () => Promise.resolve()),
  updateFormMode: vi.fn(() => () => Promise.resolve()),
  deleteFormMode: vi.fn(() => () => Promise.resolve()),
  updateSchema: vi.fn(() => () => Promise.resolve()),
}));

vi.mock('../../../src/store/drawer/action', () => ({
  toggleApplicationDrawer: vi.fn(() => ({ type: 'NOOP' })),
}));

vi.mock('../../../src/store/dialog/action', () => ({
  toggleDeleteDialog: vi.fn(() => ({ type: 'NOOP' })),
}));

vi.mock('../../../src/store/alerts/action', () => ({
  toggleAlert: vi.fn(() => ({ type: 'NOOP' })),
}));

/**
 * #806 turned three of this file's dialogs into custom elements, so they now arrive through
 * the `KeepElements` bridge rather than their own modules. Only those exports are replaced —
 * spreading the original keeps every other `Keep*` wrapper this file renders real. These tests
 * are about TabsAccess's behaviour, so plain divs are still the right stand-ins.
 *
 * `KeepModeFields` joined them when `access/FieldDndContainer.tsx` became `keep-mode-fields`:
 * the stand-in moved from its own `vi.mock` of that module into this map. It renders the same
 * six buttons and carries the same six edits, reshaped from callback props into the element's
 * events — which is the only difference the conversion makes to this file.
 */
vi.mock('../../../src/components/keep-elements/KeepElements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/components/keep-elements/KeepElements')>()),
  KeepModeFields: function MockModeFields(props: any) {
    return (
      <div data-testid="field-dnd">
        <button
          data-testid="change-scripts"
          onClick={() =>
            props.onScriptsChange({
              detail: {
                scripts: { ...props.scripts, computeWithForm: !props.scripts.computeWithForm },
              },
            })
          }
        >
          Toggle computeWithForm
        </button>
        <button
          data-testid="revert-scripts"
          onClick={() => props.onScriptsChange({ detail: { scripts: { ...props.scripts } } })}
        >
          Revert Scripts
        </button>
        <button
          data-testid="change-required"
          onClick={() =>
            props.onRequiredChange({ detail: { required: [...(props.required || []), 'NewField'] } })
          }
        >
          Add Required
        </button>
        <button
          data-testid="revert-required"
          onClick={() =>
            props.onRequiredChange({
              detail: { required: props.required?.filter((r: string) => r !== 'NewField') || [] },
            })
          }
        >
          Revert Required
        </button>
        <button
          data-testid="change-validation"
          onClick={() =>
            props.onValidationRulesChange({
              detail: { rules: { ...props.validationRules, test: 'rule' } },
            })
          }
        >
          Add Validation
        </button>
        <button
          data-testid="revert-validation"
          onClick={() => {
            const { test: _, ...rest } = props.validationRules || {};
            props.onValidationRulesChange({ detail: { rules: rest } });
          }}
        >
          Revert Validation
        </button>
      </div>
    );
  },
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
  KeepAddModeDialog: function MockAddModeDialog() {
    return <div data-testid="add-mode-dialog" />;
  },
  KeepConfirmDeleteDialog: function MockConfirmDeleteDialog() {
    return <div data-testid="delete-dialog" />;
  },
}));

vi.mock('../../../src/store/databases/scripts', () => ({
  findScopeBySchema: vi.fn(() => -1),
}));

vi.mock('../../../src/utils/form', () => ({
  isEmptyOrSpaces: vi.fn((s: string) => !s || s.trim().length === 0),
  verifyModeName: vi.fn(() => true),
}));

vi.mock('../../../src/store/styles/action', () => ({
  getTheme: vi.fn(() => ({
    textColorPrimary: '#000',
    borderColor: '#ccc',
    hoverColor: '#eee',
  })),
}));

// ---- Helpers ----

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

  const setHasUnsavedChanges = vi.fn();
  const setPageIndex = vi.fn();
  const setCurrentModeIndex = vi.fn();
  const saveRef = { current: vi.fn(() => Promise.resolve()) };
  const postSaveActionRef = { current: null as 'add' | 'clone' | null };

  const utils = renderWithProviders(
    <TabsAccess
      state={state}
      width={100}
      modes={modes}
      top={0}
      currentModeIndex={currentModeIndex}
      setPageIndex={setPageIndex}
      setCurrentModeIndex={setCurrentModeIndex}
      remove={vi.fn()}
      update={vi.fn()}
      addField={vi.fn(() => '')}
      schemaData={makeSchemaData()}
      setSchemaData={vi.fn()}
      fieldIndex={0}
      setFieldIndex={vi.fn()}
      setHasUnsavedChanges={setHasUnsavedChanges}
      saveRef={saveRef}
      postSaveActionRef={postSaveActionRef}
    />,
    {
      route: '/schema/test.nsf/testschema/TestForm',
      preloadedState: { databases: { scopes: [], newForm: { enabled: false } } },
    },
  );

  return {
    ...utils,
    setHasUnsavedChanges,
    setPageIndex,
    setCurrentModeIndex,
    saveRef,
    postSaveActionRef,
  };
}

// ---- Tests ----

describe('TabsAccess — Form Schema dirty tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // React Testing Library's `waitFor` only auto-advances timers when it
    // detects a global `jest` (it checks `typeof jest !== 'undefined'` and then
    // whether the faked `setTimeout` carries a `clock` marker — which Vitest's
    // fake timers do). Without this shim, `waitFor` sits on a frozen fake clock
    // and hangs. Exposing `jest.advanceTimersByTime` reproduces the exact
    // fake-timer polling behaviour these tests relied on under Jest.
    (globalThis as any).jest = {
      advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (globalThis as any).jest;
    vi.useRealTimers();
  });

  describe('initial state (no user edits)', () => {
    it('does not mark dirty on mount', () => {
      const { setHasUnsavedChanges } = renderTabsAccess();

      // Advance past the pauseDirtyTracking delay
      act(() => { vi.advanceTimersByTime(600); });

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
      act(() => { vi.advanceTimersByTime(600); });
      setHasUnsavedChanges.mockClear();

      // Toggle computeWithForm via the mocked KeepModeFields
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
      act(() => { vi.advanceTimersByTime(600); });
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

      act(() => { vi.advanceTimersByTime(600); });
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

      act(() => { vi.advanceTimersByTime(600); });
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

      act(() => { vi.advanceTimersByTime(600); });
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

      act(() => { vi.advanceTimersByTime(600); });
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

      act(() => { vi.advanceTimersByTime(600); });
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

      act(() => { vi.advanceTimersByTime(600); });

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

      act(() => { vi.advanceTimersByTime(600); });

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

      act(() => { vi.advanceTimersByTime(600); });

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
      const { setHasUnsavedChanges } = renderTabsAccess({ modes });

      act(() => { vi.advanceTimersByTime(600); });

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
      const { updateFormMode } = databasesActions;
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

      act(() => { vi.advanceTimersByTime(600); });

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

      act(() => { vi.advanceTimersByTime(600); });

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
