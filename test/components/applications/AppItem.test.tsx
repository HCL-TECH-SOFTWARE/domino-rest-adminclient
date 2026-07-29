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
import { toggleAlert } from '../../../src/store/alerts/action';

vi.mock('../../../src/store/applications/action', () => ({
  generateSecret: vi.fn(() => ({ type: 'GENERATE_SECRET' })),
}));
vi.mock('../../../src/store/drawer/action', () => ({
  toggleApplicationDrawer: vi.fn(() => ({ type: 'TOGGLE_APP_DRAWER' })),
}));
vi.mock('../../../src/store/alerts/action', () => ({
  toggleAlert: vi.fn(() => ({ type: 'TOGGLE_ALERT' })),
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

/**
 * The `<span>` inside the `KeepTooltip` whose copy is `content`.
 *
 * The copy-to-clipboard triggers (App ID, App Secret) are plain `<span onClick=…>`s, not
 * buttons — `tooltipButton` above deliberately throws if it finds no `<button>`, so it
 * cannot be reused here. Same lookup-by-tooltip-copy strategy, different projected tag.
 */
function tooltipSpan(content: string): HTMLSpanElement {
  const host = deepQueryAll('keep-tooltip').find(
    (t) => (t as unknown as { content?: string }).content === content,
  );
  if (!host) {
    const seen = tooltipCopy().join(', ');
    throw new Error(`No keep-tooltip with content "${content}". Seen: [${seen}]`);
  }
  const span = host.querySelector('span');
  if (!span) throw new Error(`keep-tooltip "${content}" wraps no span`);
  return span as HTMLSpanElement;
}

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
    try {
      renderAppItem();
      fireEvent.click(tooltipButton('Launch Timesheets'));
      expect(open).toHaveBeenCalledWith('https://example.test/start');
    } finally {
      // try/finally so a failed assertion above still restores window.open instead of
      // leaking a stub into every later test in this file.
      open.mockRestore();
    }
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

describe('AppItem — copy to clipboard', () => {
  it('writes to the Clipboard API and reports success when it is available', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
    try {
      renderAppItem();
      fireEvent.click(tooltipSpan('Copy App Id'));
      // jsdom implements neither a Clipboard API (stubbed above) nor `innerText` (not
      // stubbed — and must not be, per the brief). `copyToClipboard` (AppItem.tsx:164-172)
      // reads `currentTarget.innerText`, which jsdom always answers `undefined`, so the
      // "copied" value comes out `undefined` rather than the app id. This is jsdom's
      // actual behaviour, not a defect to polyfill around.
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(undefined);
      expect(toggleAlert).toHaveBeenCalledWith('Copied undefined to clipboard');
    } finally {
      // Mirrors the window.open try/finally above: restore jsdom's default (no Clipboard
      // API) so this stub cannot leak into the next test regardless of pass/fail.
      delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    }
  });

  it('reports a failed copy when the Clipboard API is unavailable', () => {
    const original = (navigator as unknown as { clipboard?: unknown }).clipboard;
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    try {
      // Confirms the fixture this test relies on — jsdom's real default, not an assumption.
      expect(navigator.clipboard).toBeUndefined();
      renderAppItem();
      fireEvent.click(tooltipSpan('Copy App Id'));
      // Trailing space before the closing backtick in AppItem.tsx:170 is in the source —
      // pinned verbatim, not a typo introduced here.
      expect(toggleAlert).toHaveBeenCalledWith(
        'Failed to copy to clipboard. Please copy by yourself: undefined ',
      );
    } finally {
      if (original !== undefined) {
        Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true });
      }
    }
  });
});

describe('AppItem — the visible-secret branch', () => {
  it('BUG: an already-generated secret renders as empty text, not the app.appSecret prop', () => {
    renderAppItem(makeApp({ appSecret: 'sekrit-value' }));
    // Rule out the sibling branches first: appHasSecret is false and usePkce is false, so
    // neither the generate-prompt nor the masked-with-refresh branch should render.
    expect(screen.queryByText('Click to Generate Secret')).not.toBeInTheDocument();
    expect(screen.queryByText('********************')).not.toBeInTheDocument();
    expect(tooltipCopy()).toContain('Copy Application Secret');
    // BUG (AppItem.tsx:300-312): the condition guarding this branch is
    // `app.appSecret?.length > 0`, but what it renders is `{appSecret}` — the
    // component-local `useState('')`, never seeded from the `app.appSecret` prop. So a
    // secret the API actually returned renders as an empty tooltip-wrapped span instead
    // of its value. Pinning the observed (buggy) behaviour: the prop's text is absent,
    // and the rendered span is empty.
    expect(screen.queryByText('sekrit-value')).not.toBeInTheDocument();
    expect(tooltipSpan('Copy Application Secret').textContent).toBe('');
  });

  it('the click-to-generate transition flips the row into that same empty, unmasked branch', () => {
    renderAppItem();
    fireEvent.click(screen.getByText('Click to Generate Secret'));
    // AppItem.tsx:134-141: handleClickGenerate calls setHasAppSecret(true)
    // unconditionally, regardless of its `newSecret` argument or whether a secret was
    // actually produced (generateSecret is mocked here and never calls the real
    // setAppSecret setter). So the click alone — not a resolved dispatch — flips the row
    // straight from "offer to generate" into the branch characterized as buggy above:
    // present, but showing empty text instead of a secret.
    expect(screen.queryByText('Click to Generate Secret')).not.toBeInTheDocument();
    expect(screen.queryByText('********************')).not.toBeInTheDocument();
    expect(tooltipCopy()).toContain('Copy Application Secret');
    expect(tooltipSpan('Copy Application Secret').textContent).toBe('');
  });
});
