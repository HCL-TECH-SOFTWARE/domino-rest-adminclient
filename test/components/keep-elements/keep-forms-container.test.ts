/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { INIT_STATE, type Database } from '../../../src/store/databases/types';
import {
  fetchAgents,
  fetchFolders,
  fetchViews,
  updateSchema,
} from '../../../src/store/databases/action';
import { Router, memoryHistory } from '../../../src/router/router';

/**
 * `keep-forms-container` — the conversion of `forms/FormsContainer.tsx`, the
 * `/schema/:nsfPath/:dbName` route and the last React frame on a screen whose every child
 * converted in wave 5.
 *
 * The React file had one test of its own, over `compareFormNames`; those five assertions are
 * carried over verbatim at the bottom of this file and the old file is deleted. Everything
 * above them is new cover for behaviour that shipped untested — which is most of the screen,
 * and all of the wiring the conversion had to get right:
 *
 *  - the two child contracts wave 5 established: `keep-forms-tab` gets the **raw** route param
 *    and reports a finished path back, and `keep-agents-tab` must be told its database.
 *  - the four `schema-change` sinks, which are four separate children feeding one field.
 *  - the tab strip, which is now `wa-tab-group` and renders only the showing panel's content.
 *  - the editor buffer, whose reset rules are three interlocking effects in the original.
 */

/*
 * jsdom implements neither observer, and `wa-tab-group` constructs all three on connect.
 * The intersection stub reports visible immediately, which is what makes the group activate
 * its first tab — the real one fires on the first paint, and without it no panel is ever
 * shown and every assertion below would be measuring an inert strip.
 */
beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!('IntersectionObserver' in globalThis)) {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(private readonly callback: (entries: unknown[], observer: unknown) => void) {}
      observe(target: Element) {
        this.callback([{ intersectionRatio: 1, target }], this);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
  }
});

/**
 * The editor is stubbed rather than exercised: it downloads several MB on its first render,
 * and nothing this element does with it goes deeper than `getValue()`. The stub registers the
 * same tag, so the query in the element under test still finds it.
 */
vi.mock('../../../src/components/keep-elements/keep-monaco-editor', async () => {
  // Imported inside the factory: `vi.mock` is hoisted above every import in the file.
  const { LitElement, html } = await import('lit');

  class StubMonacoEditor extends LitElement {
    value = '';
    language = '';
    diffMode = false;
    originalValue = '';
    getValue(): string {
      return this.value;
    }
    render() {
      return html``;
    }
  }
  if (!customElements.get('keep-monaco-editor')) {
    customElements.define('keep-monaco-editor', StubMonacoEditor);
  }
  return { default: StubMonacoEditor };
});

/**
 * The four thunks this element dispatches become tagged plain actions, so a test can assert
 * *that* they were asked for. No reducer claims the tags, so nothing else in the store moves
 * as a side effect. `importOriginal` keeps the rest of the barrel — the children beside this
 * element reach into it heavily.
 */
vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  fetchViews: vi.fn((..._args: unknown[]) => ({ type: 'test/fetchViews' })),
  fetchAgents: vi.fn((..._args: unknown[]) => ({ type: 'test/fetchAgents' })),
  fetchFolders: vi.fn((..._args: unknown[]) => ({ type: 'test/fetchFolders' })),
  updateSchema: vi.fn((..._args: unknown[]) => ({ type: 'test/updateSchema' })),
}));

/*
 * The toast element, registered for its side effect only. `apiRequestWithRetry` raises one on
 * every failed request by creating a `keep-alert` and calling `show()` on it — so without the
 * registration that call throws a TypeError *out of* the retry helper, and the API error the
 * test is about never reaches the caller. The app shell registers it for the same reason.
 */
import '../../../src/components/keep-elements/keep-alert';
import '../../../src/components/keep-elements/keep-forms-container';
import FormsContainerClass, {
  compareFormNames,
} from '../../../src/components/keep-elements/keep-forms-container';

type FormsContainer = InstanceType<typeof FormsContainerClass>;

const TAG = 'keep-forms-container';

