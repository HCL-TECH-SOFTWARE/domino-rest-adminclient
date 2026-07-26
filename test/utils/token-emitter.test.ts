import { describe, it, expect } from 'vitest';
import { emitTokenEvent, waitForToken } from '../../src/utils/token-emitter';

describe('token-emitter', () => {
  it('resolves the waiter with the emitted token', async () => {
    const pending = waitForToken();
    emitTokenEvent('my-token');
    await expect(pending).resolves.toBe('my-token');
  });

  it('resolves multiple concurrent waiters from a single emit', async () => {
    const first = waitForToken();
    const second = waitForToken();
    emitTokenEvent('shared-token');
    await expect(Promise.all([first, second])).resolves.toEqual([
      'shared-token',
      'shared-token',
    ]);
  });

  it('does not throw when emitting with no waiters', () => {
    expect(() => emitTokenEvent('lonely-token')).not.toThrow();
  });

  it('does not resolve before a token is emitted', async () => {
    const pending = waitForToken();
    let resolved = false;
    pending.then(() => {
      resolved = true;
    });
    // flush the microtask queue; nothing has been emitted yet
    await Promise.resolve();
    expect(resolved).toBe(false);

    emitTokenEvent('later-token');
    await expect(pending).resolves.toBe('later-token');
  });

  it('only reacts to the next emit, not to earlier ones', async () => {
    // an emit with no listener is dropped by `once`
    emitTokenEvent('dropped-token');
    const pending = waitForToken();
    emitTokenEvent('caught-token');
    await expect(pending).resolves.toBe('caught-token');
  });
});
