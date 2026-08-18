/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { LitElement, html, css, adoptStyles, unsafeCSS, type CSSResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, Ref, ref } from 'lit/directives/ref.js';
import { getLogger } from '../../services/log-service.js';

const log = getLogger('components/keep-monaco-editor');

// Types only — `import type` erases at compile time, so naming Monaco's interfaces
// throughout the class costs nothing at runtime.
import type * as Monaco from 'monaco-editor';
import {
  applyHoistedStyles,
  installInlineStyleHoisting
} from '../../services/monaco-inline-styles.js';
import {
  adoptStyleElements,
  installDocumentHeadAdoption
} from '../../services/monaco-style-elements.js';
import { EDITOR_THEME_ID, EDITOR_TOKENS, buildEditorTheme } from '../../services/editor-theme.js';
import { resolveWaColors } from '../../services/wa-color.js';
import { resolveWaTypography } from '../../services/wa-typography.js';

/**
 * Monaco, its worker wrappers and its stylesheet, loaded on first use rather than at
 * module scope.
 *
 * `KeepElements.tsx` re-exports this element, so a static `import * as monaco` put the
 * whole editor — several MB of JS plus a 309 kB stylesheet — in the entry chunk for
 * every session, including the majority that never open a Source tab.
 *
 * The promise is memoised, so a second editor on the page shares one download and
 * resolves immediately.
 */
function fetchMonaco() {
  // Both before the imports below, not after. Monaco creates the trusted-types policies the
  // first one hooks in static initialisers, and writes a stylesheet into `document.head`,
  // while its module graph evaluates — so anything installed afterwards is already too late.
  // Each function documents what breaks if it moves.
  installInlineStyleHoisting();
  installDocumentHeadAdoption();

  return Promise.all([
    import('monaco-editor'),
    // The `esm/vs/` prefix these three used to carry is gone, and dropping it is the
    // *supported* spelling — not a workaround. Monaco 0.56 added an `exports` map whose
    // catch-all answers every subpath with `./esm/vs/<subpath>.js`, so the old names now
    // resolve to `esm/vs/esm/vs/…`, a doubled path that does not exist. Not one file moved;
    // the map simply turns these shorter names back into the very same workers.
    import('monaco-editor/editor/editor.worker?worker'),
    import('monaco-editor/language/json/json.worker?worker'),
    import('monaco-editor/language/typescript/ts.worker?worker'),
    // The stylesheet cannot come through that map under any spelling — the catch-all appends
    // `.js`, so no `.css` in the package is reachable by name. It is aliased to its real path
    // in `monaco-css.mts`, which both bundler configs import and which is where the reason is
    // written down. This still names the file it actually gets.
    import('monaco-editor/min/vs/editor/editor.main.css?inline')
  ]).then(([monaco, editorWorker, jsonWorker, tsWorker, styles]) => {
    // Monaco reads `MonacoEnvironment` off `self` when it first spins up a worker,
    // which cannot happen before an editor exists. Assigning it here — inside the
    // memoised promise, before any caller gets the namespace — is therefore early
    // enough, and it keeps the three worker wrappers out of the entry chunk too.
    //
    // Spread, not replaced: `installInlineStyleHoisting()` above put a
    // `createTrustedTypesPolicy` here that Monaco has already read, and an editor rebuilt
    // after a hot reload would re-read this object.
    self.MonacoEnvironment = {
      ...self.MonacoEnvironment,
      getWorker(_: unknown, label: string) {
        if (label === 'json') return new jsonWorker.default();
        if (label === 'javascript' || label === 'typescript') return new tsWorker.default();
        return new editorWorker.default();
      }
    };
    return { monaco, styles: styles.default };
  });
}

let monacoBundle: ReturnType<typeof fetchMonaco> | undefined;

function loadMonaco() {
  monacoBundle ??= fetchMonaco();
  return monacoBundle;
}

/**
 * `editor.main.css` as a Lit `CSSResult`, built once for the whole page.
 *
 * A `CSSResult` constructs its `CSSStyleSheet` lazily and caches it, so every editor on the
 * page adopts one 308 kB sheet that the browser parses once — where the `<style>` block this
 * replaces put a fresh copy of the text in each instance's shadow root. Module scope rather
 * than a `static` field because the text only exists after {@link loadMonaco} resolves.
 */
let monacoStyles: CSSResult | undefined;

