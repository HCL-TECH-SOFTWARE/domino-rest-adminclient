/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import '../../src/components/keep-elements/keep-access-mode';
import '../../src/components/keep-elements/keep-access-tabs';
import '../../src/components/keep-elements/keep-activate-menu';
import '../../src/components/keep-elements/keep-activate-switch';
import '../../src/components/keep-elements/keep-add-import-dialog';
import '../../src/components/keep-elements/keep-add-mode-dialog';
import '../../src/components/keep-elements/keep-agents-tab';
import '../../src/components/keep-elements/keep-agents-table';
import '../../src/components/keep-elements/keep-alert';
import '../../src/components/keep-elements/keep-api-error-dialog';
import '../../src/components/keep-elements/keep-app-filter';
import '../../src/components/keep-elements/keep-app-form';
import '../../src/components/keep-elements/keep-app-icon';
import '../../src/components/keep-elements/keep-app-shell';
import '../../src/components/keep-elements/keep-app-status';
import '../../src/components/keep-elements/keep-app';
import '../../src/components/keep-elements/keep-applications';
import '../../src/components/keep-elements/keep-apps-table';
import '../../src/components/keep-elements/keep-autocomplete';
import '../../src/components/keep-elements/keep-breadcrumb-router';
import '../../src/components/keep-elements/keep-button';
import '../../src/components/keep-elements/keep-callback-page';
import '../../src/components/keep-elements/keep-card-view-options';
import '../../src/components/keep-elements/keep-checkbox';
import '../../src/components/keep-elements/keep-column-details';
import '../../src/components/keep-elements/keep-confirm-delete-dialog';
import '../../src/components/keep-elements/keep-consent-filter';
import '../../src/components/keep-elements/keep-consents-container';
import '../../src/components/keep-elements/keep-consents-table';
import '../../src/components/keep-elements/keep-consents';
import '../../src/components/keep-elements/keep-data-table';
import '../../src/components/keep-elements/keep-database-search';
import '../../src/components/keep-elements/keep-default-card';
import '../../src/components/keep-elements/keep-delete-dialog';
import '../../src/components/keep-elements/keep-details-section';
import '../../src/components/keep-elements/keep-dialog-actions';
import '../../src/components/keep-elements/keep-dialog-content';
import '../../src/components/keep-elements/keep-dialog-header';
import '../../src/components/keep-elements/keep-drawer';
import '../../src/components/keep-elements/keep-dropdown';
import '../../src/components/keep-elements/keep-edit-view';
import '../../src/components/keep-elements/keep-error-wrapper';
import '../../src/components/keep-elements/keep-field-container';
import '../../src/components/keep-elements/keep-field-list';
import '../../src/components/keep-elements/keep-file-contents-tree';
import '../../src/components/keep-elements/keep-filter-drawer';
import '../../src/components/keep-elements/keep-footer';
import '../../src/components/keep-elements/keep-form-dialog-header';
import '../../src/components/keep-elements/keep-forms-container';
import '../../src/components/keep-elements/keep-forms-tab';
import '../../src/components/keep-elements/keep-forms-table';
import '../../src/components/keep-elements/keep-homepage';
import '../../src/components/keep-elements/keep-icon-dropdown';
import '../../src/components/keep-elements/keep-input-date';
import '../../src/components/keep-elements/keep-login-page';
import '../../src/components/keep-elements/keep-mail';
import '../../src/components/keep-elements/keep-mobile-header';
import '../../src/components/keep-elements/keep-mode-compare';
import '../../src/components/keep-elements/keep-mode-fields';
import '../../src/components/keep-elements/keep-navigation-guard';
import '../../src/components/keep-elements/keep-network-error-dialog';
import '../../src/components/keep-elements/keep-notification';
import '../../src/components/keep-elements/keep-nsf-card';
import '../../src/components/keep-elements/keep-option-list';
import '../../src/components/keep-elements/keep-page-loading';
import '../../src/components/keep-elements/keep-page-routers';
import '../../src/components/keep-elements/keep-profile-menu-dialog';
import '../../src/components/keep-elements/keep-profile-menu';
import '../../src/components/keep-elements/keep-quick-config-drawer';
import '../../src/components/keep-elements/keep-quick-config-form';
import '../../src/components/keep-elements/keep-router-outlet';
import '../../src/components/keep-elements/keep-schema-contents-tree';
import '../../src/components/keep-elements/keep-schema-status';
import '../../src/components/keep-elements/keep-schemas-alphabetical-view';
import '../../src/components/keep-elements/keep-schemas-cards-view';
import '../../src/components/keep-elements/keep-schemas-default-view';
import '../../src/components/keep-elements/keep-schemas-list';
import '../../src/components/keep-elements/keep-schemas-multi-view';
import '../../src/components/keep-elements/keep-schemas-stacks-view';
import '../../src/components/keep-elements/keep-scope-form-container';
import '../../src/components/keep-elements/keep-scope-form';
import '../../src/components/keep-elements/keep-scopes-alphabetical-view';
import '../../src/components/keep-elements/keep-scopes-cards-view';
import '../../src/components/keep-elements/keep-scopes-default-view';
import '../../src/components/keep-elements/keep-scopes-list';
import '../../src/components/keep-elements/keep-scopes-multi-view';
import '../../src/components/keep-elements/keep-scopes-stacks-view';
import '../../src/components/keep-elements/keep-script-editor';
import '../../src/components/keep-elements/keep-search-input';
import '../../src/components/keep-elements/keep-side-nav';
import '../../src/components/keep-elements/keep-single-field';
import '../../src/components/keep-elements/keep-slim-database-card';
import '../../src/components/keep-elements/keep-source-header';
import '../../src/components/keep-elements/keep-source';
import '../../src/components/keep-elements/keep-switch';
import '../../src/components/keep-elements/keep-test-form';
import '../../src/components/keep-elements/keep-textform-array';
import '../../src/components/keep-elements/keep-textform';
import '../../src/components/keep-elements/keep-tip';
import '../../src/components/keep-elements/keep-tooltip';
import '../../src/components/keep-elements/keep-tree';
import '../../src/components/keep-elements/keep-unsaved-changes-dialog';
import '../../src/components/keep-elements/keep-views-tab';
import '../../src/components/keep-elements/keep-views-table';
import '../../src/components/keep-elements/keep-views';
import '../../src/components/keep-elements/keep-zero-results';

