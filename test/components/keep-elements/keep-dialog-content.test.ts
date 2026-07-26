import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-dialog-content';
import type DialogContent from '../../../src/components/keep-elements/keep-dialog-content';

const TAG = 'keep-dialog-content';

describe('keep-dialog-content', () => {
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
