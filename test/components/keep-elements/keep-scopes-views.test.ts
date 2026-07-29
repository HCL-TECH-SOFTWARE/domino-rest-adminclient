/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import ScopesDefaultView from '../../../src/components/keep-elements/keep-scopes-default-view';
import ScopesCardsView from '../../../src/components/keep-elements/keep-scopes-cards-view';

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