/**
 * What `a11y-smoke.test.ts` mounts, for #713.
 *
 * Every registered `keep-*` element is listed. Most carry no props: an element that renders
 * nothing interactive when bare gives axe nothing to object to, and passes honestly.
 *
 * A fixture is here only when mounting bare would flag **the test rather than the element**.
 * A `keep-button` with nothing slotted really has no accessible name; that is correct
 * behaviour for an empty component, not a defect. Each such entry says what it stands in for.
 *
 * ## Adding an element
 *
 * Nothing generates this list, so a new element is not covered until it is added — and a new
 * element with a nameless control shows up here as a **failure**, which is the point. If it
 * needs realistic props to render its controls, give it the smallest fixture that does so;
 * if the violation survives a realistic fixture, it is a real defect and belongs fixed in the
 * element.
 *
 * ## `keep-nsf-card` is verified in Chrome instead
 *
 * Its search field is labelled by a slotted, visually hidden `<span slot="label">`, and
 * **jsdom scores that wrong**. Web Awesome samples its label slot with a slot controller;
 * under jsdom the controller never sees Lit's late-arriving slot content, so it renders the
 * inner `<label>` with `aria-hidden="true"` and axe reports a field with no name.
 *
 * Chrome disagrees, and Chrome is the authority. Its own accessibility tree answers
 * `{ role: 'textbox', name: 'Search schemas in demo.nsf' }`, and the rendered `<label>`
 * carries `aria-hidden="false"` with a 0px-high box — named, not shown, which is the intent.
 * Scanning it here would mean either a permanent false failure or weakening the rule set for
 * every other element, so it is excluded and its evidence lives in the pull request.
 *
 * ## Three elements are absent
 *
 * `keep-app-item`, `keep-consent-item` and `keep-monaco-editor` cannot be mounted bare —
 * the first two dereference a required record during their first render, and the third needs
 * a canvas jsdom does not have. The first two are covered inside their own element suites,
 * which mount them the way their parents do; Monaco's editor surface is a third-party canvas
 * widget and is out of scope for a jsdom scan either way.
 */
