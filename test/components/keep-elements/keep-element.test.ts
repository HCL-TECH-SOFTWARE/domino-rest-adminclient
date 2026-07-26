import { afterEach, describe, expect, it } from 'vitest';
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from '../../../src/components/keep-elements/keep-element';
import { cleanupLit } from '../../test-utils/lit';

@customElement('keep-emit-fixture')
class EmitFixture extends KeepElement {
  fire(detail?: unknown, options?: EventInit) {
    return this.emit('test-event', detail, options);
  }

  render() {
    return html`<span></span>`;
  }
}

describe('KeepElement.emit', () => {
  afterEach(cleanupLit);

  it('dispatches a bubbling, composed CustomEvent carrying the detail', () => {
    const el = new EmitFixture();
    document.body.appendChild(el);
    let received: CustomEvent | undefined;
    el.addEventListener('test-event', (e) => {
      received = e as CustomEvent;
    });

    el.fire({ value: 42 });

    expect(received).toBeDefined();
    expect(received!.bubbles).toBe(true);
    expect(received!.composed).toBe(true);
    expect(received!.detail).toEqual({ value: 42 });
  });

  it('is non-cancelable by default but honours EventInit overrides', () => {
    const el = new EmitFixture();
    document.body.appendChild(el);

    expect(el.fire('x').cancelable).toBe(false);
    expect(el.fire('y', { cancelable: true }).cancelable).toBe(true);
  });
});
