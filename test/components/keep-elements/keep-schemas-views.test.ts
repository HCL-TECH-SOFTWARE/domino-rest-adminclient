/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import {
  fetchKeepPermissions,
  fetchKeepScopes,
  setOnlyShowSchemasWithScopes,
} from '../../../src/store/databases/reducer';
import { INIT_STATE } from '../../../src/store/dialog/types';
import '../../../src/components/keep-elements/keep-schemas-cards-view';
import '../../../src/components/keep-elements/keep-schemas-default-view';
import '../../../src/components/keep-elements/keep-schemas-stacks-view';
import '../../../src/components/keep-elements/keep-schemas-alphabetical-view';
import '../../../src/components/keep-elements/keep-schemas-multi-view';
import type SchemasCardsView from '../../../src/components/keep-elements/keep-schemas-cards-view';
import type SchemasDefaultView from '../../../src/components/keep-elements/keep-schemas-default-view';
import type SchemasStacksView from '../../../src/components/keep-elements/keep-schemas-stacks-view';
import type SchemasAlphabeticalView from '../../../src/components/keep-elements/keep-schemas-alphabetical-view';
import type SchemasMultiView from '../../../src/components/keep-elements/keep-schemas-multi-view';

const schema = (over: Record<string, unknown> = {}) => ({
  apiName: 'demo',
  schemaName: 'Demo',
  nsfPath: 'demo.nsf',
  fileName: 'demo.nsf',
  iconName: 'beach',
  description: 'a demo schema',
  ...over,
});

/** A scope pointing at a schema, which is what puts it in the "in use" group. */
const scopeFor = (nsfPath: string, schemaName: string) => ({ nsfPath, schemaName });

