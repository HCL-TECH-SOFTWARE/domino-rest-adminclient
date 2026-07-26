// Copyright (C) 2026 HCL America Inc.
// Licensed under the Apache 2.0 License (https://www.apache.org/licenses/LICENSE-2.0.txt)

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, Ref, ref } from 'lit/directives/ref.js';
import { getLogger } from '../../services/log-service.js';

const log = getLogger('components/keep-monaco-editor');

import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import monacoStyles from 'monaco-editor/min/vs/editor/editor.main.css?inline';
import { EDITOR_THEME_ID, EDITOR_TOKENS, buildEditorTheme } from '../../services/editor-theme.js';
import { resolveWaColors } from '../../services/wa-color.js';
import { resolveWaTypography } from '../../services/wa-typography.js';

/**
 * Prettier, loaded on first use rather than at module scope.
 *
 * Two reasons. It is a runtime dependency of this element but weighs ~1 MB, and a
 * static import puts all of it in the entry chunk even for the many sessions that
 * never open a JavaScript buffer — only `language === 'javascript'` ever formats.
 * And it is used in exactly one function, on paths that are already async.
 *
 * The promise itself is memoised, so concurrent callers share one download and
 * later calls resolve immediately.
 */
function fetchPrettier() {
  return Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree')
  ]).then(([standalone, babel, estree]) => ({
    format: standalone.format,
    // Inferred, not annotated: these are plugin *namespaces*, and spelling out the
    // type would mean casting through `unknown` to satisfy Prettier's `Plugin`.
    plugins: [babel, estree]
  }));
}

let prettierBundle: ReturnType<typeof fetchPrettier> | undefined;

function loadPrettier() {
  prettierBundle ??= fetchPrettier();
  return prettierBundle;
}