/**
 * Seeding the store, for the four tables that read their rows from it.
 *
 * Their header rows are the thing under test — five tables have a column of controls whose
 * `<th>` was empty (#713) — and a table with no rows renders `keep-zero-results` instead of a
 * `<table>`, so an unseeded fixture would pass by never rendering the markup it is meant to
 * check. That is not hypothetical: it is how the first version of this file scored the
 * `keep-apps-table` fix as covered when nothing was looking at it.
 */
import { store } from '../../src/store/store';

export interface ElementFixture {
  tag: string;
  props?: Record<string, unknown>;
  /** Slotted text, for the controls that take their name from their content. */
  text?: string;
  /** Run before mounting — for the elements whose content comes from the store. */
  setup?: () => void;
}

const seedApps = () => {
  store.dispatch({
    type: 'apps/getApps',
    payload: [{ appId: 'app-1', appName: 'Storefront', appStatus: true, appScope: '$DATA' }],
  });
};

const seedConsents = () => {
  seedApps();
  store.dispatch({
    type: 'consents/setConsents',
    payload: [
      {
        unid: 'u1',
        client_id: 'app-1',
        username: 'CN=Ann/O=Demo',
        scope: '$DATA',
        redirect_uri: 'https://example.test/cb',
        code_expires_at: '2030-01-01T00:00:00Z',
        refresh_token_expires_at: '2030-02-01T00:00:00Z',
      },
    ],
  });
};