/**
 * The only language this editor ever hosts.
 *
 * It was a public `language` property defaulting to `'javascript'`, but the one call site
 * in the tree — `keep-forms-container` — has always passed `"json"`, and nothing else has
 * ever mounted this element. A constant rather than a property with a default, so that
 * #1022 can register JSON alone: once Monaco stops shipping the other 79 grammars, a
 * caller asking for one would get a silently untokenised buffer, and the way to prevent
 * that is to make the request unrepresentable rather than to document it.
 *
 * This is also why Prettier is gone. Every call into it sat behind
 * `this.language === 'javascript'`, so JSON-only makes the whole formatter unreachable —
 * ~607 kB of lazy chunks and one runtime dependency. Monaco's own
 * `editor.action.formatDocument` is unaffected and still formats JSON: it is what
 * `formatOnPaste`, `formatOnType` and the public {@link MonacoEditor.format} run.
 */
const LANGUAGE = 'json';

@customElement('keep-monaco-editor')
export default class MonacoEditor extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .editor-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
  `;

  @property({ type: String }) accessor value = '';
  @property({ type: Boolean }) accessor readOnly = false;
  @property({ type: Boolean }) accessor diffMode = false;
  @property({ type: String }) accessor originalValue = '';
  private _themeObserver?: MutationObserver;
  /** Watches the render root for markup carrying hoisted style declarations. */
  private _styleObserver?: MutationObserver;
  /** Unwraps this editor's container, installed only once Monaco has loaded. */
  private _releaseContainer?: () => void;
  /**
   * Cache key from the last `_applyTheme()` call that did real work — see
   * `_themeCacheKey()`. Starts `undefined` so the construction-time call always runs.
   */
  private _themeKey?: string;
  private containerRef: Ref<HTMLDivElement> = createRef();
  /** The Monaco namespace, once loaded. Its presence is what gates every path below. */
  private _monaco?: typeof Monaco;
  /** `_initialise()`'s promise, awaited by `getUpdateComplete()`. */
  private _ready?: Promise<void>;
  private editor?: Monaco.editor.IStandaloneCodeEditor;
  private diffEditor?: Monaco.editor.IStandaloneDiffEditor;
  private _originalModel?: Monaco.editor.ITextModel;
  private _modifiedModel?: Monaco.editor.ITextModel;
  private _suppressChange = false;
  private _resizeObserver?: ResizeObserver;

  /**
   * Holds `updateComplete` open until the editor actually exists.
   *
   * Lit calls `firstUpdated()` but does not await it, so without this an awaited
   * `updateComplete` would resolve while Monaco was still downloading — and every
   * caller that reaches for `getValue()` or `focus()` straight after a render would
   * see an element with no editor in it.
   */
  override async getUpdateComplete(): Promise<boolean> {
    const complete = await super.getUpdateComplete();
    await this._ready;
    return complete;
  }

  private _buildStandardEditor(monaco: typeof Monaco, container: HTMLDivElement) {
    const monacoTheme = this._applyTheme(monaco);

    this.editor = monaco.editor.create(container, {
      value: this.value,
      language: LANGUAGE,
      theme: monacoTheme,
      // Both match the pre-`keep-monaco-editor` behaviour, where the Source tab used
      // `@monaco-editor/react` with neither option set and so got Monaco's own
      // defaults: the minimap is the document overview in the right margin, and long
      // lines scroll horizontally rather than wrapping.
      minimap: { enabled: true },
      automaticLayout: true,
      ...this._typographyOptions(),
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      wordBasedSuggestions: 'currentDocument',
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      formatOnPaste: true,
      formatOnType: true,
      readOnly: this.readOnly
    });

    // Dispatch change events
    this.editor.onDidChangeModelContent(() => {
      if (this._suppressChange) return;
      const newValue = this.editor!.getValue();
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: { value: newValue },
          bubbles: true,
          composed: true
        })
      );
    });
  }

  private _buildDiffEditor(monaco: typeof Monaco, container: HTMLDivElement) {
    const monacoTheme = this._applyTheme(monaco);

    this.diffEditor = monaco.editor.createDiffEditor(container, {
      readOnly: false, // modified pane stays editable
      originalEditable: false,
      renderSideBySide: true,
      automaticLayout: true,
      ...this._typographyOptions(),
      scrollBeyondLastLine: false,
      // Kept in step with the standard editor above.
      wordWrap: 'off',
      ignoreTrimWhitespace: false,
      theme: monacoTheme
    });

    this._originalModel = monaco.editor.createModel(this.originalValue || this.value, LANGUAGE);
    this._modifiedModel = monaco.editor.createModel(this.value, LANGUAGE);

    this.diffEditor.setModel({
      original: this._originalModel,
      modified: this._modifiedModel
    });

    const modifiedEditor = this.diffEditor.getModifiedEditor();

    // `minimap` is the one option the diff editor drops on its way to the inner
    // editors — passing it to `createDiffEditor`, or to the diff widget's own
    // `updateOptions`, both leave it disabled. It has to be set on the inner editor
    // directly. Only the modified side gets one, matching how VS Code renders a diff:
    // a single overview in the right margin.
    modifiedEditor.updateOptions({ minimap: { enabled: true } });

    // Forward changes from the modified pane
    modifiedEditor.onDidChangeModelContent(() => {
      if (this._suppressChange) return;
      const newValue = modifiedEditor.getValue();
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: { value: newValue },
          bubbles: true,
          composed: true
        })
      );
    });
  }

  private _teardown() {
    // Widgets before models. `DiffEditorWidget` subscribes to its models'
    // `onWillDispose` and throws "TextModel got disposed before DiffEditorWidget
    // model got reset" if one disappears while it still holds it — which happened
    // on every diff-mode teardown while these two blocks were the other way round.
    this.diffEditor?.dispose();
    this.diffEditor = undefined;

    this.editor?.dispose();
    this.editor = undefined;

    this._originalModel?.dispose();
    this._modifiedModel?.dispose();
    this._originalModel = undefined;
    this._modifiedModel = undefined;

    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  /**
   * The subset of `<html>`'s classes that actually affect the resolved theme, sorted so
   * that class order can never cause a spurious cache miss: `wa-dark` for appearance,
   * `wa-theme-*`/`wa-palette-*` for the active Web Awesome theme.
   *
   * Web Awesome also toggles unrelated classes on the same element — notably
   * `wa-scroll-lock`, added and removed by every `wa-dialog`/`wa-drawer` open and close
   * (`lockBodyScrolling`/`unlockBodyScrolling`) — which would otherwise defeat a cache
   * keyed on the whole `className`.
   */
  private _themeCacheKey(): string {
    const relevant: string[] = [];
    for (const cls of document.documentElement.classList) {
      if (cls === 'wa-dark' || cls.startsWith('wa-theme-') || cls.startsWith('wa-palette-')) {
        relevant.push(cls);
      }
    }
    return relevant.sort().join(',');
  }

  /**
   * Re-derives the editor theme from the active Web Awesome theme and applies it —
   * unless neither axis has actually changed since the last call, in which case this is
   * a cheap no-op.
   *
   * Called on every `class` mutation of `<html>`, which is how `theme-service` switches
   * *both* axes: `wa-dark` for appearance and `wa-theme-*`/`wa-palette-*` for the theme.
   * But the observer also fires on every unrelated `class` mutation of the same element
   * (see `_themeCacheKey()`), and without the cache each of those would still pay for a
   * fresh canvas readback, 11 forced style recalcs, and a `defineTheme` call that
   * re-renders every open Monaco editor on the page.
   *
   * Appearance is read directly off `<html>`'s `wa-dark` class rather than
   * `getEffectiveAppearance()` (which reads `localStorage` and `matchMedia`):
   * `theme-service.applyTheme()` derives `wa-dark` from that same function, so the class
   * *is* the actual determinant of what the tokens below resolve to. Reading it here
   * keeps a single source of truth and is what the cache key is built from.
   *
   * Tokens are resolved to hex here, at switch time, because Monaco's theme API takes
   * concrete hex and cannot consume CSS custom properties.
   *
   * Redefining the *active* theme re-applies it to every open editor
   * (`standaloneThemeService.defineTheme`), so no rebuild is needed.
   *
   * @returns the theme id, for use as `theme` in the editor's construction options
   */
  private _applyTheme(monaco: typeof Monaco): string {
    const key = this._themeCacheKey();
    if (key === this._themeKey) return EDITOR_THEME_ID;
    this._themeKey = key;

    const appearance: 'light' | 'dark' = document.documentElement.classList.contains('wa-dark') ? 'dark' : 'light';
    const resolved = resolveWaColors(EDITOR_TOKENS);
    monaco.editor.defineTheme(EDITOR_THEME_ID, buildEditorTheme(appearance, resolved));
    monaco.editor.setTheme(EDITOR_THEME_ID);

    // Type is part of the theme too (#774): the tokens the sizes and family resolve
    // from can differ per theme, so re-resolve on the same cache-miss that redefines
    // the colours. During construction neither editor exists yet and both calls no-op;
    // the construction path passes the same options to `create` instead.
    const typography = this._typographyOptions();
    this.editor?.updateOptions(typography);
    this.diffEditor?.updateOptions(typography);

    return EDITOR_THEME_ID;
  }

  /**
   * Monaco's slice of the active theme's typography, with the pre-#774 hardcode as the
   * size fallback. `fontFamily` is omitted when unresolved so Monaco's own default
   * stack stands in — an explicit `undefined` would still override it.
   */
  private _typographyOptions(): { fontSize: number; fontFamily?: string } {
    const { fontSize, fontFamily } = resolveWaTypography();
    return fontFamily === undefined ? { fontSize: fontSize ?? 14 } : { fontSize: fontSize ?? 14, fontFamily };
  }

  private _rebuildEditor() {
    const container = this.containerRef.value;
    const monaco = this._monaco;
    if (!container || !monaco) return;

    this._teardown();
    if (this.diffMode) {
      this._buildDiffEditor(monaco, container);
    } else {
      this._buildStandardEditor(monaco, container);
    }
  }

  firstUpdated() {
    // Kept synchronous so `_ready` is assigned before Lit resolves this update, which
    // is what lets `getUpdateComplete()` above wait on it.
    this._ready = this._initialise();
  }

  /**
   * Downloads Monaco, then builds the editor and its observers against whatever the
   * properties say *at that point* — property changes that arrive mid-download are
   * absorbed, because `updated()` returns early until this has run.
   */
  private async _initialise() {
    const container = this.containerRef.value;
    if (!container) return;

    let bundle: Awaited<ReturnType<typeof loadMonaco>>;
    try {
      bundle = await loadMonaco();
    } catch (err) {
      log.error('Monaco failed to load; the editor will not render', err as Error);
      return;
    }

    // The element can be detached while the import is in flight. `disconnectedCallback`
    // has already run its teardown by then, so building now would strand an editor and
    // its workers with nothing left to dispose them.
    if (!this.isConnected) return;

    this._monaco = bundle.monaco;
    // Synchronous, so the rules are in place before Monaco builds into the container
    // below and therefore before the next paint.
    this._adoptMonacoStyles(bundle.styles);
    // Both before the editor builds: the first batch of view lines and Monaco's own
    // stylesheets are created during `_rebuildEditor()`, and neither can be caught after.
    this._replayHoistedStyles();
    this._interceptMonacoStyleElements(container);

    this._rebuildEditor();

    this._resizeObserver = new ResizeObserver(([entry]) => {
      if (this.diffMode && this.diffEditor) {
        const narrow = entry.contentRect.width < 500;
        this.diffEditor.updateOptions({ renderSideBySide: !narrow });
      } else if (!this.diffMode && this.editor) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.editor.layout({ width, height });
        }
      }
    });
    this._resizeObserver.observe(container);

    // Set up theme observer to watch for theme changes
    this._themeObserver = new MutationObserver(() => {
      this._applyTheme(bundle.monaco);
    });
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    if (!this.diffMode) {
      setTimeout(() => {
        this.editor?.layout();
        this.editor?.focus();
      }, 200);
    }
  }

  /**
   * Puts `editor.main.css` into this editor's shadow root as a stylesheet, not an element.
   *
   * It used to be `<style>${this._monacoStyles}</style>` in `render()`. The shipped CSP sends
   * **`style-src-elem 'self'`** (`jar/config/config.json`), which refuses an inline `<style>` —
   * so all 308 kB of it was inert in production and the editor rendered with no gutter, no
   * syntax colours and `position: static` where Monaco needs `relative`. Nothing looked broken
   * in dev, where the same policy is report-only, and nothing looked broken in the DOM either:
   * a refused `<style>` keeps its text and only loses its `.sheet` (#1002).
   *
   * `adoptedStyleSheets` is not governed by `style-src`, which is the whole reason this works —
   * the same reason `keep-data-table.styles.ts` adopts its slotted-table sheet. Lit's
   * `adoptStyles()` is used rather than assigning the array directly because it also handles
   * the browsers that cannot adopt, where it appends a `<style>` and behaviour is exactly what
   * it is today. `elementStyles` has to be passed back in: `adoptStyles()` sets the list rather
   * than appending to it, and dropping it would take `:host { display: block }` with it.
   */
  private _adoptMonacoStyles(cssText: string) {
    monacoStyles ??= unsafeCSS(cssText);
    const { elementStyles } = this.constructor as typeof MonacoEditor;
    adoptStyles(this.renderRoot as ShadowRoot, [...elementStyles, monacoStyles]);
  }

  /**
   * Replays the style declarations `hoistInlineStyles()` parked on Monaco's markup.
   *
   * The hoist happens while the HTML is still a string, so nothing can apply it until the
   * nodes are in the tree — this is that second half, and without it every view line renders
   * at `top: 0`. A `MutationObserver` rather than a hook on Monaco's render: its callback is
   * a microtask, so the declarations land in the same frame as the insertion and there is no
   * flash of unpositioned text.
   *
   * Measured against the built bundle under the enforcing policy, scrolling a 500-line
   * document ten screens: `.view-line` offsets and gutter numbers identical to the same
   * build with no CSP at all, and zero `style-src-attr` violations.
   */
  /**
   * Adopts the 136 kB theme sheet Monaco injects into this editor's container `<div>`.
   *
   * That refusal is what left the editor with no syntax colouring under the policy. The
   * container is the only place to intervene — see `monaco-style-elements.ts`. Monaco's
   * other stylesheet goes to `document.head` and is caught page-wide by
   * `installDocumentHeadAdoption()`, which has to run far earlier than this.
   */
  private _interceptMonacoStyleElements(container: HTMLElement) {
    this._releaseContainer = adoptStyleElements(container, this.renderRoot as ShadowRoot);
  }

  private _replayHoistedStyles() {
    const root = this.renderRoot as ShadowRoot;
    applyHoistedStyles(root);
    this._styleObserver = new MutationObserver(() => applyHoistedStyles(root));
    this._styleObserver.observe(root, { childList: true, subtree: true });
  }

  updated(changedProperties: Map<string, unknown>) {
    const monaco = this._monaco;
    // Nothing to drive until the dynamic import lands. Every branch below needs an
    // editor that does not exist yet, and `_initialise()` builds from the current
    // property values once it does — so changes arriving in the meantime are not lost.
    //
    // This is also why the first update no longer rebuilds: Lit's first
    // `changedProperties` contains every declared property, `diffMode` included, so
    // `updated()` used to tear down the editor `firstUpdated()` had just built.
    if (!monaco) return;

    if (changedProperties.has('diffMode')) {
      this._rebuildEditor();
      return; // models already set inside _buildXxxEditor
    }

    if (!this.diffMode && this.editor) {
      // Update value if changed externally
      if (changedProperties.has('value')) {
        const newValue = typeof this.value === 'string' ? this.value : '';
        const currentValue = this.editor.getValue();

        if (newValue !== currentValue) {
          this._suppressChange = true;
          this.editor.setValue(newValue);
          this._suppressChange = false;
        }
      }

      // Update readOnly if changed
      if (changedProperties.has('readOnly')) {
        this.editor.updateOptions({ readOnly: this.readOnly });
      }
    }

    if (this.diffMode && this.diffEditor) {
      if (changedProperties.has('originalValue') && this._originalModel) {
        this._originalModel.setValue(this.originalValue);
      }
      if (changedProperties.has('value') && this._modifiedModel) {
        const newValue = typeof this.value === 'string' ? this.value : '';
        if (newValue !== this._modifiedModel.getValue()) {
          this._suppressChange = true;
          this._modifiedModel.setValue(newValue);
          this._suppressChange = false;
        }
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._teardown();

    this._themeObserver?.disconnect();
    this._themeObserver = undefined;

    this._styleObserver?.disconnect();
    this._styleObserver = undefined;

    this._releaseContainer?.();
    this._releaseContainer = undefined;
  }

  /**
   * Get the current editor value
   */
  getValue(): string {
    if (this.diffMode && this.diffEditor) {
      return this.diffEditor.getModifiedEditor().getValue();
    }
    return this.editor?.getValue() ?? '';
  }

  /**
   * Set the editor value programmatically
   */
  setValue(value: string) {
    if (this.diffMode && this.diffEditor) {
      this._suppressChange = true;
      this.diffEditor.getModifiedEditor().setValue(value);
      this._suppressChange = false;
    } else if (this.editor) {
      this._suppressChange = true;
      this.editor.setValue(value);
      this._suppressChange = false;
    }
  }

  focus() {
    if (this.diffMode && this.diffEditor) {
      this.diffEditor.getModifiedEditor().focus();
    } else {
      this.editor?.focus();
    }
  }

  format() {
    if (this.diffMode && this.diffEditor) {
      this.diffEditor.getModifiedEditor().getAction('editor.action.formatDocument')?.run();
    } else {
      this.editor?.getAction('editor.action.formatDocument')?.run();
    }
  }

  render() {
    return html`<div class="editor-container" ${ref(this.containerRef)}></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-monaco-editor': MonacoEditor;
  }
}
