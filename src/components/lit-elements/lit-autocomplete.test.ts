import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import './lit-autocomplete';
import type Autocomplete from './lit-autocomplete';

const TAG = 'lit-autocomplete';

// jsdom does not implement Element.scrollIntoView, which _scrollIntoView() calls
// during keyboard navigation. Provide a no-op so those code paths don't throw.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

const shadow = (el: Autocomplete) => el.shadowRoot!;

/** The dropdown-toggle button is always the last button in the template. */
const toggleButton = (el: Autocomplete) => {
  const buttons = shadow(el).querySelectorAll('button');
  return buttons[buttons.length - 1] as HTMLButtonElement;
};

const input = (el: Autocomplete) => shadow(el).querySelector('input') as HTMLInputElement;

const listItems = (el: Autocomplete) =>
  Array.from(shadow(el).querySelectorAll('li')) as HTMLLIElement[];

describe('lit-autocomplete', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the default structure with a hidden dropdown and no error', async () => {
    const el = await mountLit<Autocomplete>(TAG);
    expect(shadow(el).querySelector('.parent-container')).toBeTruthy();
    expect(shadow(el).querySelector('.autocomplete-container')).toBeTruthy();
    expect(input(el)).toBeTruthy();

    const dropdown = shadow(el).querySelector('.dropdown')!;
    expect(dropdown).toBeTruthy();
    expect(dropdown.classList.contains('show')).toBe(false);

    // No error => the error paragraph is empty.
    expect(shadow(el).querySelector('.input-container')!.classList.contains('error')).toBe(false);
    expect(shadow(el).querySelector('p')!.textContent).toBe('');
  });

  it('renders every option in the dropdown after opening it', async () => {
    const el = await mountLit<Autocomplete>(TAG, { options: ['Apple', 'Banana', 'Cherry'] });

    // filteredOptions starts empty; opening the dropdown populates it.
    expect(listItems(el)).toHaveLength(0);

    toggleButton(el).click();
    await el.updateComplete;

    const items = listItems(el);
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.textContent!.trim())).toEqual(['Apple', 'Banana', 'Cherry']);
    expect(shadow(el).querySelector('.dropdown')!.classList.contains('show')).toBe(true);
  });

  it('filters the options as the user types', async () => {
    const el = await mountLit<Autocomplete>(TAG, { options: ['Apple', 'Banana', 'Avocado'] });

    input(el).value = 'av';
    input(el).dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;

    expect(el.selectedOption).toBe('av');
    const items = listItems(el);
    expect(items).toHaveLength(1);
    expect(items[0].textContent!.trim()).toBe('Avocado');
  });

  it('selecting an option updates selectedOption and dispatches change', async () => {
    const el = await mountLit<Autocomplete>(TAG, { options: ['Apple', 'Banana'] });
    const changes: Event[] = [];
    el.addEventListener('change', (e) => changes.push(e));

    toggleButton(el).click();
    await el.updateComplete;

    listItems(el)[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await el.updateComplete;

    expect(el.selectedOption).toBe('Banana');
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('change');
    // Selecting closes the dropdown.
    expect(shadow(el).querySelector('.dropdown')!.classList.contains('show')).toBe(false);
  });

  it('supports keyboard navigation (ArrowDown/ArrowUp/Enter)', async () => {
    const el = await mountLit<Autocomplete>(TAG, { options: ['Apple', 'Banana', 'Cherry'] });
    const changes: Event[] = [];
    el.addEventListener('change', (e) => changes.push(e));

    toggleButton(el).click();
    await el.updateComplete;

    const press = async (key: string) => {
      input(el).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await el.updateComplete;
    };

    await press('ArrowDown');
    expect(listItems(el)[0].classList.contains('highlighted')).toBe(true);

    await press('ArrowDown');
    expect(listItems(el)[1].classList.contains('highlighted')).toBe(true);

    await press('ArrowUp');
    expect(listItems(el)[0].classList.contains('highlighted')).toBe(true);

    await press('Enter');
    expect(el.selectedOption).toBe('Apple');
    expect(changes).toHaveLength(1);
    expect(shadow(el).querySelector('.dropdown')!.classList.contains('show')).toBe(false);
  });

  it('displays the error class and errorMessage when error is set', async () => {
    const el = await mountLit<Autocomplete>(TAG, {
      error: true,
      errorMessage: 'This field is required',
    });

    expect(shadow(el).querySelector('.input-container')!.classList.contains('error')).toBe(true);
    expect(shadow(el).querySelector('p')!.textContent).toBe('This field is required');
  });

  it('uses initialOption as the input value when nothing is selected', async () => {
    const el = await mountLit<Autocomplete>(TAG, { initialOption: 'Default choice' });
    expect(input(el).value).toBe('Default choice');
  });

  it('renders the selected option icon when icons are provided', async () => {
    const el = await mountLit<Autocomplete>(TAG, {
      icons: { Apple: 'QVBQTEU=' },
      selectedOption: 'Apple',
    });

    // hasIcons is computed in updated(); force the next render to apply it.
    el.requestUpdate();
    await el.updateComplete;

    const img = shadow(el).querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('data:image/svg+xml;base64,QVBQTEU=');
  });
});