export const ELEMENT_FIXTURES: ElementFixture[] = [
{ tag: 'keep-access-mode' },
  { tag: 'keep-access-tabs' },
  { tag: 'keep-activate-menu' },
  { tag: 'keep-activate-switch' },
  { tag: 'keep-add-import-dialog' },
  { tag: 'keep-add-mode-dialog' },
  { tag: 'keep-agents-tab' },
  { tag: 'keep-agents-table' },
  { tag: 'keep-alert' },
  { tag: 'keep-api-error-dialog' },
  { tag: 'keep-app-filter' },
  { tag: 'keep-app-form' },
  { tag: 'keep-app-icon' },
  { tag: 'keep-app-shell' },
  { tag: 'keep-app-status' },
  { tag: 'keep-app' },
  { tag: 'keep-applications' },
  { tag: 'keep-apps-table', setup: seedApps },
  { tag: 'keep-autocomplete', props: { label: 'Owner', options: ['Ann', 'Bob'], selectedOption: 'Ann' } }, // selectedOption makes the clear button render too
  { tag: 'keep-breadcrumb-router' },
  { tag: 'keep-button', text: 'Save' }, // a button is named by what is slotted into it
  { tag: 'keep-callback-page' },
  { tag: 'keep-card-view-options' },
  { tag: 'keep-checkbox', text: 'Active' }, // labelled by slot, like wa-checkbox
  { tag: 'keep-column-details', props: { columns: [{ name: 'a', title: 'A' }] } },
  { tag: 'keep-confirm-delete-dialog' },
  { tag: 'keep-consent-filter' },
  { tag: 'keep-consents-container' },
  { tag: 'keep-consents-table', setup: seedConsents },
  { tag: 'keep-consents' },
  { tag: 'keep-data-table' },
  { tag: 'keep-database-search' },
  { tag: 'keep-default-card' },
  { tag: 'keep-delete-dialog' },
  { tag: 'keep-details-section' },
  { tag: 'keep-dialog-actions' },
  { tag: 'keep-dialog-content' },
  { tag: 'keep-dialog-header' },
  { tag: 'keep-drawer' },
  // firstUpdated() names the trigger from choices[0]; with no choices there is nothing to name.
  { tag: 'keep-dropdown', props: { choices: ['Okta', 'Entra'] } },
  { tag: 'keep-edit-view' },
  { tag: 'keep-error-wrapper' },
  { tag: 'keep-field-container' },
  { tag: 'keep-field-list' },
  { tag: 'keep-file-contents-tree' },
  { tag: 'keep-filter-drawer' },
  { tag: 'keep-footer' },
  { tag: 'keep-form-dialog-header', props: { heading: 'Edit Schema' } }, // the heading is the h2's text
  { tag: 'keep-forms-container' },
  { tag: 'keep-forms-tab' },
  { tag: 'keep-forms-table', props: { formList: ['Customer'] } },
  { tag: 'keep-homepage' },
  { tag: 'keep-icon-dropdown' },
  { tag: 'keep-input-date', props: { label: 'Expires' } },
  { tag: 'keep-login-page' },
  { tag: 'keep-mail' },
  { tag: 'keep-mobile-header' },
  { tag: 'keep-mode-compare' },
  { tag: 'keep-mode-fields' },
  { tag: 'keep-navigation-guard' },
  { tag: 'keep-network-error-dialog' },
  { tag: 'keep-notification' },
  { tag: 'keep-option-list' },
  { tag: 'keep-page-loading' },
  { tag: 'keep-page-routers' },
  { tag: 'keep-profile-menu-dialog' },
  { tag: 'keep-profile-menu' },
  { tag: 'keep-quick-config-drawer' },
  { tag: 'keep-quick-config-form' },
  { tag: 'keep-router-outlet' },
  { tag: 'keep-schema-contents-tree' },
  { tag: 'keep-schema-status' },
  { tag: 'keep-schemas-alphabetical-view' },
  { tag: 'keep-schemas-cards-view' },
  { tag: 'keep-schemas-default-view' },
  { tag: 'keep-schemas-list' },
  { tag: 'keep-schemas-multi-view' },
  { tag: 'keep-schemas-stacks-view' },
  { tag: 'keep-scope-form-container' },
  { tag: 'keep-scope-form' },
  { tag: 'keep-scopes-alphabetical-view' },
  { tag: 'keep-scopes-cards-view' },
  { tag: 'keep-scopes-default-view' },
  { tag: 'keep-scopes-list' },
  { tag: 'keep-scopes-multi-view' },
  { tag: 'keep-scopes-stacks-view' },
  { tag: 'keep-script-editor' },
  { tag: 'keep-search-input', props: { label: 'Search', placeholder: 'Search schemas' } },
  { tag: 'keep-side-nav' },
  { tag: 'keep-single-field' },
  { tag: 'keep-slim-database-card', props: { database: { title: 'Demo', nsfPath: 'demo/x.nsf', apiName: 'demo' } } },
  { tag: 'keep-source', props: { schemaData: { forms: [], views: [], agents: [] } } },
  { tag: 'keep-source-tree' },
  { tag: 'keep-switch', text: 'DQL Access' }, // labelled by slot
  { tag: 'keep-test-form' },
  { tag: 'keep-textform-array' },
  { tag: 'keep-textform' },
  { tag: 'keep-tip', props: { heading: 'Tip', text: 'Some tip', link: 'https://example.test' } },
  { tag: 'keep-tooltip' },
  { tag: 'keep-tree' },
  { tag: 'keep-unsaved-changes-dialog' },
  { tag: 'keep-views-tab' },
  { tag: 'keep-views-table' },
  { tag: 'keep-views' },
  { tag: 'keep-zero-results' },
];
