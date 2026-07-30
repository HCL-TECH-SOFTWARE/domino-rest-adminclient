/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-icon-dropdown';
import type IconDropdown from '../../../src/components/keep-elements/keep-icon-dropdown';
import {
  APP_ICON_NAMES,
  DEFAULT_APP_ICON_NAME,
  loadAppIcons,
  resetAppIconsForTest,
} from '../../../src/services/app-icons';

/**
 * Stand-in for the 221 KB base64 chunk behind the lazy `import()` (#772). Two of the 86
 * names carry a payload so the fallback for the other 84 is exercised as well.
 */
vi.mock('../../../src/styles/app-icons', () => ({
  default: { beach: 'QkVBQ0g=', binoculars: 'QklOTw==' },
}));

/**
 * The real service, with `loadAppIcons` wrapped so one test can make the chunk fail. Every
 * other export is the genuine one, sharing the same module state, so `appIconUri` still
 * answers from whatever the mocked chunk provided.
 */
vi.mock('../../../src/services/app-icons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/app-icons')>();
  return { ...actual, loadAppIcons: vi.fn(actual.loadAppIcons) };
});

const TAG = 'keep-icon-dropdown';

const trigger = (el: IconDropdown) =>
  el.shadowRoot!.querySelector('button[slot="trigger"]') as HTMLButtonElement;
const caption = (el: IconDropdown) => trigger(el).querySelector('.name')!.textContent!.trim();
const items = (el: IconDropdown) =>
  Array.from(el.shadowRoot!.querySelectorAll('wa-dropdown-item')) as (HTMLElement & {
    value: string;
    checked: boolean;
    updateComplete: Promise<unknown>;
  })[];
const itemFor = (el: IconDropdown, name: string) => items(el).find((item) => item.value === name)!;
const triggerImage = (el: IconDropdown) => trigger(el).querySelector('img');

/** The chunk load is a promise chain, so let the microtasks drain before re-rendering. */
const settle = async (el: IconDropdown) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
};

/** A picker whose icons have arrived. */
const mountLoaded = async (props: Partial<IconDropdown> = {}) => {
  const el = await mountLit<IconDropdown>(TAG, props);
  await settle(el);
  return el;
};

