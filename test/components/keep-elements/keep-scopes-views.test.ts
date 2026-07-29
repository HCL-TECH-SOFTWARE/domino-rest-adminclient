/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import ScopesDefaultView from '../../../src/components/keep-elements/keep-scopes-default-view';
import ScopesCardsView from '../../../src/components/keep-elements/keep-scopes-cards-view';
import '../../../src/components/keep-elements/keep-scopes-alphabetical-view';
import '../../../src/components/keep-elements/keep-scopes-stacks-view';
import '../../../src/components/keep-elements/keep-scopes-multi-view';
import type ScopesAlphabeticalView from '../../../src/components/keep-elements/keep-scopes-alphabetical-view';
import type ScopesStacksView from '../../../src/components/keep-elements/keep-scopes-stacks-view';
import type ScopesMultiView from '../../../src/components/keep-elements/keep-scopes-multi-view';

const database = (over: Record<string, unknown> = {}) => ({
  apiName: 'demo',
  schemaName: 'Demo Schema',
  nsfPath: 'demo.nsf',
  fileName: 'demo.nsf',
  iconName: 'beach',
  isActive: true,
  description: 'a demo scope',
  maximumAccessLevel: 'Manager',
  ...over,
});

describe('keep-scopes-default-view', () => {
  const TAG = 'keep-scopes-default-view';

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the empty state when there are no databases', async () => {
    const el = await mountLit<ScopesDefaultView>(TAG, { databases: [] });
    expect(el.shadowRoot!.querySelector('keep-zero-results')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('keep-nsf-card')).toBeNull();
  });

  it('composes keep-nsf-card directly, with no React wrapper', async () => {
    const el = await mountLit<ScopesDefaultView>(TAG, { databases: [database()] });
    const cards = el.shadowRoot!.querySelectorAll('keep-nsf-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(el.shadowRoot!.querySelector('keep-zero-results')).toBeNull();
  });

  it('emits scope-open, bubbling and composed, when a card opens a scope', async () => {
    const el = await mountLit<ScopesDefaultView>(TAG, { databases: [database()] });
    const seen: CustomEvent[] = [];
    document.body.addEventListener('scope-open', (e) => seen.push(e as CustomEvent));

    // keep-nsf-card still takes a callback property; this element sets it, and turns the call
    // into an event on the way out.
    const card = el.shadowRoot!.querySelector('keep-nsf-card') as HTMLElement & {
      open: (item: unknown) => void;
    };
    card.open({ fileName: 'demo.nsf' });

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.scope).toEqual({ fileName: 'demo.nsf' });
    expect(seen[0].bubbles).toBe(true);
    expect(seen[0].composed).toBe(true);
  });

  it('does not reproduce the undefined medium-font class', () => {
    // Asserted as a selector, not a substring: no stylesheet in the tree ever defined
    // `.medium-font`, so it only ever had an effect on paper. The comment in the element still
    // names it, which is why this is not a `toContain`.
    expect(ScopesDefaultView.styles.toString()).not.toMatch(/\.medium-font\s*[,{]/);
  });

  it('keeps the explicit 10px gap the utility class set', () => {
    expect(ScopesDefaultView.styles.toString()).toMatch(/gap:\s*10px/);
  });

  it('tolerates databases being unset', async () => {
    const el = await mountLit<ScopesDefaultView>(TAG);
    expect(el.shadowRoot!.querySelector('keep-zero-results')).toBeTruthy();
  });
});

