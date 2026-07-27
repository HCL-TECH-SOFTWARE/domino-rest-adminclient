import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';

/*
 * `keep-monaco-editor` cannot be exercised against the real `monaco-editor`: importing it
 * evaluates the whole editor bundle, which calls `document.queryCommandSupported` at
 * module scope — absent in jsdom — and then wants a layout engine jsdom does not have.
 *
 * So `monaco-editor` is replaced wholesale by a fake that (a) records the options each
 * editor was constructed with, (b) actually stores a value so the component's
 * `_suppressChange` guard behaves realistically, and (c) exposes the listeners the
 * component registers, so a test can fire them the way Monaco would.
 *
 * `src/services/{wa-color,wa-typography}` are deliberately NOT mocked. Both are documented
 * to return `{}` when they cannot resolve (no 2D canvas, no theme loaded — i.e. exactly
 * this environment), so letting them run keeps their degradation path covered and proves
 * the component copes with unresolved tokens.
 */

// ─── fake monaco ────────────────────────────────────────────────────────────────

interface FakeEditor {
  options: Record<string, unknown>;
  value: string;
  disposed: boolean;
  layoutCalls: unknown[];
  /** Listeners the component registered, keyed by the Monaco `onDidX` name. */
  listeners: Record<string, (() => void)[]>;
  /** Fire a registered listener the way Monaco would. */
  fire(event: string): void;
  getValue(): string;
  setValue(v: string): void;
  getModel(): FakeModel | null;
  updateOptions(o: Record<string, unknown>): void;
  layout(dims?: unknown): void;
  focus(): void;
  dispose(): void;
  getAction(id: string): { id: string; run: () => void } | undefined;
  onDidChangeModelContent(cb: () => void): { dispose(): void };
  onDidPaste(cb: () => void): { dispose(): void };
  onDidBlurEditorText(cb: () => void): { dispose(): void };
  focusCalls: number;
  ranActions: string[];
}

interface FakeModel {
  value: string;
  language: string;
  disposed: boolean;
  getValue(): string;
  setValue(v: string): void;
  dispose(): void;
}

const monacoState = vi.hoisted(() => {
  const editors: any[] = [];
  const diffEditors: any[] = [];
  const models: any[] = [];
  const definedThemes: { id: string; data: any }[] = [];
  const setThemes: string[] = [];
  const completionProviders: { language: string; provider: unknown; disposed: boolean }[] = [];

  const makeEditor = (options: Record<string, unknown> = {}) => {
    const listeners: Record<string, (() => void)[]> = {};
    const on = (name: string) => (cb: () => void) => {
      (listeners[name] ??= []).push(cb);
      return { dispose: () => {} };
    };
    const model = {
      value: String(options.value ?? ''),
      language: String(options.language ?? ''),
      disposed: false,
      getValue() {
        return this.value;
      },
      setValue(v: string) {
        this.value = v;
      },
      dispose() {
        this.disposed = true;
      },
    };
    const editor: any = {
      options: { ...options },
      value: String(options.value ?? ''),
      disposed: false,
      layoutCalls: [],
      focusCalls: 0,
      ranActions: [],
      listeners,
      _model: model,
      fire(event: string) {
        for (const cb of listeners[event] ?? []) cb();
      },
      getValue() {
        return editor.value;
      },
      setValue(v: string) {
        editor.value = v;
        model.value = v;
        // Monaco fires the content-change listeners on a programmatic setValue too;
        // reproducing that is what makes the component's `_suppressChange` guard
        // meaningful rather than vacuously true.
        editor.fire('onDidChangeModelContent');
      },
      getModel: () => model,
      updateOptions(o: Record<string, unknown>) {
        Object.assign(editor.options, o);
      },
      layout(dims?: unknown) {
        editor.layoutCalls.push(dims);
      },
      focus() {
        editor.focusCalls += 1;
      },
      dispose() {
        editor.disposed = true;
        // A disposed Monaco editor notifies nobody. Dropping the listeners here is what
        // makes "no events after teardown" a real assertion rather than a vacuous one.
        for (const key of Object.keys(listeners)) delete listeners[key];
      },
      getAction: (id: string) => ({ id, run: () => editor.ranActions.push(id) }),
      onDidChangeModelContent: on('onDidChangeModelContent'),
      onDidPaste: on('onDidPaste'),
      onDidBlurEditorText: on('onDidBlurEditorText'),
    };
    return editor;
  };

  return { editors, diffEditors, models, definedThemes, setThemes, completionProviders, makeEditor };
});