/** What Web Awesome sends when an item is chosen, by pointer *or* by keyboard. */
const waSelect = (el: IconDropdown, item: { value: string; checked: boolean }) =>
  el.shadowRoot!.querySelector('wa-dropdown')!.dispatchEvent(
    new CustomEvent('wa-select', {
      detail: { item },
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );

describe('keep-icon-dropdown', () => {
  beforeEach(() => {
    resetAppIconsForTest();
    vi.mocked(loadAppIcons).mockClear();
  });

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('defaults to the default icon name', async () => {
    const el = await mountLoaded();
    expect(el.iconName).toBe(DEFAULT_APP_ICON_NAME);
    expect(caption(el)).toBe(DEFAULT_APP_ICON_NAME);
  });

  it('lower-cases the caption, as the original did before capitalising it in CSS', async () => {
    const el = await mountLoaded({ iconName: 'Binoculars' });
    expect(caption(el)).toBe('binoculars');
  });

  it('offers every application icon, in order, each carrying its name as the value', async () => {
    const el = await mountLoaded();
    expect(items(el).map((item) => item.value)).toEqual([...APP_ICON_NAMES]);
    expect(items(el).map((item) => item.textContent!.trim())).toEqual([...APP_ICON_NAMES]);
  });

  it('ticks exactly the chosen icon, derived from the name rather than a second index', async () => {
    const el = await mountLoaded({ iconName: 'binoculars' });
    expect(items(el).filter((item) => item.checked).map((item) => item.value)).toEqual([
      'binoculars',
    ]);
  });

  it('moves the tick when the parent changes the icon', async () => {
    const el = await mountLoaded({ iconName: 'beach' });
    el.iconName = 'binoculars';
    await el.updateComplete;
    expect(itemFor(el, 'beach').checked).toBe(false);
    expect(itemFor(el, 'binoculars').checked).toBe(true);
    expect(caption(el)).toBe('binoculars');
  });

  it('emits icon-select for a keyboard selection, which never produces a click', async () => {
    // The handler is on the dropdown, not on each item (#925): Web Awesome synthesises a
    // click only for pointer selection, so a per-item click handler is dead for the arrow
    // keys and Enter. Nothing is clicked here.
    const el = await mountLoaded();
    const onSelect = vi.fn();
    el.addEventListener('icon-select', onSelect);

    waSelect(el, { value: 'binoculars', checked: true });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].detail).toEqual({ iconName: 'binoculars' });
  });

  it('emits icon-select when a real menu item is activated by pointer', async () => {
    // Drives Web Awesome itself rather than a hand-made wa-select, so the value on the item
    // and the shape of detail.item are proven rather than assumed.
    const el = await mountLoaded();
    const onSelect = vi.fn();
    el.addEventListener('icon-select', onSelect);

    itemFor(el, 'bridge').click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].detail).toEqual({ iconName: 'bridge' });
  });

  it('does not change its own icon on selection — the parent owns the value', async () => {
    const el = await mountLoaded({ iconName: 'beach' });
    itemFor(el, 'bridge').click();
    await el.updateComplete;
    expect(el.iconName).toBe('beach');
    expect(caption(el)).toBe('beach');
  });

  it('leaves the tick on the chosen icon when it is picked again', async () => {
    // wa-dropdown flips a checkbox item's own `checked` before emitting, and the binding's
    // committed value has not moved — so without the correction in the handler, re-picking
    // the current icon unticks its row and nothing puts it back.
    const el = await mountLoaded({ iconName: 'beach' });
    itemFor(el, 'beach').click();
    await el.updateComplete;
    expect(itemFor(el, 'beach').checked).toBe(true);
  });

  it('does not tick a row the parent has not accepted', async () => {
    const el = await mountLoaded({ iconName: 'beach' });
    itemFor(el, 'bridge').click();
    await el.updateComplete;
    expect(itemFor(el, 'bridge').checked).toBe(false);
    expect(itemFor(el, 'beach').checked).toBe(true);
  });

  it('does not let the composed wa-select escape past icon-select', async () => {
    const el = await mountLoaded();
    const leaked = vi.fn();
    document.body.addEventListener('wa-select', leaked);

    waSelect(el, { value: 'beach', checked: true });

    expect(leaked).not.toHaveBeenCalled();
    document.body.removeEventListener('wa-select', leaked);
  });

  it('shows the shared skeleton until the lazily loaded payloads arrive', async () => {
    const el = await mountLit<IconDropdown>(TAG);
    expect(triggerImage(el)).toBeNull();
    expect(trigger(el).querySelector('.app-icon-skeleton')).toBeTruthy();

    await settle(el);

    expect(trigger(el).querySelector('.app-icon-skeleton')).toBeNull();
    expect(triggerImage(el)!.getAttribute('src')).toBe('data:image/svg+xml;base64,QkVBQ0g=');
  });

  it('keeps the skeleton up when the payload chunk fails to load', async () => {
    vi.mocked(loadAppIcons).mockRejectedValueOnce(new Error('offline'));
    const el = await mountLit<IconDropdown>(TAG);

    await settle(el);

    expect(trigger(el).querySelector('.app-icon-skeleton')).toBeTruthy();
    expect(triggerImage(el)).toBeNull();
  });

  it('falls back to the default icon for a name with no payload of its own', async () => {
    const el = await mountLoaded({ iconName: 'bridge' });
    expect(triggerImage(el)!.getAttribute('src')).toBe('data:image/svg+xml;base64,QkVBQ0g=');
    expect(caption(el), 'the caption still names what was asked for').toBe('bridge');
  });

  it('requests the payload chunk itself rather than waiting to be warmed', async () => {
    await mountLoaded();
    expect(loadAppIcons).toHaveBeenCalled();
  });

  it('names the trigger for a screen reader, since the caption is outside this root', async () => {
    const el = await mountLoaded({ iconName: 'binoculars' });
    expect(trigger(el).getAttribute('aria-label')).toBe('Icon: binoculars');
  });

  it('lets the caller say what the control is called', async () => {
    const el = await mountLoaded({ label: 'Schema icon', iconName: 'beach' });
    expect(trigger(el).getAttribute('aria-label')).toBe('Schema icon: beach');
  });

  it('gives the trigger an explicit button type so it cannot submit a form', async () => {
    const el = await mountLoaded();
    expect(trigger(el).type).toBe('button');
  });

  it('marks the icon tiles decorative — the name is beside them', async () => {
    const el = await mountLoaded();
    expect(triggerImage(el)!.getAttribute('alt')).toBe('');
    expect(itemFor(el, 'beach').querySelector('img')!.getAttribute('alt')).toBe('');
  });

  it('slots the items straight into the dropdown, so keyboard navigation can find them', async () => {
    // wa-dropdown reads its items from the default slot's *assigned elements*, which are the
    // top-level assignments and not their descendants. Wrap them in anything and that list
    // is empty: arrow keys, Home/End, type-ahead, roving focus and the checkmark-column
    // alignment all stop, while clicks keep working because the click handler walks up from
    // the event target. Same failure shape as #925 — fine with a mouse, dead without one.
    const el = await mountLoaded();
    // Through `unknown`: the tag map types this as WaDropdown, whose `getItems` is not public,
    // so it cannot be widened to the shape read here in a single assertion.
    const dropdown = el.shadowRoot!.querySelector('wa-dropdown')! as unknown as HTMLElement & {
      getItems: (includeDisabled?: boolean) => Element[];
      updateComplete: Promise<unknown>;
    };
    await dropdown.updateComplete;
    expect(dropdown.getItems().length).toBe(APP_ICON_NAMES.length);
  });

  it('announces each row as a checkable menu item', async () => {
    const el = await mountLoaded({ iconName: 'beach' });
    await itemFor(el, 'beach').updateComplete;
    expect(itemFor(el, 'beach').getAttribute('role')).toBe('menuitemcheckbox');
    expect(itemFor(el, 'beach').getAttribute('aria-checked')).toBe('true');
  });
});
