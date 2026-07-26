import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/lit-elements/lit-nsf-card';
import type NsfCard from '../../../src/components/lit-elements/lit-nsf-card';

const TAG = 'lit-nsf-card';
const q = (el: NsfCard, sel: string) => el.shadowRoot!.querySelectorAll(sel);

const database = {
  fileName: 'orders.nsf',
  databases: [
    { schemaName: 'Alpha', apiName: 'AlphaApi', nsfPath: 'orders.nsf', iconName: 'beach' },
    { schemaName: 'Beta', apiName: 'BetaApi', nsfPath: 'orders.nsf', iconName: 'beach' },
  ],
};

describe('lit-nsf-card', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a card with a search input and the database file name', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    expect(el.shadowRoot!.querySelector('section')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('wa-input')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.nsf-filename')!.textContent).toContain('orders.nsf');
  });

  it('renders one lit-schema-status per database entry', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    expect(q(el, 'lit-schema-status').length).toBe(2);
  });

  it('filters the list from the search input', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    const input = el.shadowRoot!.querySelector('wa-input') as HTMLElement & { value: string };
    input.value = 'AlphaApi';
    input.dispatchEvent(new Event('wa-input', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(q(el, 'lit-schema-status').length).toBe(1);
  });

  it('renders an icon in the card title', async () => {
    const el = await mountLit<NsfCard>(TAG, { database });
    expect(el.shadowRoot!.querySelector('.card-title wa-icon')).toBeTruthy();
  });
});
