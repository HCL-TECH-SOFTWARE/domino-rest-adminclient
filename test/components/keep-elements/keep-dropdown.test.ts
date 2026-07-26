import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-dropdown';
import type Dropdown from '../../../src/components/keep-elements/keep-dropdown';

const TAG = 'keep-dropdown';

const waDropdown = (el: Dropdown) => el.shadowRoot!.querySelector('wa-dropdown')!;
const trigger = (el: Dropdown) => el.shadowRoot!.querySelector('wa-button[slot="trigger"]')!;
const items = (el: Dropdown) => Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item'));

describe('keep-dropdown', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-dropdown', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    expect(waDropdown(el)).toBeTruthy();
  });

  it('shows the first choice in the trigger button after firstUpdated', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    expect(trigger(el).textContent!.trim()).toBe('Alpha');
  });

  it('renders one wa-dropdown-item per choice', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    const rendered = items(el);
    expect(rendered).toHaveLength(2);
    expect(rendered.map((item) => item.textContent!.trim())).toEqual(['Alpha', 'Beta']);
  });

  it('updates the trigger text when an item is clicked', async () => {
    const el = await mountLit<Dropdown>(TAG, { choices: ['Alpha', 'Beta'] });
    (items(el)[1] as HTMLElement).click();
    await el.updateComplete;
    expect(trigger(el).textContent!.trim()).toBe('Beta');
  });
});