/** Two design forms, out of alphabetical order so the sort has something to do. */
const DESIGN_LIST = {
  forms: [
    { '@name': 'Beta', '@alias': 'b' },
    { '@name': 'Alpha', '@alias': 'a' },
  ],
};

/**
 * What `/schema` answers with. `nsfPath` and `schemaName` are deliberately wrong: the element
 * overwrites both from the route, and that is what these fixtures pin.
 *
 * One view carries its own name as its alias, which is the duplicate the list suppresses, and
 * one carries columns, which is what marks it as updated.
 */
const SCHEMA_RESPONSE = {
  '@unid': 'unid-1',
  apiName: 'demoapi',
  schemaName: 'from-the-server',
  description: 'A schema',
  nsfPath: 'from-the-server.nsf',
  icon: 'beach',
  iconName: 'beach',
  isActive: 'true',
  owners: ['CN=Admin'],
  isModeFetch: false,
  modes: [],
  forms: [],
  configuredForms: [],
  views: [
    { name: 'ByDate', alias: ['ByDate'], unid: 'v1', columns: [{ name: 'c' }] },
    { name: 'ByName', alias: ['bn'], unid: 'v2' },
  ],
  agents: [{ name: 'Nightly', alias: ['Nightly'], unid: 'a1' }],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Replaced per test where a failure is what is under test. */
let respond: (url: string) => Response;

const defaultRespond = (url: string): Response => {
  if (url.includes('/designlist/subforms')) return jsonResponse({ subforms: [] });
  if (url.includes('/designlist/forms')) return jsonResponse(DESIGN_LIST);
  if (url.includes('/schema?')) return jsonResponse(SCHEMA_RESPONSE);
  return jsonResponse({});
};

const router = (entry = '/schema/demo.nsf/demoapi') =>
  new Router({ history: memoryHistory([entry]) });

const shadow = (el: FormsContainer) => el.shadowRoot!;
const find = <T extends Element>(el: FormsContainer, selector: string) =>
  shadow(el).querySelector(selector) as T | null;
const tabGroup = (el: FormsContainer) => find<HTMLElement>(el, 'wa-tab-group')!;

/** Drive the strip the way the group reports a switch, which is the contract this element uses. */
const showTab = async (el: FormsContainer, name: string) => {
  tabGroup(el).dispatchEvent(
    new CustomEvent('wa-tab-show', { detail: { name }, bubbles: true, composed: true }),
  );
  await el.updateComplete;
};

const emitOn = async (el: FormsContainer, target: Element, type: string, detail?: unknown) => {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  await el.updateComplete;
};

/** Mount, then wait out the two chained fetches the element issues on its first update. */
const mount = async (props: Partial<FormsContainer> = {}) => {
  const el = await mountLit<FormsContainer>(TAG, {
    nsfPath: 'demo.nsf',
    dbName: 'demoapi',
    router: router(),
    ...props,
  } as Partial<FormsContainer>);
  await vi.waitFor(() => {
    expect(shadow(el).querySelector('wa-tab-group')).toBeTruthy();
  });
  await el.updateComplete;
  return el;
};

describe('keep-forms-container', () => {
  beforeEach(() => {
    respond = defaultRespond;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => respond(String(input))),
    );
    store.dispatch({ type: INIT_STATE });
    vi.mocked(fetchViews).mockClear();
    vi.mocked(fetchAgents).mockClear();
    vi.mocked(fetchFolders).mockClear();
    vi.mocked(updateSchema).mockClear();
  });

  afterEach(() => {
    cleanupLit();
    vi.unstubAllGlobals();
    store.dispatch({ type: INIT_STATE });
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('mounting', () => {
    it('shows a loading state until the first fetch settles', async () => {
      const el = await mountLit<FormsContainer>(TAG, {
        nsfPath: 'demo.nsf',
        dbName: 'demoapi',
      } as Partial<FormsContainer>);

      expect(find(el, 'keep-page-loading')).toBeTruthy();
      expect(find(el, 'wa-tab-group')).toBeNull();

      await vi.waitFor(() => {
        expect(shadow(el).querySelector('wa-tab-group')).toBeTruthy();
      });
      expect(find(el, 'keep-page-loading')).toBeNull();
    });

    it('names the schema in the loading caption and the document title', async () => {
      const el = await mountLit<FormsContainer>(TAG, {
        nsfPath: 'demo.nsf',
        dbName: 'demoapi',
      } as Partial<FormsContainer>);

      const loading = find<HTMLElement & { message: string }>(el, 'keep-page-loading')!;
      expect(loading.message).toContain('Getting Schema demoapi');
      expect(document.title).toBe('HCL Domino REST API | demoapi Forms');
    });

    it('asks for the folder list once, for this route', async () => {
      await mount();
      expect(fetchFolders).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fetchFolders).mock.calls[0]).toEqual(['demoapi', 'demo.nsf']);
    });

    it('takes the schema from the server but the identity from the route', async () => {
      const el = await mount();
      expect(el.schemaData['@unid']).toBe('unid-1');
      // Both of these come back wrong from the fixture on purpose.
      expect(el.schemaData.nsfPath).toBe('demo.nsf');
      expect(el.schemaData.schemaName).toBe('demoapi');
    });

    it('publishes the active views, suppressing an alias that repeats the name', async () => {
      await mount();
      expect(store.getState().databases.activeViews).toEqual([
        { viewName: 'ByDate', viewAlias: '', viewUnid: 'v1', viewActive: true, viewUpdated: true },
        { viewName: 'ByName', viewAlias: 'bn', viewUnid: 'v2', viewActive: true, viewUpdated: false },
      ]);
    });

    it('publishes the active agents, suppressing an alias that repeats the name', async () => {
      await mount();
      expect(store.getState().databases.activeAgents).toEqual([
        { agentName: 'Nightly', agentAlias: '', agentUnid: 'a1', agentActive: true },
      ]);
    });

    it('loads the unconfigured design forms, sorted by name', async () => {
      await mount();
      expect(store.getState().databases.forms.map((form: any) => form.formName)).toEqual([
        'Alpha',
        'Beta',
      ]);
    });

    it('loads the configured forms when the schema has some', async () => {
      respond = (url) => {
        if (url.includes('/designlist/subforms')) return jsonResponse({ subforms: [] });
        if (url.includes('/designlist/forms')) return jsonResponse(DESIGN_LIST);
        if (url.includes('/schema?')) {
          return jsonResponse({ ...SCHEMA_RESPONSE, forms: [{ formName: 'Beta', formModes: [] }] });
        }
        return jsonResponse({});
      };

      await mount();
      await vi.waitFor(() => {
        expect(store.getState().databases.forms.map((form: any) => form.formName)).toEqual([
          'Alpha',
          'Beta',
        ]);
      });
    });

    it('reports a failed design-list request through the error wrapper', async () => {
      respond = (url) => {
        if (url.includes('/designlist/forms')) {
          return jsonResponse({ status: 404, message: 'No such database' }, 404);
        }
        return jsonResponse({});
      };

      const el = await mountLit<FormsContainer>(TAG, {
        nsfPath: 'demo.nsf',
        dbName: 'demoapi',
      } as Partial<FormsContainer>);
      await vi.waitFor(() => {
        const wrapper = shadow(el).querySelector('keep-error-wrapper') as HTMLElement & {
          errorStatus: { status: number; statusText: string };
        };
        expect(wrapper.errorStatus).toEqual({ status: 404, statusText: 'No such database' });
      });
    });

    /**
     * A thrown `TypeError` from `fetch` becomes `networkFailure`, whose `data` is
     * `{ status: 0, message }` — and `pullForms` re-throws that as `JSON.stringify(data)`. So
     * the body reaching `reportError` *is* JSON, and 0 is what it says.
     *
     * This asserted **200** until #949 was fixed, and passed for a bad reason: `notify()` threw
     * `TypeError: Cannot read properties of null (reading 'style')` on the detached singleton
     * alert, that TypeError escaped `apiRequestWithRetry`'s catch block in place of the API
     * error, and `reportError` could not parse it — so the default 200 survived untouched.
     * The error reporter was destroying the error it was reporting, which is exactly what
     * #949 is about. Now the real status arrives.
     */
    it('records the network failure a non-JSON fetch error is turned into', async () => {
      respond = () => {
        throw new TypeError('Failed to fetch');
      };

      const el = await mountLit<FormsContainer>(TAG, {
        nsfPath: 'demo.nsf',
        dbName: 'demoapi',
      } as Partial<FormsContainer>);
      await vi.waitFor(() => {
        expect(shadow(el).querySelector('wa-tab-group')).toBeTruthy();
      });
      const wrapper = shadow(el).querySelector('keep-error-wrapper') as HTMLElement & {
        errorStatus: { status: number; statusText: string };
      };
      expect(wrapper.errorStatus.status).toBe(0);
      expect(wrapper.errorStatus.statusText).toBe('Failed to fetch');
    });
  });

  describe('the child contracts wave 5 established', () => {
    it('hands keep-forms-tab the raw route param, which that element encodes itself', async () => {
      const el = await mount({ nsfPath: 'my apps.nsf' } as Partial<FormsContainer>);
      const tab = find<HTMLElement & { nsfPath: string; dbName: string }>(el, 'keep-forms-tab')!;
      expect(tab.nsfPath).toBe('my apps.nsf');
      expect(tab.dbName).toBe('demoapi');
    });

    it('tells keep-agents-tab which database it is acting on', async () => {
      const el = await mount();
      await showTab(el, 'agents');
      const tab = find<HTMLElement & { dbName: string }>(el, 'keep-agents-tab')!;
      expect(tab.dbName).toBe('demoapi');
    });

    it('navigates with the finished path keep-forms-tab reports', async () => {
      const route = router();
      const el = await mount({ router: route } as Partial<FormsContainer>);
      const tab = find<HTMLElement>(el, 'keep-forms-tab')!;

      await emitOn(el, tab, 'form-navigate', { path: '/schema/my%20apps.nsf/demoapi/Alpha/access' });

      expect(route.location().pathname).toBe('/schema/my%20apps.nsf/demoapi/Alpha/access');
    });

    it('does not throw when it has no router to navigate with', async () => {
      const el = await mount({ router: null } as Partial<FormsContainer>);
      const tab = find<HTMLElement>(el, 'keep-forms-tab')!;

      await expect(emitOn(el, tab, 'form-navigate', { path: '/somewhere' })).resolves.not.toThrow();
    });

    it('passes the scope list to the two children that read it', async () => {
      const el = await mount();
      const details = find<HTMLElement & { scopes: unknown[] }>(el, 'keep-details-section')!;
      expect(details.scopes).toBe(store.getState().databases.scopes);
    });
  });

  describe('the four schema-change sinks', () => {
    const replacement = { schemaName: 'replaced', nsfPath: 'demo.nsf' } as unknown as Database;

    it('takes the schema from keep-details-section', async () => {
      const el = await mount();
      await emitOn(el, find<HTMLElement>(el, 'keep-details-section')!, 'schema-change', {
        schemaData: replacement,
      });
      expect(el.schemaData).toBe(replacement);
    });

    it('takes the schema from keep-forms-tab', async () => {
      const el = await mount();
      await emitOn(el, find<HTMLElement>(el, 'keep-forms-tab')!, 'schema-change', {
        schemaData: replacement,
      });
      expect(el.schemaData).toBe(replacement);
    });

    it('takes the schema from keep-views-tab', async () => {
      const el = await mount();
      await showTab(el, 'views');
      await emitOn(el, find<HTMLElement>(el, 'keep-views-tab')!, 'schema-change', {
        schemaData: replacement,
      });
      expect(el.schemaData).toBe(replacement);
    });

    it('takes the schema from keep-edit-view', async () => {
      const el = await mount();
      await showTab(el, 'views');
      await emitOn(el, find<HTMLElement>(el, 'keep-edit-view')!, 'schema-change', {
        schemaData: replacement,
      });
      expect(el.schemaData).toBe(replacement);
    });

    it('hands the replacement straight down to the children', async () => {
      const el = await mount();
      await emitOn(el, find<HTMLElement>(el, 'keep-details-section')!, 'schema-change', {
        schemaData: replacement,
      });
      const tab = find<HTMLElement & { schemaData: Database }>(el, 'keep-forms-tab')!;
      expect(tab.schemaData).toBe(replacement);
    });
  });

  describe('the tab strip', () => {
    it('lists the four panels', async () => {
      const el = await mount();
      expect(Array.from(shadow(el).querySelectorAll('wa-tab')).map((t) => t.textContent!.trim()))
        .toEqual(['Database Forms', 'Database Views', 'Database Agents', 'Source']);
    });

    it('renders only the showing panel, so the editor is not mounted until it is asked for', async () => {
      const el = await mount();
      expect(find(el, 'keep-forms-tab')).toBeTruthy();
      expect(find(el, 'keep-views-tab')).toBeNull();
      expect(find(el, 'keep-agents-tab')).toBeNull();
      expect(find(el, 'keep-source')).toBeNull();

      await showTab(el, 'source');
      expect(find(el, 'keep-forms-tab')).toBeNull();
      expect(find(el, 'keep-source')).toBeTruthy();
    });

    it('fetches the views the first time that panel is shown, and not again', async () => {
      const el = await mount();
      expect(fetchViews).not.toHaveBeenCalled();

      await showTab(el, 'views');
      expect(fetchViews).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fetchViews).mock.calls[0]).toEqual(['demoapi', 'demo.nsf']);

      await showTab(el, 'forms');
      await showTab(el, 'views');
      expect(fetchViews).toHaveBeenCalledTimes(1);
    });

    it('fetches the agents the first time that panel is shown, and not again', async () => {
      const el = await mount();
      expect(fetchAgents).not.toHaveBeenCalled();

      await showTab(el, 'agents');
      expect(fetchAgents).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fetchAgents).mock.calls[0]).toEqual(['demoapi', 'demo.nsf']);

      await showTab(el, 'forms');
      await showTab(el, 'agents');
      expect(fetchAgents).toHaveBeenCalledTimes(1);
    });

    it('fetches nothing for the two panels that hold no server list', async () => {
      const el = await mount();
      await showTab(el, 'source');
      await showTab(el, 'forms');
      expect(fetchViews).not.toHaveBeenCalled();
      expect(fetchAgents).not.toHaveBeenCalled();
    });
  });

  describe('the Edit View panel beside the Views tab', () => {
    it('opens on a view the tab reports as openable, and records its name', async () => {
      const el = await mount();
      await showTab(el, 'views');

      await emitOn(el, find<HTMLElement>(el, 'keep-views-tab')!, 'view-open', {
        viewName: 'ByDate',
        active: true,
      });

      const panel = find<HTMLElement & { open: boolean; viewName: string }>(el, 'keep-edit-view')!;
      expect(panel.open).toBe(true);
      expect(panel.viewName).toBe('ByDate');
    });

    it('stays shut for a view that cannot be opened, keeping the previous name', async () => {
      const el = await mount();
      await showTab(el, 'views');
      const tab = find<HTMLElement>(el, 'keep-views-tab')!;

      await emitOn(el, tab, 'view-open', { viewName: 'ByDate', active: true });
      await emitOn(el, tab, 'view-open', { viewName: 'ByName', active: false });

      const panel = find<HTMLElement & { open: boolean; viewName: string }>(el, 'keep-edit-view')!;
      expect(panel.open).toBe(false);
      expect(panel.viewName).toBe('ByDate');
    });

    it('closes on the panel s own close event', async () => {
      const el = await mount();
      await showTab(el, 'views');
      const tab = find<HTMLElement>(el, 'keep-views-tab')!;
      await emitOn(el, tab, 'view-open', { viewName: 'ByDate', active: true });

      await emitOn(el, find<HTMLElement>(el, 'keep-edit-view')!, 'dialog-close', undefined);

      expect(find<HTMLElement & { open: boolean }>(el, 'keep-edit-view')!.open).toBe(false);
    });

    it('hands the panel the raw route param, as the previous frame did', async () => {
      const el = await mount({ nsfPath: 'my apps.nsf' } as Partial<FormsContainer>);
      await showTab(el, 'views');
      const panel = find<HTMLElement & { nsfPathProp: string }>(el, 'keep-edit-view')!;
      expect(panel.nsfPathProp).toBe('my apps.nsf');
    });
  });

  describe('the Source panel', () => {
    const source = (el: FormsContainer) =>
      find<HTMLElement & {
        selectedOption: string;
        content: Record<string, unknown>;
        onSave: () => void;
        onCancel: () => void;
        onDropdownChange: (option: string) => void;
        getExternalContent: () => string;
      }>(el, 'keep-source')!;

    const openSource = async (el: FormsContainer) => {
      await showTab(el, 'source');
      return source(el);
    };

    it('shows the tree lens first, with the schema in it and no editor', async () => {
      const el = await mount();
      const view = await openSource(el);
      expect(view.selectedOption).toBe('tree');
      expect(view.content).toMatchObject({ schemaName: 'demoapi', nsfPath: 'demo.nsf' });
      expect(find(el, 'keep-monaco-editor')).toBeNull();
    });

    it('mounts the editor for the text lens and the diff lens only', async () => {
      const el = await mount();
      const view = await openSource(el);

      view.onDropdownChange('text');
      await el.updateComplete;
      expect(find(el, 'keep-monaco-editor')).toBeTruthy();

      view.onDropdownChange('diff');
      await el.updateComplete;
      const editor = find<HTMLElement & { diffMode: boolean; originalValue: string }>(
        el,
        'keep-monaco-editor',
      )!;
      expect(editor.diffMode).toBe(true);
      expect(JSON.parse(editor.originalValue).schemaName).toBe('demoapi');

      view.onDropdownChange('tree');
      await el.updateComplete;
      expect(find(el, 'keep-monaco-editor')).toBeNull();
    });

    /**
     * The callbacks are properties `keep-source` invokes from its own template, so Lit binds
     * `this` to that element. Calling them detached, as here, is the same shape — and it is
     * what fails if any of them is written as a plain method (#806 wave 5, note 15).
     */
    it('keeps its callbacks bound to this element, not to keep-source', async () => {
      const el = await mount();
      const view = await openSource(el);
      const { onSave } = view;

      onSave();
      await el.updateComplete;

      expect(find<HTMLDialogElement>(el, 'dialog.save-dialog')).toBeTruthy();
      expect((el as unknown as { saveChangesDialog: boolean }).saveChangesDialog).toBe(true);
    });

    it('carries the tree s edits into the save confirmation', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.content = { schemaName: 'demoapi', description: 'edited in the tree' };

      view.onSave();
      await el.updateComplete;

      await emitOn(el, shadow(el).querySelectorAll('keep-button')[1], 'click');
      expect(updateSchema).toHaveBeenCalledTimes(1);
      expect(vi.mocked(updateSchema).mock.calls[0][0]).toEqual({
        schemaName: 'demoapi',
        description: 'edited in the tree',
      });
    });

    it('replaces the schema with whatever the save echoes back', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.onSave();
      await el.updateComplete;
      await emitOn(el, shadow(el).querySelectorAll('keep-button')[1], 'click');

      const sink = vi.mocked(updateSchema).mock.calls[0][1] as (data: Database) => void;
      const saved = { schemaName: 'demoapi', description: 'from the server' } as unknown as Database;
      sink(saved);
      await el.updateComplete;

      expect(el.schemaData).toBe(saved);
    });

    it('re-fetches the four lists a save can invalidate', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.onSave();
      await el.updateComplete;
      await emitOn(el, shadow(el).querySelectorAll('keep-button')[1], 'click');

      expect(fetchViews).toHaveBeenCalledTimes(1);
      expect(fetchAgents).toHaveBeenCalledTimes(1);
    });

    it('takes the text lens s buffer, and refuses to offer a save of invalid JSON', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.onDropdownChange('text');
      await el.updateComplete;

      const editor = find<HTMLElement & { getValue: () => string }>(el, 'keep-monaco-editor')!;
      editor.getValue = () => '{ not json';

      view.onSave();
      await el.updateComplete;
      expect((el as unknown as { saveChangesDialog: boolean }).saveChangesDialog).toBe(false);

      editor.getValue = () => '{"schemaName":"typed"}';
      view.onSave();
      await el.updateComplete;
      expect((el as unknown as { saveChangesDialog: boolean }).saveChangesDialog).toBe(true);
    });

    it('renders an invalid buffer as the last content that parsed, instead of failing', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.onDropdownChange('text');
      await el.updateComplete;

      const editor = find<HTMLElement & { getValue: () => string }>(el, 'keep-monaco-editor')!;
      editor.getValue = () => '{ half typed';

      // Cancel writes the live text into the buffer, which the tree then has to render.
      view.onCancel();
      await el.updateComplete;
      view.onDropdownChange('tree');
      await el.updateComplete;

      expect(source(el).content).toMatchObject({ schemaName: 'demoapi' });
    });

    it('offers the discard confirmation on cancel, and clears the edits on discard', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.content = { schemaName: 'demoapi', description: 'edited' };

      view.onCancel();
      await el.updateComplete;
      expect((el as unknown as { discardChangesDialog: boolean }).discardChangesDialog).toBe(true);

      const dialog = find<HTMLDialogElement>(el, 'dialog.discard-dialog')!;
      const buttons = dialog.querySelectorAll('keep-button');
      await emitOn(el, buttons[0], 'click');

      expect((el as unknown as { discardChangesDialog: boolean }).discardChangesDialog).toBe(false);
      expect(source(el).content).toMatchObject({ description: 'A schema' });
    });

    it('keeps the edits when Keep Editing is chosen instead', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.content = { schemaName: 'demoapi', description: 'edited' };
      view.onCancel();
      await el.updateComplete;

      const dialog = find<HTMLDialogElement>(el, 'dialog.discard-dialog')!;
      await emitOn(el, dialog.querySelectorAll('keep-button')[1], 'click');

      expect((el as unknown as { discardChangesDialog: boolean }).discardChangesDialog).toBe(false);
      expect(source(el).content).toMatchObject({ description: 'edited' });
    });

    it('puts the pending edit back when the save confirmation is declined', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.content = { schemaName: 'demoapi', description: 'edited' };
      view.onSave();
      await el.updateComplete;

      const dialog = find<HTMLDialogElement>(el, 'dialog.save-dialog')!;
      await emitOn(el, dialog.querySelectorAll('keep-button')[0], 'click');

      expect((el as unknown as { saveChangesDialog: boolean }).saveChangesDialog).toBe(false);
      expect(source(el).content).toMatchObject({ description: 'edited' });
    });

    it('puts the flag back when a confirmation is dismissed with Escape', async () => {
      const el = await mount();
      const view = await openSource(el);
      view.onCancel();
      await el.updateComplete;

      find<HTMLDialogElement>(el, 'dialog.discard-dialog')!.dispatchEvent(new Event('cancel'));
      await el.updateComplete;
      expect((el as unknown as { discardChangesDialog: boolean }).discardChangesDialog).toBe(false);

      view.onSave();
      await el.updateComplete;
      find<HTMLDialogElement>(el, 'dialog.save-dialog')!.dispatchEvent(new Event('cancel'));
      await el.updateComplete;
      expect((el as unknown as { saveChangesDialog: boolean }).saveChangesDialog).toBe(false);
    });

    it('names both confirmations for assistive technology', async () => {
      const el = await mount();
      await openSource(el);
      expect(find(el, 'dialog.save-dialog')!.getAttribute('aria-label')).toBe('Save changes?');
      expect(find(el, 'dialog.discard-dialog')!.getAttribute('aria-label')).toBe(
        'Discard changes?',
      );
    });
  });

  describe('the editor buffer', () => {
    const source = (el: FormsContainer) =>
      find<HTMLElement & {
        content: Record<string, unknown>;
        onDropdownChange: (option: string) => void;
      }>(el, 'keep-source')!;

    it('follows the schema when a child replaces it', async () => {
      const el = await mount();
      await showTab(el, 'source');
      await emitOn(el, find<HTMLElement>(el, 'keep-details-section')!, 'schema-change', {
        schemaData: { schemaName: 'demoapi', description: 'saved copy' } as unknown as Database,
      });
      expect(source(el).content).toMatchObject({ description: 'saved copy' });
    });

    it('discards the edits on a lens switch that changes the buffer', async () => {
      const el = await mount();
      await showTab(el, 'source');
      const view = source(el);
      view.content = { description: 'edited' };

      view.onDropdownChange('text');
      await el.updateComplete;
      view.onDropdownChange('tree');
      await el.updateComplete;

      expect(source(el).content).toMatchObject({ description: 'A schema' });
    });

    it('keeps the buffer across the text and diff lenses, which share it', async () => {
      const el = await mount();
      await showTab(el, 'source');
      const view = source(el);

      view.onDropdownChange('text');
      await el.updateComplete;
      const editor = find<HTMLElement & { getValue: () => string; value: string }>(
        el,
        'keep-monaco-editor',
      )!;
      editor.getValue = () => '{"description":"typed into the editor"}';

      view.onDropdownChange('diff');
      await el.updateComplete;

      const diffEditor = find<HTMLElement & { value: string }>(el, 'keep-monaco-editor')!;
      expect(JSON.parse(diffEditor.value)).toEqual({ description: 'typed into the editor' });
    });

    it('throws the edits away when the server rejects the save', async () => {
      const el = await mount();
      await showTab(el, 'source');
      const view = source(el);
      view.content = { description: 'edited' };
      view.onDropdownChange('text');
      await el.updateComplete;

      store.dispatch({ type: 'databases/updateError', payload: true });
      await el.updateComplete;

      const editor = find<HTMLElement & { value: string }>(el, 'keep-monaco-editor')!;
      expect(JSON.parse(editor.value)).toMatchObject({ description: 'A schema' });
    });
  });

  describe('accessibility', () => {
    it('gives the page a heading rather than a span dressed as one', async () => {
      const el = await mount();
      expect(find(el, 'h1')!.textContent!.trim()).toBe('Schema Management');
    });
  });
});

