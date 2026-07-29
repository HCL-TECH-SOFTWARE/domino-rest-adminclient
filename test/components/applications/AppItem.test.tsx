/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { deepQueryAll } from '../../test-utils/shadow';
import AppItem from '../../../src/components/applications/AppItem';
import { generateSecret } from '../../../src/store/applications/action';
import { toggleApplicationDrawer } from '../../../src/store/drawer/action';

vi.mock('../../../src/store/applications/action', () => ({
  generateSecret: vi.fn(() => ({ type: 'GENERATE_SECRET' })),
}));
vi.mock('../../../src/store/drawer/action', () => ({
  toggleApplicationDrawer: vi.fn(() => ({ type: 'TOGGLE_APP_DRAWER' })),
}));
vi.mock('../../../src/components/commons/AppIcon', () => ({
  AppIcon: () => <span data-testid="app-icon" />,
  default: () => <span data-testid="app-icon" />,
}));

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    appName: 'Timesheets',
    appDescription: 'Track hours',
    appCallbackUrls: [],
    appContacts: [],
    appIcon: 'beach',
    appId: 'app-123',
    appScope: 'read',
    appHasSecret: false,
    appSecret: '',
    appStartPage: 'https://example.test/start',
    appStatus: 'isActive',
    usePkce: false,
    ...overrides,
  } as any;
}

/** AppItem renders <tr>s, so it needs a real table ancestor to nest correctly. */
function renderAppItem(app = makeApp()) {
  const deleteApplication = vi.fn();
  const formik = { setValues: vi.fn() } as any;
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  document.body.appendChild(table);
  renderWithProviders(
    <AppItem app={app} deleteApplication={deleteApplication} formik={formik} />,
    { container: tbody },
  );
  return { deleteApplication, formik };
}

/**
 * The `<button>` inside the `KeepTooltip` whose copy is `content`.
 *
 * `getByRole('button', { name: … })` cannot find these. `keep-tooltip` sets `role="tooltip"`
 * on its *own* popup in the shadow root and projects the trigger through a plain `<slot>`
 * — it never puts `aria-label` or `aria-describedby` on the slotted child. So an icon-only
 * button wrapped in a tooltip has **no accessible name at all**.
 *
 * Locating by the tooltip's copy beats indexing into cells: it is stable against layout
 * changes, it says what it means, and it pins the tooltip text as a side effect.
 */
function tooltipButton(content: string): HTMLButtonElement {
  const host = deepQueryAll('keep-tooltip').find(
    (t) => (t as unknown as { content?: string }).content === content,
  );
  if (!host) {
    const seen = deepQueryAll('keep-tooltip')
      .map((t) => (t as unknown as { content?: string }).content)
      .join(', ');
    throw new Error(`No keep-tooltip with content "${content}". Seen: [${seen}]`);
  }
  const button = host.querySelector('button');
  if (!button) throw new Error(`keep-tooltip "${content}" wraps no button`);
  return button;
}

/** Copy of every tooltip currently rendered — for absence assertions. */
const tooltipCopy = () =>
  deepQueryAll('keep-tooltip').map((t) => (t as unknown as { content?: string }).content);

describe('AppItem — layout', () => {
  it('renders five cells in the data row', () => {
    renderAppItem();
    const row = document.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.querySelectorAll('td')).toHaveLength(5);
  });

  it('shows the app name and description', () => {
    renderAppItem();
    expect(screen.getByText('Timesheets')).toBeInTheDocument();
    expect(screen.getByText('Track hours')).toBeInTheDocument();
  });

  it('shows the app id', () => {
    renderAppItem();
    expect(screen.getByText('app-123')).toBeInTheDocument();
  });
});

describe('AppItem — launching', () => {
  it('opens the start page for an active app', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderAppItem();
    fireEvent.click(tooltipButton('Launch Timesheets'));
    expect(open).toHaveBeenCalledWith('https://example.test/start');
    open.mockRestore();
  });

  it('offers no launch button for a disabled app', () => {
    renderAppItem(makeApp({ appStatus: 'disabled' }));
    expect(tooltipCopy()).not.toContain('Launch Timesheets');
    // The disabled app gets the inactive-marker tooltip instead — asserting that too keeps
    // this from passing merely because the row failed to render at all.
    expect(tooltipCopy()).toContain('This application is inactive.');
  });
});

describe('AppItem — secrets', () => {
  it('offers to generate a secret when the app has none', () => {
    renderAppItem();
    expect(screen.getByText('Click to Generate Secret')).toBeInTheDocument();
    // Rule out the other two branches, not just confirm this one: a fixture with
    // `appHasSecret: false, usePkce: false` should render neither the masked-secret
    // nor the PKCE marker.
    expect(screen.queryByText('********************')).not.toBeInTheDocument();
    expect(screen.queryByText('PKCE')).not.toBeInTheDocument();
  });

  it('generates the secret when asked', () => {
    renderAppItem();
    fireEvent.click(screen.getByText('Click to Generate Secret'));
    // Pin the arguments, not just that some dispatch happened: a call with the wrong
    // appId, the wrong appStatus, or with the two setter callbacks swapped would all
    // pass a bare `toHaveBeenCalled()`.
    expect(generateSecret).toHaveBeenCalledWith(
      'app-123',
      'isActive',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('masks an existing secret rather than showing it', () => {
    renderAppItem(makeApp({ appHasSecret: true }));
    expect(screen.getByText('********************')).toBeInTheDocument();
    expect(screen.queryByText('Click to Generate Secret')).not.toBeInTheDocument();
    expect(screen.queryByText('PKCE')).not.toBeInTheDocument();
  });

  it('shows PKCE instead of a secret when the app uses it', () => {
    renderAppItem(makeApp({ usePkce: true }));
    expect(screen.getByText('PKCE')).toBeInTheDocument();
    // The whole "App Secret:" block — label plus whichever of the three secret states —
    // lives behind the same `usePkce` ternary, so ruling out the label rules out both
    // the generate-prompt and masked-secret branches at once. Exact text, not a
    // substring regex: the component always renders a (closed) confirmation dialog
    // titled "Regenerate App Secret?", which a loose /App Secret/ match would also hit.
    expect(screen.queryByText('App Secret:')).not.toBeInTheDocument();
  });
});

describe('AppItem — actions', () => {
  it('loads the app into the form and opens the drawer on edit', () => {
    const { formik } = renderAppItem();
    fireEvent.click(tooltipButton('Edit Application'));
    expect(formik.setValues).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'app-123', appName: 'Timesheets', appStatus: true }),
    );
    // toggleApplicationDrawer takes no arguments in src/store/drawer/action.ts, so
    // `toHaveBeenCalled()` is already the strongest assertion available — there is no
    // argument to pin.
    expect(toggleApplicationDrawer).toHaveBeenCalled();
  });

  it('reports the app status as a boolean derived from isActive', () => {
    const { formik } = renderAppItem(makeApp({ appStatus: 'disabled' }));
    fireEvent.click(tooltipButton('Edit Application'));
    expect(formik.setValues).toHaveBeenCalledWith(expect.objectContaining({ appStatus: false }));
  });

  it('deletes by app id', () => {
    const { deleteApplication } = renderAppItem();
    fireEvent.click(tooltipButton('Delete Application'));
    expect(deleteApplication).toHaveBeenCalledWith('app-123');
  });
});
