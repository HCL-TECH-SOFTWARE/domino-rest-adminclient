import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/lit-elements/lit-dialog-content';
import type DialogContent from '../../../src/components/lit-elements/lit-dialog-content';

const TAG = 'lit-dialog-content';

describe('lit-dialog-content', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a section in the shadow root', async () => {
    const el = await mountLit<DialogContent>(TAG);
    expect(el.shadowRoot!.querySelector('section')).toBeTruthy();
  });

  it('projects light-DOM children through a default slot inside the section', async () => {
    const el = await mountLit<DialogContent>(TAG);
    const slot = el.shadowRoot!.querySelector('section slot');
    expect(slot).toBeTruthy();
  });
});
