/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import AccessMode from '../../../src/components/access/AccessMode';

/**
 * #928 — the Access Mode screen blank-screened on direct navigation or F5.
 *
 * Every case below is a *cold load*: the route reached without the schema's Forms tab
 * having run first. That tab is a sibling route, not a parent, so nothing it fetched is in
 * the store, and the screen was reading four optional shapes without guards:
 *
 *  - `nsfDesigns[nsfPath]` — absent, so `currentDesign?.forms` was `undefined` and
 *    `fetchFieldsArray.length` threw in the render body.
 *  - the form list — the mode seed tested whether the *list* had entries and then read
 *    `formModes` off `filter(…)[0]`, which is `undefined` when nothing matches.
 *  - the matched form — it can arrive with `formAccessModes` and no `formModes` key.
 *  - the mode named `default` — `findIndex(…) || 0` keeps -1, because -1 is truthy.
 *
 * There is no error boundary above this route, so any one of them blanked the whole app.
 * The last test is the one that keeps the others honest: returning an empty list
 * unconditionally would satisfy every "does not blank-screen" assertion.
 */

/** The schema `fetchSchema` hands back. Reassigned per test, read inside the mock. */
const fixture = vi.hoisted(() => ({ schema: { forms: [] as any[] } }));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  // Synchronous, so the "schema has arrived" render is the one under test rather than
  // something a test has to wait for.
  fetchSchema: (_nsfPath: string, _dbName: string, setSchemaData: (data: any) => void) => {
    setSchemaData(fixture.schema);
    return { type: 'NOOP' };
  },
  setLoadedFields: () => ({ type: 'NOOP' }),
  addActiveFields: () => ({ type: 'NOOP' }),
  cacheFormFields: () => ({ type: 'NOOP' }),
  // The field palette is a custom element that reads the module-singleton store rather than
  // this suite's, so it finds no design list and asks the server for one. Stubbed to keep a
  // failed fetch out of the output; what it fetches is `keep-field-list`'s own test.
  fetchFields: () => ({ type: 'NOOP' }),
  getAllFieldsByNsf: () => ({ type: 'NOOP' }),
}));

vi.mock('../../../src/components/access/TabsAccess', () => ({
  default: () => <div data-testid="tabs-access" />,
}));

const ROUTE = '/schema/nsf%2Fdemo.nsf/demo/Contact/access';

/** The design list the Forms tab would have put in the store. */
const design = { forms: [{ '@name': 'Contact' }], subforms: [] };

const mode = (modeName: string) => ({
  modeName,
  fields: [{ name: 'FirstName' }],
  computeWithForm: false,
});

/** Both panels are custom elements now, so they are found by tag rather than by testid. */
const modeCompare = (container: HTMLElement) => container.querySelector('keep-mode-compare');
const fieldList = (container: HTMLElement) => container.querySelector('keep-field-list');

const renderScreen = (state: Record<string, unknown> = {}) =>
  renderWithProviders(<AccessMode />, {
    route: ROUTE,
    preloadedState: {
      accessMode: { fields: { column: [] } },
      dialog: { loading: false },
      databases: {
        nsfDesigns: {},
        loadedFields: [],
        activeFields: [],
        newForm: { enabled: false },
        ...(state.databases as object | undefined),
      },
      ...state,
    },
  });

describe('AccessMode', () => {
  beforeEach(() => {
    fixture.schema = { forms: [] };
  });

  it('renders a loading state when the NSF design has never been fetched', () => {
    // The cold-start path itself: `nsfDesigns` is empty, so `currentDesign?.forms` is
    // undefined and the render body's `fetchFieldsArray.length` used to throw.
    const { container } = renderScreen();
    expect(container.querySelector('keep-page-loading')).toBeTruthy();
  });

  it('survives a pending new form that is not the one in the URL', () => {
    // `filter(…)[0]` is undefined here, and the old seed read `.formModes` off it.
    const { container } = renderScreen({
      databases: {
        nsfDesigns: {},
        loadedFields: [],
        activeFields: [],
        newForm: { enabled: true, form: { formName: 'Invoice', formModes: [mode('default')] } },
      },
    });
    expect(container.querySelector('keep-page-loading')).toBeTruthy();
  });

  it('survives a form that carries formAccessModes and no formModes key', () => {
    // `formModes` is a client-side normalisation the Forms tab applies; the schema this
    // screen fetches for itself does not always have it. The old seed stored `undefined`.
    fixture.schema = { forms: [{ formName: 'Contact', formAccessModes: [mode('default')] }] };
    const { container } = renderScreen({
      databases: {
        nsfDesigns: { 'nsf/demo.nsf': design },
        loadedFields: [],
        activeFields: [],
        newForm: { enabled: false },
      },
    });
    expect(fieldList(container)).toBeTruthy();
    expect(modeCompare(container)).toBeNull();
  });

  it('survives a schema that does not contain the form in the URL', () => {
    fixture.schema = { forms: [{ formName: 'Invoice', formModes: [mode('default')] }] };
    const { container } = renderScreen({
      databases: {
        nsfDesigns: { 'nsf/demo.nsf': design },
        loadedFields: [],
        activeFields: [],
        newForm: { enabled: false },
      },
    });
    expect(fieldList(container)).toBeTruthy();
    expect(modeCompare(container)).toBeNull();
  });

  it('survives a form whose modes do not include one named default', () => {
    // `findIndex(…) || 0` kept -1, so `allModes[-1].fields` threw for any form whose
    // default mode had been renamed or removed.
    fixture.schema = { forms: [{ formName: 'Contact', formModes: [mode('draft')] }] };
    const { container } = renderScreen({
      databases: {
        nsfDesigns: { 'nsf/demo.nsf': design },
        loadedFields: [],
        activeFields: [],
        newForm: { enabled: false },
      },
    });
    expect(modeCompare(container)).toBeTruthy();
  });

  it('still finds the modes when the schema does contain the form', () => {
    // The counterweight: an unconditional empty list would pass every test above.
    fixture.schema = {
      forms: [{ formName: 'Contact', formModes: [mode('default'), mode('draft')] }],
    };
    const { container } = renderScreen({
      databases: {
        nsfDesigns: { 'nsf/demo.nsf': design },
        loadedFields: [],
        activeFields: [],
        newForm: { enabled: false },
      },
    });
    // Rendered only when `allModes.length > 0`, so its presence is the assertion.
    expect(modeCompare(container)).toBeTruthy();
    expect(screen.getByTestId('tabs-access')).toBeInTheDocument();
  });
});
