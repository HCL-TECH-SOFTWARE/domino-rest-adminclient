import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/lit-elements/lit-tooltip';
import type Tooltip from '../../../src/components/lit-elements/lit-tooltip';

const TAG = 'lit-tooltip';

/** The imperatively-created popup is appended to the document body, not the shadow root. */
const getPopup = () => document.body.querySelector('[role="tooltip"]') as HTMLElement | null;
/** The arrow div is appended immediately after the popup. */
const getArrow = (popup: HTMLElement) => popup.nextElementSibling as HTMLElement;

const hover = (el: Tooltip) => el.dispatchEvent(new MouseEvent('mouseenter'));
const unhover = (el: Tooltip) => el.dispatchEvent(new MouseEvent('mouseleave'));

describe('lit-tooltip', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('exposes the default property values', async () => {
    const el = await mountLit<Tooltip>(TAG);
    expect(el.content).toBe('');
    expect(el.placement).toBe('top');
    expect(el.withoutArrow).toBe(false);
  });

  it('maps the without-arrow attribute to the withoutArrow property', async () => {
    const el = document.createElement(TAG) as Tooltip;
    el.setAttribute('without-arrow', '');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.withoutArrow).toBe(true);
  });

  it('renders a single default slot in the shadow DOM', async () => {
    const el = await mountLit<Tooltip>(TAG);
    expect(el.shadowRoot!.querySelectorAll('slot')).toHaveLength(1);
  });

  it('appends a hidden role=tooltip popup to the document body on connect', async () => {
    await mountLit<Tooltip>(TAG, { content: 'Hi' });
    const popup = getPopup();
    expect(popup).toBeTruthy();
    expect(popup!.style.display).toBe('none');
  });

  it('shows the popup with the content text on mouseenter', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hello' });
    hover(el);
    const popup = getPopup()!;
    expect(popup.style.display).toBe('block');
    expect(popup.textContent).toBe('Hello');
  });

  it('hides the popup again on mouseleave', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hello' });
    hover(el);
    expect(getPopup()!.style.display).toBe('block');
    unhover(el);
    expect(getPopup()!.style.display).toBe('none');
  });

  it('does not show the popup when content is empty', async () => {
    const el = await mountLit<Tooltip>(TAG);
    hover(el);
    expect(getPopup()!.style.display).toBe('none');
  });

  it('shows the popup on focus', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Focus me' });
    el.dispatchEvent(new FocusEvent('focus'));
    expect(getPopup()!.style.display).toBe('block');
  });

  it('shows the arrow by default when the popup is shown', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hi' });
    hover(el);
    const arrow = getArrow(getPopup()!);
    expect(arrow.style.display).toBe('block');
  });

  it('hides the arrow when without-arrow is set but still shows the popup', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hi', withoutArrow: true });
    hover(el);
    const popup = getPopup()!;
    expect(popup.style.display).toBe('block');
    expect(getArrow(popup).style.display).toBe('none');
  });

  it('positions the popup below the trigger for placement=bottom', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hi', placement: 'bottom' });
    hover(el);
    expect(getPopup()!.style.top).toBe('12px');
  });

  it('positions the popup to the right of the trigger for placement=right', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hi', placement: 'right' });
    hover(el);
    expect(getPopup()!.style.left).toBe('12px');
  });

  it('uses top placement positioning by default', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hi' });
    hover(el);
    expect(getPopup()!.style.top).toBe('4px');
  });

  it('updates the popup text live when content changes while visible', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'First' });
    hover(el);
    expect(getPopup()!.textContent).toBe('First');
    el.content = 'Second';
    await el.updateComplete;
    expect(getPopup()!.textContent).toBe('Second');
  });

  it('removes the popup from the document body on disconnect', async () => {
    const el = await mountLit<Tooltip>(TAG, { content: 'Hi' });
    expect(getPopup()).toBeTruthy();
    el.remove();
    expect(getPopup()).toBeNull();
  });
});
