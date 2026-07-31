/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { INIT_STATE } from '../../../src/store/databases/types';
import type { Database } from '../../../src/store/databases/types';
import { addActiveAgent, setAgents, setPullScope } from '../../../src/store/databases/reducer';
import { setApiLoading } from '../../../src/store/dialog/action';
import '../../../src/components/keep-elements/keep-agents-tab';
import AgentsTabClass from '../../../src/components/keep-elements/keep-agents-tab';
import type { KeepAgentsTableAgent } from '../../../src/components/keep-elements/keep-agents-table';

/**
 * The one thunk this element dispatches is stubbed: the real `handleDatabaseAgents` posts
 * the whole schema back to the API. `importOriginal` rather than a bare factory, so the
 * rest of that barrel — which the nested table and switch also reach into — is untouched.
 *
 * The rest parameter is for types, not behaviour: a zero-arg `vi.fn` gives `mock.calls[0]`
 * the tuple type `[]`, so reading an argument by index would be a compile error.
 */
const { handleDatabaseAgents } = vi.hoisted(() => ({
  handleDatabaseAgents: vi.fn((..._args: unknown[]) => ({ type: 'TEST_HANDLE_DATABASE_AGENTS' })),
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  handleDatabaseAgents,
}));

const TAG = 'keep-agents-tab';

type AgentsTab = InstanceType<typeof AgentsTabClass>;

/**
 * Three agents, deliberately out of alphabetical order in the store, so "renders the list"
 * and "renders the list sorted" cannot pass for each other. Exactly one is active, so the
 * Show Active filter has something to remove.
 */
const NIGHTLY = { agentActive: false, agentAlias: [], agentName: 'NightlyClean', agentUnid: 'u1' };
const DIGEST = { agentActive: true, agentAlias: ['ac'], agentName: 'SendDigest', agentUnid: 'u2' };
const ARCHIVE = { agentActive: false, agentAlias: [], agentName: 'ArchiveOld', agentUnid: 'u3' };

const schemaData = {
  schemaName: 'testdb',
  nsfPath: 'demo.nsf',
  forms: [],
} as unknown as Database;

/** jsdom implements no modal behaviour; setupTests stubs both with `vi.fn()`. */
const showModal = () => vi.mocked(HTMLDialogElement.prototype.showModal);
const close = () => vi.mocked(HTMLDialogElement.prototype.close);

/**
 * How many of those calls were this dialog's.
 *
 * The stubs sit on the prototype, so every dialog in the tree shares one counter — and
 * there are four here: this element's confirmation, plus the one `keep-activate-switch`
 * renders in each of the three rows, each of which closes its own on first render. A bare
 * `toHaveBeenCalledTimes` counts those too, and would pass or fail on the row count.
 */
const callsOn = (
  mock: { mock: { contexts: unknown[] } },
  dialog: HTMLDialogElement,
): number => mock.mock.contexts.filter((context) => context === dialog).length;

const seed = () => {
  store.dispatch(setPullScope(true));
  store.dispatch(setAgents({ agents: [NIGHTLY, DIGEST, ARCHIVE] }));
  store.dispatch(addActiveAgent({ activeAgent: DIGEST }));
};

/** The store's own records, which are copies of the fixtures above (setAgents remaps them). */
const stored = () => store.getState().databases.agents as KeepAgentsTableAgent[];

const mount = (props: Partial<AgentsTab> = {}) =>
  mountLit<AgentsTab>(TAG, { schemaData, dbName: 'testdb', ...props } as Partial<AgentsTab>);

const table = (el: AgentsTab) =>
  el.shadowRoot!.querySelector('keep-agents-table') as HTMLElement & {
    agents: KeepAgentsTableAgent[];
  };

const listed = (el: AgentsTab) => table(el).agents.map((agent) => agent.agentName);

const bulk = (el: AgentsTab, label: string) =>
  [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.text-button')].find(
    (button) => button.textContent?.trim() === label,
  )!;

const dialogOf = (el: AgentsTab) => el.shadowRoot!.querySelector('dialog')!;

const dialogButton = (el: AgentsTab, label: string) =>
  [...el.shadowRoot!.querySelectorAll('keep-button')].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLElement;

const searchInput = (el: AgentsTab) => el.shadowRoot!.querySelector('keep-search-input')!;

/** Type into the real field, so the whole search path is exercised rather than the handler. */
const typeSearch = async (el: AgentsTab, text: string) => {
  const field = searchInput(el) as HTMLElement & { updateComplete: Promise<boolean> };
  await field.updateComplete;
  const input = field.shadowRoot!.querySelector('input')!;
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await el.updateComplete;
};

