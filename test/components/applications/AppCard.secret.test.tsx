/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import AppCard from '../../../src/components/applications/kanban/AppCard';
import { AppFormContext } from '../../../src/components/applications/ApplicationContext';
import { generateSecret } from '../../../src/store/applications/action';
import type { AppProp } from '../../../src/store/applications/types';

/**
 * #740 — the kanban card must not overwrite a live application secret unasked.
 *
 * The secret endpoint is called with `force=true`: it replaces any existing secret
 * unconditionally, every integration still holding the old one breaks at its next call,
 * and the previous value cannot be recovered. The table view (`AppItem`) has confirmed
 * this since it was written. The kanban card regenerated on a single click, through its
 * own copy of the request that bypassed the thunk entirely.
 *
 * So the assertion that matters is the negative one: clicking generate on an app that
 * *has* a secret dispatches nothing until the user says yes.
 */

vi.mock('../../../src/store/applications/action', () => ({
  generateSecret: vi.fn(() => ({ type: 'NOOP' })),
}));

const app = (overrides: Partial<AppProp> = {}): AppProp => ({
  appName: 'Test App',
  appDescription: 'a description',
  appCallbackUrls: [],
  appContacts: [],
  appIcon: 'app',
  appId: 'app-1',
  appScope: '',
  appHasSecret: false,
  appSecret: '',
  appStartPage: 'https://example.invalid',
  appStatus: 'isActive',
  usePkce: false,
  ...overrides,
});

const renderCard = (item: AppProp) =>
  renderWithProviders(
    <AppFormContext.Provider value={[{}, vi.fn()]}>
      <AppCard item={item} deleteApplication={vi.fn()} formik={{} as any} />
    </AppFormContext.Provider>,
  );

/** The regenerate control is an icon, not a labelled button. */
const generateControl = () => document.querySelector('.generate') as Element;

const confirmDialog = () => document.querySelector('.regen-app-secret-dialog');

describe('AppCard application secret (#740)', () => {
  beforeEach(() => vi.mocked(generateSecret).mockClear());

  it('regenerates immediately when there is no secret to destroy', () => {
    renderCard(app({ appHasSecret: false }));

    fireEvent.click(generateControl());

    expect(generateSecret).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateSecret).mock.calls[0].slice(0, 2)).toEqual(['app-1', 'isActive']);
  });

  it('does not regenerate an existing secret on the first click', () => {
    renderCard(app({ appHasSecret: true }));

    fireEvent.click(generateControl());

    // The whole point of the issue.
    expect(generateSecret).not.toHaveBeenCalled();
    expect(confirmDialog()).toBeTruthy();
  });

  it('regenerates once the warning is accepted', () => {
    renderCard(app({ appHasSecret: true }));

    fireEvent.click(generateControl());
    expect(generateSecret).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Yes'));

    expect(generateSecret).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateSecret).mock.calls[0].slice(0, 2)).toEqual(['app-1', 'isActive']);
  });

  it('leaves the secret alone when the warning is declined', () => {
    renderCard(app({ appHasSecret: true }));

    fireEvent.click(generateControl());
    fireEvent.click(screen.getByText('No'));

    expect(generateSecret).not.toHaveBeenCalled();
  });

  it('names the consequence in the warning', () => {
    renderCard(app({ appHasSecret: true }));
    fireEvent.click(generateControl());

    // A confirmation that does not say what is lost is not a confirmation.
    expect(confirmDialog()?.textContent).toMatch(/may break existing applications/i);
  });
});