describe('keep-scopes-cards-view', () => {
  const TAG = 'keep-scopes-cards-view';

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the empty state when there are no databases', async () => {
    const el = await mountLit<ScopesCardsView>(TAG, { databases: [] });
    expect(el.shadowRoot!.querySelector('keep-zero-results')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('keep-default-card')).toBeNull();
  });

  it('composes keep-default-card directly and sets it up by property', async () => {
    const el = await mountLit<ScopesCardsView>(TAG, { databases: [database()] });
    const card = el.shadowRoot!.querySelector('keep-default-card') as HTMLElement & {
      title: string;
      subtitle: string;
      acl: string;
      status: boolean;
    };
    expect(card).toBeTruthy();
    expect(card.title).toBe('demo');
    expect(card.subtitle).toBe('Demo Schema (demo.nsf)');
    expect(card.acl).toBe('Manager');
    expect(card.status).toBe(true);
    // Set as a property, not an attribute - as an attribute `title` would also raise the
    // browser's native tooltip.
    expect(card.hasAttribute('title')).toBe(false);
  });

  it('falls back to *Editor when no access level is given', async () => {
    const el = await mountLit<ScopesCardsView>(TAG, {
      databases: [database({ maximumAccessLevel: undefined })],
    });
    const card = el.shadowRoot!.querySelector('keep-default-card') as HTMLElement & { acl: string };
    expect(card.acl).toBe('*Editor');
  });

  it('emits scope-open when a card is clicked', async () => {
    const db = database();
    const el = await mountLit<ScopesCardsView>(TAG, { databases: [db] });
    const seen: CustomEvent[] = [];
    document.body.addEventListener('scope-open', (e) => seen.push(e as CustomEvent));

    (el.shadowRoot!.querySelector('keep-default-card') as HTMLElement).click();

    expect(seen).toHaveLength(1);
    expect(seen[0].detail.scope).toBe(db);
  });

  it('renders one card per database', async () => {
    const el = await mountLit<ScopesCardsView>(TAG, {
      databases: [database(), database({ apiName: 'other' })],
    });
    expect(el.shadowRoot!.querySelectorAll('keep-default-card')).toHaveLength(2);
  });

  it('keeps ExtraFlex’s own 20px gap where no utility overrode it', () => {
    expect(ScopesCardsView.styles.toString()).toMatch(/gap:\s*20px/);
  });
});

/** Collect a bubbling, composed event as ScopeLists would see it. */
const listen = (el: HTMLElement, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
};

