/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runSaveFunction,
  setSaveFunction,
} from '../../../src/store/navigationGuard/saveFunction';

/**
 * The half of the old `NavigationGuardContext` that is *not* state: the save function the
 * dialog calls. It was a `useRef` in the provider; it is a module singleton now, for the
 * reason spelled out in the module — a closure is not something a store should hold.
 *
 * Module state outlives a test, so every case here leaves it cleared.
 */
afterEach(() => setSaveFunction(null));

describe('the registered save function', () => {
  it('runs the function that was registered, and awaits it', async () => {
    const order: string[] = [];
    setSaveFunction(async () => {
      await Promise.resolve();
      order.push('saved');
    });

    await runSaveFunction();
    order.push('after');

    // Not just "was called" — the dialog navigates as soon as this resolves, so a save that
    // was started but not waited for would race the page it is being saved from.
    expect(order).toEqual(['saved', 'after']);
  });

  it('resolves rather than throwing when nothing is registered', async () => {
    // The dialog's Save button must still let the user leave. A screen that marked itself
    // dirty without registering a save has a bug; refusing to navigate does not report it.
    await expect(runSaveFunction()).resolves.toBeUndefined();
  });

  it('replaces the previous registration rather than accumulating', async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);
    setSaveFunction(first);
    setSaveFunction(second);

    await runSaveFunction();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears with null, so an unmounted screen is not called', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    setSaveFunction(save);
    setSaveFunction(null);

    await runSaveFunction();

    expect(save).not.toHaveBeenCalled();
  });
});