const listen = (el: HTMLElement, type: string) => {
  const seen: CustomEvent[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
};

describe('the schemas card views', () => {
  beforeEach(() => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch(fetchKeepPermissions({ createDbMapping: true, deleteDbMapping: true }));
    store.dispatch(fetchKeepScopes([] as never));
    store.dispatch(setOnlyShowSchemasWithScopes(false));
  });

  afterEach(() => {
    cleanupLit();
    store.dispatch({ type: INIT_STATE });
  });

  describe('keep-schemas-cards-view', () => {
    const TAG = 'keep-schemas-cards-view';

    it('registers the custom element', () => {
      expect(customElements.get(TAG)).toBeTruthy();
    });

    it('renders one card per schema', async () => {
      const el = await mountLit<SchemasCardsView>(TAG, {
        databases: [schema(), schema({ schemaName: 'Other', nsfPath: 'other.nsf' })],
      });
      expect(el.shadowRoot!.querySelectorAll('keep-default-card')).toHaveLength(2);
    });

    it('derives the configured flag from the store rather than storing it', async () => {
      const el = await mountLit<SchemasCardsView>(TAG, { databases: [schema()] });
      const card = () => el.shadowRoot!.querySelector('keep-default-card') as HTMLElement & {
        status: boolean;
      };
      expect(card().status).toBe(false);
      // The React version kept this in useState behind an effect whose guard compared two
      // arrays built a line apart, so it never guarded anything.
      store.dispatch(fetchKeepScopes([scopeFor('demo.nsf', 'Demo')] as never));
      await el.updateComplete;
      expect(card().status).toBe(true);
    });

    it('emits schema-open instead of navigating', async () => {
      const el = await mountLit<SchemasCardsView>(TAG, { databases: [schema()] });
      const seen = listen(el, 'schema-open');
      el.shadowRoot!.querySelector<HTMLElement>('keep-default-card')!.click();
      expect(seen).toHaveLength(1);
      expect((seen[0].detail as { database: { schemaName: string } }).database.schemaName).toBe(
        'Demo',
      );
    });

    it('opens the delete dialog on the chosen schema', async () => {
      const el = await mountLit<SchemasCardsView>(TAG, { databases: [schema()] });
      const card = el.shadowRoot!.querySelector('keep-default-card') as HTMLElement & {
        onDelete: () => void;
      };
      card.onDelete();
      await el.updateComplete;
      expect(store.getState().dialog.deleteDialog).toBe(true);
      const dialog = el.shadowRoot!.querySelector('keep-delete-dialog') as HTMLElement & {
        selected: { schemaName: string; nsfPath: string; isDeleteSchema: boolean };
      };
      expect(dialog.selected).toEqual({
        isDeleteSchema: true,
        nsfPath: 'demo.nsf',
        schemaName: 'Demo',
      });
    });

    it('refuses without the permission, and raises an alert instead', async () => {
      store.dispatch(fetchKeepPermissions({ createDbMapping: true, deleteDbMapping: false }));
      const el = await mountLit<SchemasCardsView>(TAG, { databases: [schema()] });
      const card = el.shadowRoot!.querySelector('keep-default-card') as HTMLElement & {
        onDelete: () => void;
      };
      card.onDelete();
      expect(store.getState().dialog.deleteDialog).toBe(false);
      expect(store.getState().alert.message).toContain('permission to delete schema');
    });
  });

  describe('keep-schemas-default-view', () => {
    const TAG = 'keep-schemas-default-view';

    it('registers the custom element', () => {
      expect(customElements.get(TAG)).toBeTruthy();
    });

    it('renders the heading and one nsf card per file', async () => {
      const el = await mountLit<SchemasDefaultView>(TAG, { databases: [schema()] });
      expect(el.shadowRoot!.querySelector('.heading')!.textContent).toContain('Databases Schema');
      expect(el.shadowRoot!.querySelectorAll('keep-nsf-card')).toHaveLength(1);
    });

    it('passes stable callbacks, so a re-render is not a property change', async () => {
      const el = await mountLit<SchemasDefaultView>(TAG, { databases: [schema()] });
      const card = () => el.shadowRoot!.querySelector('keep-nsf-card') as HTMLElement & {
        open: unknown;
        deleteFn: unknown;
      };
      const before = { open: card().open, deleteFn: card().deleteFn };
      el.requestUpdate();
      await el.updateComplete;
      expect(card().open).toBe(before.open);
      expect(card().deleteFn).toBe(before.deleteFn);
    });

    it('emits schema-open through the card callback', async () => {
      const el = await mountLit<SchemasDefaultView>(TAG, { databases: [schema()] });
      const seen = listen(el, 'schema-open');
      const card = el.shadowRoot!.querySelector('keep-nsf-card') as HTMLElement & {
        open: (data: unknown) => void;
      };
      card.open(schema());
      expect(seen).toHaveLength(1);
    });
  });

  describe('keep-schemas-stacks-view', () => {
    const TAG = 'keep-schemas-stacks-view';

    const groups = (el: SchemasStacksView) =>
      [...el.shadowRoot!.querySelectorAll('.count')].map((n) => n.textContent);

    it('registers the custom element', () => {
      expect(customElements.get(TAG)).toBeTruthy();
    });

    it('splits schemas by whether a scope points at them', async () => {
      store.dispatch(fetchKeepScopes([scopeFor('demo.nsf', 'Demo')] as never));
      const el = await mountLit<SchemasStacksView>(TAG, {
        databases: [schema(), schema({ schemaName: 'Spare', nsfPath: 'spare.nsf' })],
      });
      expect(groups(el)).toEqual([
        '1 in use Schema(s) (configured with Scope)',
        '1 not in use Schema(s) (not configured with Scope)',
      ]);
    });

    it('hides the not-in-use group when the switch is on', async () => {
      store.dispatch(setOnlyShowSchemasWithScopes(true));
      const el = await mountLit<SchemasStacksView>(TAG, { databases: [schema()] });
      expect(groups(el)).toHaveLength(1);
      expect(groups(el)[0]).toContain('in use Schema(s)');
    });

    it('reacts to the switch without a new property', async () => {
      const el = await mountLit<SchemasStacksView>(TAG, { databases: [schema()] });
      expect(groups(el)).toHaveLength(2);
      store.dispatch(setOnlyShowSchemasWithScopes(true));
      await el.updateComplete;
      expect(groups(el)).toHaveLength(1);
    });

    it('counts keepconfig but does not render it', async () => {
      const el = await mountLit<SchemasStacksView>(TAG, {
        databases: [schema({ apiName: 'keepconfig' })],
      });
      expect(groups(el)[1]).toBe('1 not in use Schema(s) (not configured with Scope)');
      expect(el.shadowRoot!.querySelectorAll('keep-slim-database-card')).toHaveLength(0);
    });

    it('marks its cards as schema cards, so they show the delete control', async () => {
      const el = await mountLit<SchemasStacksView>(TAG, { databases: [schema()] });
      const card = el.shadowRoot!.querySelector('keep-slim-database-card') as HTMLElement & {
        isSchema: boolean;
      };
      expect(card.isSchema).toBe(true);
    });

    it('forwards card-open as schema-open and card-delete to the dialog', async () => {
      const el = await mountLit<SchemasStacksView>(TAG, { databases: [schema()] });
      const seen = listen(el, 'schema-open');
      const card = el.shadowRoot!.querySelector('keep-slim-database-card')!;
      const detail = { database: schema() };
      card.dispatchEvent(new CustomEvent('card-open', { detail, bubbles: true, composed: true }));
      expect(seen).toHaveLength(1);

      card.dispatchEvent(new CustomEvent('card-delete', { detail, bubbles: true, composed: true }));
      await el.updateComplete;
      expect(store.getState().dialog.deleteDialog).toBe(true);
      const dialog = el.shadowRoot!.querySelector('keep-delete-dialog') as HTMLElement & {
        selected: { schemaName: string };
      };
      expect(dialog.selected.schemaName).toBe('Demo');
    });

    it('shows zero results for an empty group', async () => {
      const el = await mountLit<SchemasStacksView>(TAG, { databases: [] });
      const labels = [...el.shadowRoot!.querySelectorAll('keep-zero-results')].map((n) =>
        n.getAttribute('mainLabel'),
      );
      expect(labels).toEqual(['0 in use Schema ', '0 not in use Schema']);
    });
  });

  describe('keep-schemas-alphabetical-view', () => {
    const TAG = 'keep-schemas-alphabetical-view';

    const letters = (el: SchemasAlphabeticalView) =>
      [...el.shadowRoot!.querySelectorAll('.each-letter')] as HTMLButtonElement[];

    it('registers the custom element', () => {
      expect(customElements.get(TAG)).toBeTruthy();
    });

    it('groups by the initial of the schema name, letters in order', async () => {
      const el = await mountLit<SchemasAlphabeticalView>(TAG, {
        databases: [schema({ schemaName: 'Zeta' }), schema({ schemaName: 'Alpha' })],
      });
      const blocks = [...el.shadowRoot!.querySelectorAll('.block')].map((b) =>
        b.getAttribute('data-letter'),
      );
      // The React version chose between schemaName and apiName on a pathname test that was
      // always true in this view; the key is stated once now.
      expect(blocks).toEqual(['A', 'Z']);
    });

    it('offers all 26 letters and disables the ones with nothing under them', async () => {
      const el = await mountLit<SchemasAlphabeticalView>(TAG, {
        databases: [schema({ schemaName: 'Alpha' })],
      });
      expect(letters(el)).toHaveLength(26);
      // Real buttons, so a disabled letter is announced as disabled rather than carrying
      // tabIndex={-1} on a div (WCAG 4.1.2).
      expect(letters(el).find((b) => b.textContent!.trim() === 'A')!.disabled).toBe(false);
      expect(letters(el).find((b) => b.textContent!.trim() === 'B')!.disabled).toBe(true);
    });

    it('marks the chosen letter as current', async () => {
      const el = await mountLit<SchemasAlphabeticalView>(TAG, {
        databases: [schema({ schemaName: 'Alpha' })],
      });
      const a = letters(el).find((b) => b.textContent!.trim() === 'A')!;
      a.click();
      await el.updateComplete;
      expect(a.getAttribute('aria-current')).toBe('true');
    });

    it('names the usage bar, which was colour alone', async () => {
      const el = await mountLit<SchemasAlphabeticalView>(TAG, { databases: [schema()] });
      const bar = el.shadowRoot!.querySelector('.status')!;
      // A tooltip is not an accessible name (WCAG 1.1.1).
      expect(bar.getAttribute('role')).toBe('img');
      expect(bar.getAttribute('aria-label')).toBe('Not used by Scopes');

      store.dispatch(fetchKeepScopes([scopeFor('demo.nsf', 'Demo')] as never));
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.status')!.getAttribute('aria-label')).toBe(
        'Used by Scopes',
      );
    });

    it('emits schema-open from the row', async () => {
      const el = await mountLit<SchemasAlphabeticalView>(TAG, { databases: [schema()] });
      const seen = listen(el, 'schema-open');
      el.shadowRoot!.querySelector<HTMLElement>('.text-container')!.click();
      expect(seen).toHaveLength(1);
    });

    it('names the icon-only delete control and opens the dialog on that schema', async () => {
      const el = await mountLit<SchemasAlphabeticalView>(TAG, { databases: [schema()] });
      const button = el.shadowRoot!.querySelector<HTMLElement>('.delete-button')!;
      expect(button.getAttribute('aria-label')).toBe('Delete schema Demo');
      button.click();
      await el.updateComplete;
      expect(store.getState().dialog.deleteDialog).toBe(true);
      const dialog = el.shadowRoot!.querySelector('keep-delete-dialog') as HTMLElement & {
        selected: { schemaName: string };
      };
      expect(dialog.selected.schemaName).toBe('Demo');
    });

    it('refuses to delete without the permission', async () => {
      store.dispatch(fetchKeepPermissions({ createDbMapping: true, deleteDbMapping: false }));
      const el = await mountLit<SchemasAlphabeticalView>(TAG, { databases: [schema()] });
      el.shadowRoot!.querySelector<HTMLElement>('.delete-button')!.click();
      expect(store.getState().dialog.deleteDialog).toBe(false);
      expect(store.getState().alert.message).toContain('permission to delete schema');
    });
  });

  describe('keep-schemas-multi-view', () => {
    const TAG = 'keep-schemas-multi-view';
    const VIEWS =
      'keep-schemas-cards-view, keep-schemas-default-view, keep-schemas-alphabetical-view, keep-schemas-stacks-view';

    it.each([
      ['card', 'keep-schemas-cards-view'],
      ['nsf', 'keep-schemas-default-view'],
      ['alphabetical', 'keep-schemas-alphabetical-view'],
      ['stack', 'keep-schemas-stacks-view'],
    ])('renders %s as %s', async (view, tag) => {
      const el = await mountLit<SchemasMultiView>(TAG, { view, databases: [schema()] });
      expect(el.shadowRoot!.querySelector(tag)).toBeTruthy();
      expect(el.shadowRoot!.querySelectorAll(VIEWS)).toHaveLength(1);
    });

    it('renders nothing for an unrecognised view', async () => {
      const el = await mountLit<SchemasMultiView>(TAG, { view: 'treemap', databases: [schema()] });
      expect(el.shadowRoot!.querySelectorAll(VIEWS)).toHaveLength(0);
    });

    it('lets a child schema-open through exactly once', async () => {
      const el = await mountLit<SchemasMultiView>(TAG, { view: 'card', databases: [schema()] });
      const child = el.shadowRoot!.querySelector('keep-schemas-cards-view') as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
      await child.updateComplete;
      const seen = listen(el, 'schema-open');
      child.shadowRoot!.querySelector<HTMLElement>('keep-default-card')!.click();
      // Composed events cross both boundaries unaided; forwarding would double it.
      expect(seen).toHaveLength(1);
    });
  });
});