/**
 * P0-5: the caller used to be `allForms.sort((a, b) => a.formName.toLowerCase() > ...)`
 * inside a bare `catch {}`. A single form with no `@name` threw out of the comparator,
 * Array#sort propagated it, and the swallowed error left the whole list in API order —
 * silently. These tests pin the two properties that make the catch unnecessary: it
 * never throws, and it still sorts.
 *
 * Carried over unchanged from `test/components/forms/compare-form-names.test.ts`, which is
 * deleted with the React file that exported this.
 */
describe('compareFormNames', () => {
  const sorted = (names: (string | undefined)[]) =>
    names.map((formName) => ({ formName })).sort(compareFormNames).map((f) => f.formName);

  it('orders names alphabetically, ignoring case', () => {
    expect(sorted(['delta', 'Alpha', 'charlie', 'Bravo'])).toEqual(['Alpha', 'Bravo', 'charlie', 'delta']);
  });

  it('treats equal names as equal rather than always reordering them', () => {
    // The old comparator returned -1 for equal names, never 0.
    expect(compareFormNames({ formName: 'Same' }, { formName: 'same' })).toBe(0);
  });

  it('sorts a list containing a nameless form instead of throwing', () => {
    expect(() => sorted(['beta', undefined, 'alpha'])).not.toThrow();
    expect(sorted(['beta', undefined, 'alpha'])).toEqual([undefined, 'alpha', 'beta']);
  });

  it('survives a list of nothing but nameless forms', () => {
    expect(() => sorted([undefined, undefined])).not.toThrow();
  });

  it('is antisymmetric', () => {
    expect(compareFormNames({ formName: 'a' }, { formName: 'b' })).toBeLessThan(0);
    expect(compareFormNames({ formName: 'b' }, { formName: 'a' })).toBeGreaterThan(0);
  });
});