describe('keep-scopes-alphabetical-view', () => {
  const TAG = 'keep-scopes-alphabetical-view';

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('groups by the initial of the api name, letters in order', async () => {
    const el = await mountLit<ScopesAlphabeticalView>(TAG, {
      databases: [database({ apiName: 'zulu' }), database({ apiName: 'alpha' }), database({ apiName: 'anvil' })],
    });
    const letters = [...el.shadowRoot!.querySelectorAll('.letter')].map((n) => n.textContent);
    expect(letters).toEqual(['A', 'Z']);
    // Grouping keys on apiName, not schemaName: the React version chose between them on a
    // pathname check that could never be true in this view, while the row below it always
    // displayed apiName.
    const names = [...el.shadowRoot!.querySelectorAll('.api-name')].map((n) => n.textContent);
    expect(names).toEqual(['alpha', 'anvil', 'zulu']);
  });

  it('shows zero results for an empty list', async () => {
    const el = await mountLit<ScopesAlphabeticalView>(TAG, { databases: [] });
    expect(el.shadowRoot!.querySelector('keep-zero-results')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.block')).toBeNull();
  });

  it('emits scope-open from a click', async () => {
    const el = await mountLit<ScopesAlphabeticalView>(TAG, { databases: [database()] });
    const seen = listen(el, 'scope-open');
    el.shadowRoot!.querySelector<HTMLElement>('.db')!.click();
    expect(seen).toHaveLength(1);
    expect((seen[0].detail as { scope: { apiName: string } }).scope.apiName).toBe('demo');
  });

  it.each(['Enter', ' '])('emits scope-open from %s', async (key) => {
    const el = await mountLit<ScopesAlphabeticalView>(TAG, { databases: [database()] });
    const seen = listen(el, 'scope-open');
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    el.shadowRoot!.querySelector('.db')!.dispatchEvent(event);
    expect(seen).toHaveLength(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('announces each row as a button in document tab order', async () => {
    const el = await mountLit<ScopesAlphabeticalView>(TAG, { databases: [database()] });
    const row = el.shadowRoot!.querySelector('.db')!;
    // tabIndex={1} in the React version, which jumps ahead of every 0 (WCAG 2.4.3).
    expect(row.getAttribute('role')).toBe('button');
    expect(row.getAttribute('tabindex')).toBe('0');
  });
});

describe('keep-scopes-stacks-view', () => {
  const TAG = 'keep-scopes-stacks-view';

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('splits active from inactive and counts each', async () => {
    const el = await mountLit<ScopesStacksView>(TAG, {
      databases: [
        database({ apiName: 'one' }),
        database({ apiName: 'two' }),
        database({ apiName: 'three', isActive: false }),
      ],
    });
    const counts = [...el.shadowRoot!.querySelectorAll('.count')].map((n) => n.textContent);
    expect(counts).toEqual(['2 Active Scope', '1 Inactive Scope']);
    expect(el.shadowRoot!.querySelectorAll('keep-slim-database-card')).toHaveLength(3);
  });

  it('counts keepconfig but does not render it', async () => {
    const el = await mountLit<ScopesStacksView>(TAG, {
      databases: [database({ apiName: 'keepconfig' }), database({ apiName: 'real' })],
    });
    // Faithful to the React version, which filtered inside the map and counted outside it.
    expect(el.shadowRoot!.querySelector('.count')!.textContent).toBe('2 Active Scope');
    expect(el.shadowRoot!.querySelectorAll('keep-slim-database-card')).toHaveLength(1);
  });

  it('shows zero results for an empty group', async () => {
    const el = await mountLit<ScopesStacksView>(TAG, { databases: [] });
    expect(el.shadowRoot!.querySelectorAll('keep-zero-results')).toHaveLength(2);
  });

  it('forwards a card-open as scope-open', async () => {
    const el = await mountLit<ScopesStacksView>(TAG, { databases: [database()] });
    const seen = listen(el, 'scope-open');
    const card = el.shadowRoot!.querySelector('keep-slim-database-card')!;
    card.dispatchEvent(
      new CustomEvent('card-open', { detail: { database: { apiName: 'demo' } }, bubbles: true, composed: true }),
    );
    expect(seen).toHaveLength(1);
    expect((seen[0].detail as { scope: { apiName: string } }).scope.apiName).toBe('demo');
  });

  it('renders no delete dialog', async () => {
    const el = await mountLit<ScopesStacksView>(TAG, { databases: [database()] });
    // The React version rendered one here with isDeleteSchema: true, on the scopes list, with
    // nothing in this view able to open it - and it shared the global flag with
    // ScopeFormContainer's, so both opened together.
    expect(el.shadowRoot!.querySelector('keep-delete-dialog')).toBeNull();
  });
});

describe('keep-scopes-multi-view', () => {
  const TAG = 'keep-scopes-multi-view';
  // Counted rather than `shadowRoot.children`: under jsdom Lit injects a <style> element
  // instead of adopting a stylesheet, so the child count is one higher than it looks.
  const VIEWS =
    'keep-scopes-cards-view, keep-scopes-default-view, keep-scopes-alphabetical-view, keep-scopes-stacks-view';

  afterEach(cleanupLit);

  it.each([
    ['card', 'keep-scopes-cards-view'],
    ['nsf', 'keep-scopes-default-view'],
    ['alphabetical', 'keep-scopes-alphabetical-view'],
    ['stack', 'keep-scopes-stacks-view'],
  ])('renders %s as %s', async (view, tag) => {
    const el = await mountLit<ScopesMultiView>(TAG, { view, databases: [database()] });
    expect(el.shadowRoot!.querySelector(tag)).toBeTruthy();
    expect(el.shadowRoot!.querySelectorAll(VIEWS)).toHaveLength(1);
  });

  it('renders nothing for an unrecognised view', async () => {
    const el = await mountLit<ScopesMultiView>(TAG, { view: 'treemap', databases: [database()] });
    expect(el.shadowRoot!.querySelectorAll(VIEWS)).toHaveLength(0);
  });

  it('lets a child scope-open through exactly once', async () => {
    const el = await mountLit<ScopesMultiView>(TAG, { view: 'alphabetical', databases: [database()] });
    const child = el.shadowRoot!.querySelector('keep-scopes-alphabetical-view') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await child.updateComplete;
    const seen = listen(el, 'scope-open');
    child.shadowRoot!.querySelector<HTMLElement>('.db')!.click();
    // Composed events cross both boundaries on their own; re-emitting here would double it.
    expect(seen).toHaveLength(1);
  });
});