vi.mock('monaco-editor', () => {
  const { editors, diffEditors, models, definedThemes, setThemes, completionProviders, makeEditor } = monacoState;

  return {
    editor: {
      create(_container: HTMLElement, options: Record<string, unknown>) {
        const e = makeEditor(options);
        editors.push(e);
        return e;
      },
      createDiffEditor(_container: HTMLElement, options: Record<string, unknown>) {
        const modified = makeEditor(options);
        const diff: any = {
          options: { ...options },
          disposed: false,
          model: null as unknown,
          modified,
          setModel(m: unknown) {
            diff.model = m;
          },
          getModifiedEditor: () => modified,
          updateOptions(o: Record<string, unknown>) {
            Object.assign(diff.options, o);
          },
          dispose() {
            diff.disposed = true;
          },
        };
        diffEditors.push(diff);
        return diff;
      },
      createModel(value: string, language: string) {
        const m: FakeModel = {
          value,
          language,
          disposed: false,
          getValue() {
            return this.value;
          },
          setValue(v: string) {
            this.value = v;
          },
          dispose() {
            this.disposed = true;
          },
        };
        models.push(m);
        return m;
      },
      setModelLanguage(model: FakeModel, language: string) {
        model.language = language;
      },
      defineTheme(id: string, data: unknown) {
        definedThemes.push({ id, data });
      },
      setTheme(id: string) {
        setThemes.push(id);
      },
    },
    languages: {
      registerCompletionItemProvider(language: string, provider: unknown) {
        const entry = { language, provider, disposed: false };
        completionProviders.push(entry);
        return {
          dispose() {
            entry.disposed = true;
          },
        };
      },
    },
  };
});