/** Flip the Show Active switch the way a pointer does: through the event wa-switch emits. */
const toggleShowActive = async (el: AgentsTab) => {
  const keepSwitch = el.shadowRoot!.querySelector('keep-switch') as HTMLElement & {
    updateComplete: Promise<boolean>;
  };
  await keepSwitch.updateComplete;
  keepSwitch.shadowRoot!.querySelector('wa-switch')!.dispatchEvent(new Event('change'));
  await el.updateComplete;
};

/** What the table reports when a row's pill is used, as the table itself emits it. */
const rowToggle = async (el: AgentsTab, type: string, agent: KeepAgentsTableAgent) => {
  table(el).dispatchEvent(
    new CustomEvent(type, { detail: { agent }, bubbles: true, composed: true }),
  );
  await el.updateComplete;
};

/** The whole `static styles` group as text, for the rules a suite with `css: false` cannot compute. */
const styleText = (AgentsTabClass as unknown as { styles: Array<{ cssText: string }> }).styles
  .map((sheet) => sheet.cssText)
  .join('\n');

beforeEach(() => {
  store.dispatch({ type: INIT_STATE });
  handleDatabaseAgents.mockClear();
  showModal().mockClear();
  close().mockClear();
  seed();
});

afterEach(() => {
  cleanupLit();
  store.dispatch({ type: INIT_STATE });
});

describe('keep-agents-tab — the list', () => {
  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('hands the table every agent, sorted by name', async () => {
    const el = await mount();
    expect(listed(el)).toEqual(['ArchiveOld', 'NightlyClean', 'SendDigest']);
  });

  it('passes each record by reference, which is what the activation thunk needs', async () => {
    const el = await mount();
    const digest = stored().find((agent) => agent.agentName === 'SendDigest');
    expect(table(el).agents.find((agent) => agent.agentName === 'SendDigest')).toBe(digest);
  });

  it('follows the store, so a save landing while the tab is open is shown', async () => {
    const el = await mount();
    store.dispatch(setAgents({ agents: [NIGHTLY] }));
    await el.updateComplete;
    expect(listed(el)).toEqual(['NightlyClean']);
  });

  it('draws nothing but an empty table when the database has no agents', async () => {
    store.dispatch(setAgents({ agents: [] }));
    const el = await mount();
    expect(listed(el)).toEqual([]);
  });
});

describe('keep-agents-tab — searching', () => {
  it('filters on the agent name, ignoring case', async () => {
    const el = await mount();
    await typeSearch(el, 'send');
    expect(listed(el)).toEqual(['SendDigest']);
  });

  it('restores the full sorted list when the field is cleared', async () => {
    const el = await mount();
    await typeSearch(el, 'send');
    await typeSearch(el, '');
    expect(listed(el)).toEqual(['ArchiveOld', 'NightlyClean', 'SendDigest']);
  });

  it('skips a record with no name rather than throwing on it', async () => {
    store.dispatch(setAgents({ agents: [NIGHTLY, { ...DIGEST, agentName: '' }] }));
    const el = await mount();
    await typeSearch(el, 'e');
    expect(listed(el)).toEqual(['NightlyClean']);
  });

  it('recomputes against the store rather than a snapshot taken when the key was typed', async () => {
    // The replaced component kept the hits in state, so an activation arriving from the
    // server behind an open search left the list rendering records the store had replaced.
    const el = await mount();
    await typeSearch(el, 'e');
    store.dispatch(setAgents({ agents: [ARCHIVE] }));
    await el.updateComplete;
    expect(listed(el)).toEqual(['ArchiveOld']);
  });

  it('searches all agents, so the Show Active filter does not narrow the hits', async () => {
    // Carried over as-is from the original, and it reads like an oversight — but changing
    // it is a behaviour change, not a conversion. Pinned so it is a decision either way.
    const el = await mount();
    await toggleShowActive(el);
    expect(listed(el)).toEqual(['SendDigest']);
    await typeSearch(el, 'e');
    expect(listed(el)).toEqual(['NightlyClean', 'SendDigest', 'ArchiveOld']);
  });
});

