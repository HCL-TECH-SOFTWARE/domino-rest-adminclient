import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { captureMonacoErrors, ignoreMonacoCancellations, installMonacoDomStubs } from '../../test-utils/monaco';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-monaco-editor';
import type MonacoEditor from '../../../src/components/keep-elements/keep-monaco-editor';

/**
 * Complements `keep-monaco-editor.test.ts`, which drives the component against a fake
 * `monaco-editor` and covers its own logic thoroughly.
 *
 * This file covers the narrow slice a fake structurally cannot: assertions that live
 * inside real Monaco. The motivating case is dispose ordering — `DiffEditorWidget`
 * subscribes to its models' `onWillDispose` and throws "TextModel got disposed before
 * DiffEditorWidget model got reset" if a model is disposed while the widget still holds
 * it. A fake has no such subscription, so its dispose assertions pass either way; this
 * bug shipped and survived a 32-test fake-based suite.
 *
 * Real Monaco does run in jsdom given three stubs — see `test/test-utils/monaco.ts`.
 * Deliberately kept small: the fake-based suite is the right place for behaviour, and
 * duplicating it here would only double the maintenance.
 */

const TAG = 'keep-monaco-editor';

/** Monaco disposes on timers; let them drain so nothing lands after the assertion. */
const settle = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Warm Monaco here, at module scope, rather than in a hook or on first mount.
 *
 * #693 put Monaco behind a dynamic import, so nothing evaluates it until an editor
 * mounts. That moved several seconds of module evaluation into a test — and Vitest
 * budgets tests at 5 s and hooks at 10 s, both of which the CI runner blows. Module
 * evaluation has no such budget, which is exactly where this cost sat before #693 and
 * why it never needed one; a top-level await puts it back there instead of picking a
 * magic number that holds on a laptop and not on a runner.
 *
 * The stubs have to be installed first — Monaco touches `document` and canvas as it
 * evaluates — which a hoisted static import could not guarantee. `beforeAll` calls
 * `installMonacoDomStubs()` again; it is idempotent.
 */
installMonacoDomStubs();
await import('monaco-editor');

describe('keep-monaco-editor — real Monaco lifecycle', () => {
  let restoreRejectionHandlers: (() => void) | undefined;
  let capture: { errors: unknown[]; restore: () => void } | undefined;
  let errors: unknown[];

  beforeAll(() => {
    installMonacoDomStubs();
    restoreRejectionHandlers = ignoreMonacoCancellations();
    // Monaco reports broken invariants as a process-level uncaught exception, not by
    // throwing at the call site — see captureMonacoErrors().
    capture = captureMonacoErrors();
    errors = capture.errors;
  });

  // Optional-called: if `beforeAll` ever fails partway, this must not bury the real
  // error under a `Cannot read properties of undefined` from the teardown.
  afterAll(() => {
    capture?.restore();
    restoreRejectionHandlers?.();
  });

  afterEach(async () => {
    cleanupLit();
    errors.length = 0;
    await settle();
  });

  it('disposes a diff editor without tripping a Monaco assertion', async () => {
    const el = await mountLit<MonacoEditor>(TAG, {
      diffMode: true,
      value: 'modified',
      originalValue: 'original',
      language: 'json',
    });
    await settle();

    el.remove();
    await settle();

    expect(errors).toEqual([]);
  });

  it('disposes a standard editor without tripping a Monaco assertion', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: '{"a":1}', language: 'json' });
    await settle();

    el.remove();
    await settle();

    expect(errors).toEqual([]);
  });

  // _rebuildEditor() tears down and reconstructs in place; the same ordering applies.
  it('rebuilds across a diffMode toggle without tripping a Monaco assertion', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'x', language: 'json' });
    await settle();

    el.diffMode = true;
    await el.updateComplete;
    await settle();

    el.diffMode = false;
    await el.updateComplete;
    await settle();

    expect(errors).toEqual([]);
  });
});