// The Vite `?worker` and `?inline` imports only need to resolve — the component never
// instantiates a worker here, because `MonacoEnvironment.getWorker` is only ever called
// by the real Monaco.
vi.mock('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({ default: class {} }));
vi.mock('monaco-editor/esm/vs/language/json/json.worker?worker', () => ({ default: class {} }));
vi.mock('monaco-editor/esm/vs/language/typescript/ts.worker?worker', () => ({ default: class {} }));
vi.mock('monaco-editor/min/vs/editor/editor.main.css?inline', () => ({ default: '/* monaco css */' }));

// Prettier's standalone build plus the babel/estree plugins is megabytes of parser that
// every mount would otherwise pay for. The identity mock keeps the format-on-* paths
// reachable while staying deterministic; one test overrides it to assert reformatting.
const prettierState = vi.hoisted(() => ({ format: (code: string) => code }));
vi.mock('prettier/standalone', () => ({
  format: (code: string) => Promise.resolve(prettierState.format(code)),
}));
vi.mock('prettier/plugins/babel', () => ({ default: {} }));
vi.mock('prettier/plugins/estree', () => ({ default: {} }));

// Must come after the mocks: importing the module registers the element, which pulls in
// everything above.
import '../../../src/components/keep-elements/keep-monaco-editor';
import type MonacoEditor from '../../../src/components/keep-elements/keep-monaco-editor';
import { EDITOR_THEME_ID } from '../../../src/services/editor-theme';

const TAG = 'keep-monaco-editor';

/*
 * The *live* editor is always the last one constructed, because the component rebuilds
 * once during first render (see the "known defects" block at the bottom of this file).
 * Every behavioural test below goes through these helpers so it asserts against the
 * editor the component is actually driving, and stays correct if that rebuild is fixed.
 */
const lastEditor = (): FakeEditor => monacoState.editors.at(-1) as FakeEditor;
const lastDiffEditor = () => monacoState.diffEditors.at(-1) as any;
/** The original/modified models belonging to the live diff editor. */
const liveModels = () => monacoState.models.slice(-2);

/** Let queued MutationObserver callbacks and microtasks run. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('keep-monaco-editor', () => {
  let getContext: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    monacoState.editors.length = 0;
    monacoState.diffEditors.length = 0;
    monacoState.models.length = 0;
    monacoState.definedThemes.length = 0;
    monacoState.setThemes.length = 0;
    monacoState.completionProviders.length = 0;
    prettierState.format = (code: string) => code;

    // jsdom implements neither ResizeObserver (observed in firstUpdated) nor a real
    // layout, so a recording no-op stands in.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    // jsdom has no 2D context and logs a "Not implemented" error for every call — dozens
    // per run, since resolveWaColors() probes a canvas on each theme derivation.
    // Returning null is the same answer jsdom gives, minus the noise, and is the case
    // resolveWaColors explicitly documents as "test env" (it yields {} and the component
    // falls back per token).
    getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    cleanupLit();
    document.documentElement.className = '';
    getContext.mockRestore();
    vi.unstubAllGlobals();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders an editor container and builds a standard editor into it', async () => {
    const el = await mountLit<MonacoEditor>(TAG);

    const container = el.shadowRoot!.querySelector('.editor-container');
    expect(container).toBeTruthy();
    expect(monacoState.editors.length).toBeGreaterThan(0);
    expect(lastEditor().disposed).toBe(false);
    expect(monacoState.diffEditors).toHaveLength(0);
  });

  // ─── reactive properties ──────────────────────────────────────────────────────

  it('passes value and language into the editor it constructs', async () => {
    await mountLit<MonacoEditor>(TAG, { value: 'const a = 1;', language: 'javascript' });

    expect(lastEditor().options.value).toBe('const a = 1;');
    expect(lastEditor().options.language).toBe('javascript');
  });

  it('defaults language to javascript and value to the empty string', async () => {
    const el = await mountLit<MonacoEditor>(TAG);

    expect(el.language).toBe('javascript');
    expect(el.value).toBe('');
    expect(lastEditor().options.language).toBe('javascript');
  });

  it('pushes a changed value property into the editor', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'first', language: 'json' });

    el.value = 'second';
    await el.updateComplete;

    expect(lastEditor().getValue()).toBe('second');
  });

  it('does not re-set the editor when the value property matches what is already there', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'same', language: 'json' });
    const editor = lastEditor();
    const setValue = vi.spyOn(editor, 'setValue');

    el.value = 'same';
    await el.updateComplete;

    expect(setValue).not.toHaveBeenCalled();
  });

  it('switches the model language when the language property changes', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: '{}', language: 'json' });

    el.language = 'javascript';
    await el.updateComplete;

    expect(lastEditor().getModel()!.language).toBe('javascript');
  });

  it('forwards readOnly changes to the editor options', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { readOnly: true });
    expect(lastEditor().options.readOnly).toBe(true);

    el.readOnly = false;
    await el.updateComplete;
    expect(lastEditor().options.readOnly).toBe(false);
  });

  // ─── theme ────────────────────────────────────────────────────────────────────
  //
  // There is no `theme` reactive property: the component derives the Monaco theme from
  // <html>'s Web Awesome classes and re-derives it from a MutationObserver on that
  // element's `class` attribute. These cover that contract instead.

  it('defines and applies the editor theme when it builds an editor', async () => {
    await mountLit<MonacoEditor>(TAG);

    expect(monacoState.definedThemes).toHaveLength(1);
    expect(monacoState.definedThemes[0]!.id).toBe(EDITOR_THEME_ID);
    expect(monacoState.setThemes).toEqual([EDITOR_THEME_ID]);
    expect(lastEditor().options.theme).toBe(EDITOR_THEME_ID);
  });

  it('builds a light-based theme by default and a dark-based one under .wa-dark', async () => {
    await mountLit<MonacoEditor>(TAG);
    expect(monacoState.definedThemes.at(-1)!.data.base).toBe('vs');

    document.documentElement.classList.add('wa-dark');
    await tick();

    expect(monacoState.definedThemes.at(-1)!.data.base).toBe('vs-dark');
  });

  it('re-derives the theme when a wa-theme-* class changes', async () => {
    await mountLit<MonacoEditor>(TAG);
    expect(monacoState.definedThemes).toHaveLength(1);

    document.documentElement.classList.add('wa-theme-awesome');
    await tick();

    expect(monacoState.definedThemes).toHaveLength(2);
  });

  it('ignores <html> class mutations that cannot affect the theme', async () => {
    await mountLit<MonacoEditor>(TAG);
    expect(monacoState.definedThemes).toHaveLength(1);

    // wa-scroll-lock is toggled by every wa-dialog/wa-drawer open and close.
    document.documentElement.classList.add('wa-scroll-lock');
    await tick();
    document.documentElement.classList.remove('wa-scroll-lock');
    await tick();

    expect(monacoState.definedThemes).toHaveLength(1);
  });

  // ─── change event ─────────────────────────────────────────────────────────────

  it('emits a composed, bubbling change event carrying the new value', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'before', language: 'json' });
    const editor = lastEditor();

    const events: CustomEvent<{ value: string }>[] = [];
    el.addEventListener('change', (e) => events.push(e as CustomEvent<{ value: string }>));

    // Simulate the user typing: Monaco updates its buffer, then notifies.
    editor.value = 'after';
    editor.fire('onDidChangeModelContent');

    expect(events).toHaveLength(1);
    expect(events[0]!.detail).toEqual({ value: 'after' });
    expect(events[0]!.bubbles).toBe(true);
    expect(events[0]!.composed).toBe(true);
  });

  it('does not emit change for a value pushed in through the property', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'first', language: 'json' });

    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });

    el.value = 'second';
    await el.updateComplete;

    expect(lastEditor().getValue()).toBe('second');
    expect(changes).toBe(0);
  });

  it('does not emit change for a programmatic setValue()', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'first', language: 'json' });

    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });

    el.setValue('second');

    expect(el.getValue()).toBe('second');
    expect(changes).toBe(0);
  });

  it('reformats on blur and suppresses the change that causes', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'const a=1', language: 'javascript' });
    const editor = lastEditor();

    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });

    prettierState.format = () => 'const a = 1;';
    editor.fire('onDidBlurEditorText');
    await tick();

    expect(editor.getValue()).toBe('const a = 1;');
    expect(changes).toBe(0);
  });

  // ─── public API ───────────────────────────────────────────────────────────────

  it('exposes the editor value through getValue()', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'hello', language: 'json' });

    lastEditor().value = 'edited';

    expect(el.getValue()).toBe('edited');
  });

  it('forwards focus() and format() to the editor', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { language: 'json' });
    const editor = lastEditor();
    const before = editor.focusCalls;

    el.focus();
    el.format();

    expect(editor.focusCalls).toBe(before + 1);
    expect(editor.ranActions).toContain('editor.action.formatDocument');
  });

  // ─── diff mode ────────────────────────────────────────────────────────────────

  it('builds a diff editor with original and modified models when diffMode is set', async () => {
    await mountLit<MonacoEditor>(TAG, {
      diffMode: true,
      value: 'modified',
      originalValue: 'original',
      language: 'json',
    });

    const [original, modified] = liveModels();
    expect(lastDiffEditor().disposed).toBe(false);
    expect(original!.getValue()).toBe('original');
    expect(modified!.getValue()).toBe('modified');
    expect(lastDiffEditor().model).toEqual({ original, modified });
  });

  it('emits change from the modified pane of a diff editor', async () => {
    const el = await mountLit<MonacoEditor>(TAG, {
      diffMode: true,
      value: 'modified',
      originalValue: 'original',
      language: 'json',
    });
    const modified = lastDiffEditor().getModifiedEditor() as FakeEditor;

    const events: CustomEvent<{ value: string }>[] = [];
    el.addEventListener('change', (e) => events.push(e as CustomEvent<{ value: string }>));

    modified.value = 'edited in diff';
    modified.fire('onDidChangeModelContent');

    expect(events).toHaveLength(1);
    expect(events[0]!.detail).toEqual({ value: 'edited in diff' });
  });

  it('rebuilds the editor when diffMode is toggled, disposing the previous one', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'x', language: 'json' });
    const standard = lastEditor();

    el.diffMode = true;
    await el.updateComplete;

    expect(standard.disposed).toBe(true);
    expect(monacoState.diffEditors).toHaveLength(1);
  });

  it('pushes originalValue and value into the diff models', async () => {
    const el = await mountLit<MonacoEditor>(TAG, {
      diffMode: true,
      value: 'modified',
      originalValue: 'original',
      language: 'json',
    });

    el.originalValue = 'original v2';
    el.value = 'modified v2';
    await el.updateComplete;

    const [original, modified] = liveModels();
    expect(original!.getValue()).toBe('original v2');
    expect(modified!.getValue()).toBe('modified v2');
  });

  // ─── completion provider ──────────────────────────────────────────────────────

  it('registers a completion provider for the current language when one is supplied', async () => {
    const provider = { provideCompletionItems: () => ({ suggestions: [] }) };
    await mountLit<MonacoEditor>(TAG, { language: 'json', completionProvider: provider as never });

    expect(monacoState.completionProviders).toHaveLength(1);
    expect(monacoState.completionProviders[0]).toMatchObject({ language: 'json', provider });
  });

  it('disposes the previous completion provider when a new one is set', async () => {
    const first = { provideCompletionItems: () => ({ suggestions: [] }) };
    const second = { provideCompletionItems: () => ({ suggestions: [] }) };
    const el = await mountLit<MonacoEditor>(TAG, {
      language: 'json',
      completionProvider: first as never,
    });

    el.completionProvider = second as never;
    await el.updateComplete;

    expect(monacoState.completionProviders[0]!.disposed).toBe(true);
    expect(monacoState.completionProviders[1]!.disposed).toBe(false);
    expect(monacoState.completionProviders[1]!.provider).toBe(second);
  });

  // ─── disposal ─────────────────────────────────────────────────────────────────

  it('disposes the editor on disconnectedCallback', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'x', language: 'json' });
    const editor = lastEditor();
    expect(editor.disposed).toBe(false);

    el.remove();

    expect(editor.disposed).toBe(true);
  });

  it('disposes the diff editor and both models on disconnectedCallback', async () => {
    const el = await mountLit<MonacoEditor>(TAG, {
      diffMode: true,
      value: 'modified',
      originalValue: 'original',
      language: 'json',
    });
    const diff = lastDiffEditor();
    const [original, modified] = liveModels();

    el.remove();

    expect(diff.disposed).toBe(true);
    expect(original!.disposed).toBe(true);
    expect(modified!.disposed).toBe(true);
  });

  it('disposes the completion provider on disconnectedCallback', async () => {
    const provider = { provideCompletionItems: () => ({ suggestions: [] }) };
    const el = await mountLit<MonacoEditor>(TAG, {
      language: 'json',
      completionProvider: provider as never,
    });

    el.remove();

    expect(monacoState.completionProviders[0]!.disposed).toBe(true);
  });

  it('disconnects the theme observer on disconnectedCallback', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { language: 'json' });
    el.remove();

    // <html> churn no longer redefines the theme.
    const themesAfterRemoval = monacoState.definedThemes.length;
    document.documentElement.classList.add('wa-dark');
    await tick();

    expect(monacoState.definedThemes).toHaveLength(themesAfterRemoval);
  });

  it('stops emitting change once removed', async () => {
    const el = await mountLit<MonacoEditor>(TAG, { value: 'x', language: 'json' });
    const editor = lastEditor();

    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });

    el.remove();
    editor.value = 'y';
    editor.fire('onDidChangeModelContent');

    // The listener Monaco held is gone with the disposed editor; nothing reaches the host.
    expect(changes).toBe(0);
  });

  // ─── first render ─────────────────────────────────────────────────────────────
  //
  // These three used to pin a double-build as a KNOWN DEFECT: Lit's first
  // `changedProperties` contains every declared reactive property, `diffMode` included,
  // so `updated()` — running immediately after `firstUpdated()`, in the same update —
  // saw `changedProperties.has('diffMode')` and tore down the editor that had just been
  // built.
  //
  // Loading Monaco through a memoised dynamic import (#693) removed it. `_initialise()`
  // now builds in a later task, and `updated()` returns early while `this._monaco` is
  // unset, so there is no editor for the first update to discard. The assertions are
  // inverted here rather than deleted, so a regression back to two builds still fails.

  it('builds exactly one editor on first render', async () => {
    await mountLit<MonacoEditor>(TAG, { value: 'x', language: 'json' });

    expect(monacoState.editors).toHaveLength(1);
    expect(monacoState.editors[0]!.disposed).toBe(false);
  });

  it('builds exactly one diff editor and two models on a first render in diff mode', async () => {
    await mountLit<MonacoEditor>(TAG, {
      diffMode: true,
      value: 'modified',
      originalValue: 'original',
      language: 'json',
    });

    expect(monacoState.diffEditors).toHaveLength(1);
    expect(monacoState.models).toHaveLength(2);
    expect(monacoState.models.every((m) => m.disposed)).toBe(false);
  });

  it('leaves the ResizeObserver connected after first render', async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
        unobserve() {}
        disconnect = disconnect;
      },
    );

    await mountLit<MonacoEditor>(TAG, { language: 'json' });

    expect(observe).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('KNOWN DEFECT: never re-observes the container after a diffMode toggle', async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
        unobserve() {}
        disconnect = disconnect;
      },
    );

    const el = await mountLit<MonacoEditor>(TAG, { language: 'json' });
    el.diffMode = true;
    await el.updateComplete;

    // `_teardown()` disconnects the observer, and only `_initialise()` ever constructs
    // one — so from the first toggle onwards the editor stops relaying out on resize and
    // the diff editor stops leaving side-by-side on a narrow container.
    //
    // Narrowed but not fixed by #693: the observer now survives first render, where it
    // previously died immediately. Moving the `observe()` into `_rebuildEditor()`, next
    // to the editor it drives, would close it — deliberately left out of a bundle-size
    // change.
    expect(observe).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  // ─── lazy loading ─────────────────────────────────────────────────────────────

  it('holds updateComplete open until the editor exists', async () => {
    // `firstUpdated()` is not awaited by Lit, so without the `getUpdateComplete()`
    // override every caller that renders and then reaches for the editor would find
    // nothing there.
    const el = document.createElement(TAG) as MonacoEditor;
    el.language = 'json';
    document.body.appendChild(el);

    await el.updateComplete;

    expect(monacoState.editors).toHaveLength(1);
    expect(el.getValue()).toBe('');
  });

  it('builds against the properties as they stand when the import lands', async () => {
    // Changes arriving mid-download must not be lost: `updated()` cannot act on them
    // (there is no editor yet), so `_initialise()` has to read the current values.
    const el = document.createElement(TAG) as MonacoEditor;
    el.language = 'json';
    document.body.appendChild(el);

    el.diffMode = true;
    el.value = 'set while loading';
    await el.updateComplete;

    expect(monacoState.editors).toHaveLength(0);
    expect(monacoState.diffEditors).toHaveLength(1);
    // Through the models, as the other diff tests do: the fake's modified editor is not
    // wired to its model the way real Monaco's is.
    expect(liveModels()[1]!.getValue()).toBe('set while loading');
  });
});