describe('keep-agents-tab — Show Active', () => {
  it('narrows the list to the active agents', async () => {
    const el = await mount();
    await toggleShowActive(el);
    expect(el.showActive).toBe(true);
    expect(listed(el)).toEqual(['SendDigest']);
  });

  it('puts every agent back when switched off again', async () => {
    const el = await mount();
    await toggleShowActive(el);
    await toggleShowActive(el);
    expect(listed(el)).toEqual(['ArchiveOld', 'NightlyClean', 'SendDigest']);
  });

  it('toggles this element and not the switch, which invokes the callback as its own', async () => {
    // keep-switch takes its callback as a property and calls it from its own template, so
    // Lit invokes it with keep-switch as the receiver. A plain method here would set the
    // flag on the switch and this list would never change.
    const el = await mount();
    await toggleShowActive(el);
    const keepSwitch = el.shadowRoot!.querySelector('keep-switch') as unknown as {
      showActive?: boolean;
    };
    expect(keepSwitch.showActive).toBeUndefined();
    expect(el.showActive).toBe(true);
  });
});

describe('keep-agents-tab — activation', () => {
  it('activates one agent when its row reports a toggle', async () => {
    const el = await mount();
    const agent = stored()[0];
    await rowToggle(el, 'agent-activate', agent);
    expect(handleDatabaseAgents).toHaveBeenCalledWith(
      [agent],
      store.getState().databases.activeAgents,
      'testdb',
      schemaData,
      true,
      stored(),
    );
  });

  it('deactivates one agent when its row reports the other toggle', async () => {
    const el = await mount();
    const agent = stored()[1];
    await rowToggle(el, 'agent-deactivate', agent);
    expect(handleDatabaseAgents).toHaveBeenCalledWith(
      [agent],
      expect.anything(),
      'testdb',
      schemaData,
      false,
      stored(),
    );
  });

  it('activates every agent from Activate All, without confirming', async () => {
    const el = await mount();
    bulk(el, 'Activate All').click();
    await el.updateComplete;
    expect(handleDatabaseAgents).toHaveBeenCalledWith(
      stored(),
      expect.anything(),
      'testdb',
      schemaData,
      true,
      stored(),
    );
    expect(callsOn(showModal(), dialogOf(el))).toBe(0);
  });

  it('sends the whole list even while only the active ones are shown', async () => {
    // The bulk controls always act on every agent; Show Active only changes the view.
    const el = await mount();
    await toggleShowActive(el);
    bulk(el, 'Activate All').click();
    await el.updateComplete;
    expect(handleDatabaseAgents.mock.calls[0][0]).toEqual(stored());
  });

  it('dispatches nothing without a schema, because the thunk posts the schema back', async () => {
    const el = await mount({ schemaData: undefined });
    bulk(el, 'Activate All').click();
    await el.updateComplete;
    expect(handleDatabaseAgents).not.toHaveBeenCalled();
  });

  it('disables both bulk controls when there is nothing to act on', async () => {
    store.dispatch(setAgents({ agents: [] }));
    const el = await mount();
    expect(bulk(el, 'Activate All').disabled).toBe(true);
    expect(bulk(el, 'Deactivate All').disabled).toBe(true);
  });

  it('disables both bulk controls while a save is in flight', async () => {
    const el = await mount();
    store.dispatch(setApiLoading(true));
    await el.updateComplete;
    expect(bulk(el, 'Activate All').disabled).toBe(true);
    expect(bulk(el, 'Deactivate All').disabled).toBe(true);
    store.dispatch(setApiLoading(false));
    await el.updateComplete;
    expect(bulk(el, 'Activate All').disabled).toBe(false);
  });
});

describe('keep-agents-tab — the reset confirmation', () => {
  it('asks before deactivating everything, and dispatches nothing yet', async () => {
    const el = await mount();
    bulk(el, 'Deactivate All').click();
    await el.updateComplete;
    expect(el.confirmingReset).toBe(true);
    expect(callsOn(showModal(), dialogOf(el))).toBe(1);
    expect(handleDatabaseAgents).not.toHaveBeenCalled();
  });

  it('deactivates every agent from Yes, and closes', async () => {
    const el = await mount();
    bulk(el, 'Deactivate All').click();
    await el.updateComplete;
    dialogButton(el, 'Yes').click();
    await el.updateComplete;
    expect(handleDatabaseAgents).toHaveBeenCalledWith(
      stored(),
      expect.anything(),
      'testdb',
      schemaData,
      false,
      stored(),
    );
    expect(el.confirmingReset).toBe(false);
    expect(callsOn(close(), dialogOf(el))).toBe(1);
  });

  it('closes from No without dispatching', async () => {
    const el = await mount();
    bulk(el, 'Deactivate All').click();
    await el.updateComplete;
    dialogButton(el, 'No').click();
    await el.updateComplete;
    expect(handleDatabaseAgents).not.toHaveBeenCalled();
    expect(el.confirmingReset).toBe(false);
    expect(callsOn(close(), dialogOf(el))).toBe(1);
  });

  it('closes from the header close button', async () => {
    const el = await mount();
    bulk(el, 'Deactivate All').click();
    await el.updateComplete;
    const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await header.updateComplete;
    header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
    await el.updateComplete;
    expect(el.confirmingReset).toBe(false);
  });

  it('closes on Escape, so the flag cannot survive the dialog', async () => {
    const el = await mount();
    bulk(el, 'Deactivate All').click();
    await el.updateComplete;
    dialogOf(el).dispatchEvent(new Event('cancel'));
    await el.updateComplete;
    expect(el.confirmingReset).toBe(false);
  });

  it('stays shut until it is asked for', async () => {
    const el = await mount();
    expect(callsOn(showModal(), dialogOf(el))).toBe(0);
    expect(callsOn(close(), dialogOf(el))).toBe(0);
  });

  it('applies each change of the flag once', async () => {
    // updated() runs on every render with no changed-properties entry for the store, so
    // without the edge trigger an unrelated re-render re-issues showModal() — which throws
    // InvalidStateError on a dialog that is already open.
    const el = await mount();
    bulk(el, 'Deactivate All').click();
    await el.updateComplete;
    store.dispatch(setApiLoading(true));
    await el.updateComplete;
    expect(callsOn(showModal(), dialogOf(el))).toBe(1);
    store.dispatch(setApiLoading(false));
  });
});