self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') return new jsonWorker();
    if (label === 'javascript' || label === 'typescript') return new tsWorker();
    return new editorWorker();
  }
};

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

  @property({ type: String }) value = '';
  @property({ type: String }) language = 'javascript';
  @property({ type: Boolean }) readOnly = false;
  @property({ type: Boolean }) diffMode = false;
  @property({ type: String }) originalValue = '';
  @property({ attribute: false }) completionProvider?: monaco.languages.CompletionItemProvider;
  private _themeObserver?: MutationObserver;
  /**
   * Cache key from the last `_applyTheme()` call that did real work — see
   * `_themeCacheKey()`. Starts `undefined` so the construction-time call always runs.
   */
  private _themeKey?: string;
  private containerRef: Ref<HTMLDivElement> = createRef();
  private editor?: monaco.editor.IStandaloneCodeEditor;
  private diffEditor?: monaco.editor.IStandaloneDiffEditor;
  private _originalModel?: monaco.editor.ITextModel;
  private _modifiedModel?: monaco.editor.ITextModel;
  private _suppressChange = false;
  private _completionDisposable?: monaco.IDisposable;
  private _resizeObserver?: ResizeObserver;

  private async formatWithPrettier(code: string): Promise<string> {
    try {
      // Check if it's a CouchDB function (starts with "function(" without a name)
      const isCouchDBFunction = /^\s*function\s*\(/.test(code);

      // Wrap in parentheses to make it a valid expression for Prettier
      const codeToFormat = isCouchDBFunction ? `(${code})` : code;

      const { format, plugins } = await loadPrettier();
      const formatted = await format(codeToFormat, {
        parser: 'babel',
        plugins,
        semi: true,
        singleQuote: false,
        tabWidth: 2,
        printWidth: 80
      });

      // Remove the wrapping parentheses and semicolon if we added them
      if (isCouchDBFunction) {
        return formatted
          .trim()
          .replace(/^\(/, '') // Remove leading (
          .replace(/\);?\s*$/, '') // Remove trailing ) and optional ;
          .trim();
      }

      return formatted;
    } catch (err) {
      // If formatting fails, return original code unchanged
      log.debug('Prettier formatting failed, returning code unchanged', err as Error);
      return code;
    }
  }

  private _buildStandardEditor(container: HTMLDivElement) {
    const monacoTheme = this._applyTheme();

    this.editor = monaco.editor.create(container, {
      value: this.value,
      language: this.language,
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

    // Format on paste
    this.editor.onDidPaste(() => {
      setTimeout(async () => {
        if (this.language === 'javascript' && this.editor) {
          const content = this.editor.getValue();
          const formatted = await this.formatWithPrettier(content);
          if (formatted !== content) {
            this._suppressChange = true;
            this.editor.setValue(formatted);
            this._suppressChange = false;
          }
        }
      }, 150);
    });

    // Format on blur
    this.editor.onDidBlurEditorText(() => {
      if (this.language === 'javascript' && this.editor) {
        const content = this.editor.getValue();
        if (content.trim().length > 0) {
          this.formatWithPrettier(content).then((formatted) => {
            if (formatted !== content && this.editor) {
              this._suppressChange = true;
              this.editor.setValue(formatted);
              this._suppressChange = false;
            }
          });
        }
      }
    });
  }

  private _buildDiffEditor(container: HTMLDivElement) {
    const monacoTheme = this._applyTheme();

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

    this._originalModel = monaco.editor.createModel(this.originalValue || this.value, this.language);
    this._modifiedModel = monaco.editor.createModel(this.value, this.language);

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

    // Format on paste (modified pane)
    modifiedEditor.onDidPaste(() => {
      setTimeout(async () => {
        if (this.language === 'javascript' && this.diffEditor) {
          const content = modifiedEditor.getValue();
          const formatted = await this.formatWithPrettier(content);
          if (formatted !== content) {
            this._suppressChange = true;
            modifiedEditor.setValue(formatted);
            this._suppressChange = false;
          }
        }
      }, 150);
    });

    // Format on blur (modified pane)
    modifiedEditor.onDidBlurEditorText(() => {
      if (this.language === 'javascript' && this.diffEditor) {
        const content = modifiedEditor.getValue();
        if (content.trim().length > 0) {
          this.formatWithPrettier(content).then((formatted) => {
            if (formatted !== content && this.diffEditor) {
              this._suppressChange = true;
              modifiedEditor.setValue(formatted);
              this._suppressChange = false;
            }
          });
        }
      }
    });
  }

  private _teardown() {
    this._completionDisposable?.dispose();
    this._completionDisposable = undefined;

    this._originalModel?.dispose();
    this._modifiedModel?.dispose();
    this._originalModel = undefined;
    this._modifiedModel = undefined;

    this.diffEditor?.dispose();
    this.diffEditor = undefined;

    this.editor?.dispose();
    this.editor = undefined;

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
  private _applyTheme(): string {
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
    if (!container) return;

    this._teardown();
    if (this.diffMode) {
      this._buildDiffEditor(container);
    } else {
      this._buildStandardEditor(container);
    }
  }

  firstUpdated() {
    const container = this.containerRef.value;
    if (!container) return;

    if (this.diffMode) {
      this._buildDiffEditor(container);
    } else {
      this._buildStandardEditor(container);
    }

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
      this._applyTheme();
    });
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    if (this.completionProvider) {
      this._completionDisposable = monaco.languages.registerCompletionItemProvider(this.language, this.completionProvider);
    }

    if (!this.diffMode) {
      setTimeout(async () => {
        this.editor?.layout();

        // Format the initial content with Prettier
        if (this.language === 'javascript' && this.editor && this.value.trim().length > 0) {
          const formatted = await this.formatWithPrettier(this.value);
          if (formatted !== this.value) {
            this._suppressChange = true;
            this.editor.setValue(formatted);
            this._suppressChange = false;
          }
        }

        this.editor?.focus();
      }, 200);
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('diffMode')) {
      this._rebuildEditor();
      return; // models already set inside _buildXxxEditor
    }

    if (!this.diffMode && this.editor) {
      if (changedProperties.has('language')) {
        const model = this.editor.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, this.language);
        }
      }

      // Update value if changed externally
      if (changedProperties.has('value')) {
        const newValue = typeof this.value === 'string' ? this.value : '';
        const currentValue = this.editor.getValue();

        if (newValue !== currentValue) {
          this._suppressChange = true;
          this.editor.setValue(newValue);
          this._suppressChange = false;

          // Auto-format after value change - only if there's content
          if (this.language === 'javascript' && newValue.trim().length > 0) {
            setTimeout(async () => {
              if (this.editor) {
                const formatted = await this.formatWithPrettier(newValue);
                if (formatted !== newValue) {
                  this._suppressChange = true;
                  this.editor.setValue(formatted);
                  this._suppressChange = false;
                }
              }
            }, 100);
          }
        }
      }

      // Update readOnly if changed
      if (changedProperties.has('readOnly')) {
        this.editor.updateOptions({ readOnly: this.readOnly });
      }

      if (changedProperties.has('completionProvider')) {
        this._completionDisposable?.dispose();
        this._completionDisposable = undefined;
        if (this.completionProvider) {
          this._completionDisposable = monaco.languages.registerCompletionItemProvider(this.language, this.completionProvider);
        }
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
    return html`
      <style>
        ${monacoStyles}
      </style>
      <div class="editor-container" ${ref(this.containerRef)}></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-monaco-editor': MonacoEditor;
  }
}