describe('keep-agents-tab — the search field', () => {
  it('labels the field for this screen', async () => {
    const el = await mount();
    expect(searchInput(el).getAttribute('placeholder')).toBe('Search Agents');
  });

  it('blocks pointer input on the field while the list is still being pulled', async () => {
    const el = await mount();
    expect(searchInput(el).hasAttribute('disabled')).toBe(false);
    store.dispatch(setPullScope(false));
    await el.updateComplete;
    expect(searchInput(el).hasAttribute('disabled')).toBe(true);
  });
});

describe('keep-agents-tab — accessibility (#713)', () => {
  it('names and describes the confirmation without an IDREF across a shadow boundary', async () => {
    const el = await mount();
    expect(dialogOf(el).getAttribute('aria-label')).toBe('Reset ALL Agents?');
    const describedBy = dialogOf(el).getAttribute('aria-describedby')!;
    expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain(
      'Deactivate all database agents?',
    );
  });

  it('puts the question in a paragraph, not in an unknown inline element', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.dialog-content p')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('text')).toBeNull();
  });

  it('keeps the bulk controls out of any enclosing form submit', async () => {
    const el = await mount();
    expect(bulk(el, 'Activate All').type).toBe('button');
    expect(bulk(el, 'Deactivate All').type).toBe('button');
  });

  it('groups and names the two bulk controls', async () => {
    const el = await mount();
    const group = el.shadowRoot!.querySelector('[role="group"]')!;
    expect(group.getAttribute('aria-label')).toBe('All agents');
    expect(group.querySelectorAll('button.text-button')).toHaveLength(2);
  });

  it('hides the rule between them, which is decoration', async () => {
    const el = await mount();
    expect(el.shadowRoot!.querySelector('.short-vertical')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

/**
 * The suite runs with `css: false`, so nothing here can compute a style. What it can pin is
 * the set of rules that used to reach this markup through the document and now cannot.
 */
describe('keep-agents-tab — styles a document sheet cannot reach in here', () => {
  it('restates the border-box reset, which arrives through a universal selector', () => {
    expect(styleText).toContain('box-sizing: border-box');
  });

  it('restates the separator, whose class lives in the global sheet', () => {
    expect(styleText).toMatch(/\.short-vertical\s*\{[^}]*background-color:/);
  });

  it('restates the dialog chrome, which comes from a class the shadow root cannot see', () => {
    expect(styleText).toMatch(/dialog\s*\{[^}]*background:/);
    expect(styleText).toMatch(/dialog\[open\]\s*\{[^}]*display:\s*flex/);
  });

  it('dims the page behind the modal in both colour modes', () => {
    // A backdrop reaches a light-DOM dialog through bare selectors, so a converted dialog
    // loses its dimming entirely without this.
    expect(styleText).toContain('dialog::backdrop');
  });

  it('reads mode-aware tokens for the two bulk controls rather than the literals', () => {
    // The green and the red were hardcoded, so in dark mode they sat on a background they
    // were never measured against.
    expect(styleText).toContain('var(--keep-color-success-text)');
    expect(styleText).toContain('var(--keep-color-danger-text)');
    expect(styleText).not.toMatch(/#087251|#aa1f51/);
  });

  it('gives the bulk controls a visible focus indicator', () => {
    expect(styleText).toMatch(/\.text-button:focus-visible\s*\{[^}]*outline:/);
  });
});
