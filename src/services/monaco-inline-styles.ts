/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Keeps Monaco's inline styles from tripping `style-src-attr 'none'` (#1002).
 *
 * Monaco renders its view layer by building HTML strings and assigning them to
 * `innerHTML` — line wrappers, gutter numbers, the current-line highlight, selections,
 * indent guides. Their geometry travels in `style="…"` attributes, and the shipped policy
 * (`jar/config/config.json`) refuses those: measured against the built bundle, one editor
 * reported **35 `style-src-attr` violations within seconds and kept climbing**, and the
 * first gutter number and the current-line highlight were missing.
 *
 * Note the split, which is the same one `test/csp-inline-styles.test.ts` documents: what
 * Monaco writes through the **CSSOM** (`.monaco-editor`, `.overflow-guard`, `.margin`) was
 * never affected, because `style-src-attr` governs the *attribute*, not `style.setProperty`.
 * Only the attributes inside those HTML strings were refused. So the fix is to move each
 * one across that line: {@link hoistInlineStyles} rewrites the attribute into a data
 * attribute while the markup is still a string, and {@link applyHoistedStyles} replays it
 * through the CSSOM once the nodes are in the tree.
 *
 * The entry point is Monaco's own `MonacoEnvironment.createTrustedTypesPolicy` hook, which
 * every one of its `innerHTML` writes already funnels through — so this needs no patching
 * of `monaco-editor` and no loosening of the policy. See {@link installInlineStyleHoisting}
 * for the one constraint that comes with it.
 *
 * ## Why not generate CSS classes instead
 *
 * The obvious alternative — hoist each declaration into a rule in a constructed stylesheet
 * and put a class on the element — was built and measured first. It works, and it leaks:
 * a view line's `top` is its absolute offset in the scrolled content, so every scroll step
 * mints declarations that never repeat. Scrolling a 500-line document ten screens grew the
 * sheet from 29 rules to 251 and rising, with nothing able to evict a rule that some line
 * might still be using. The CSSOM replay holds no state at all.
 */

/**
 * Where a hoisted `style` attribute waits between {@link hoistInlineStyles} and
 * {@link applyHoistedStyles}. Any name works; this one is greppable in a DOM inspector.
 */
const HOISTED = 'data-keep-monaco-style';

/**
 * Rewrites `style="…"` into {@link HOISTED} across every tag in a fragment of Monaco's HTML.
 *
 * Scoped to tag interiors — `<…>` — rather than run over the whole string, and that is
 * load-bearing rather than tidiness. **The editor renders source code**, and Monaco's
 * escaper (`base/common/strings.js`) replaces only `<`, `>` and `&`. A line of a document
 * that reads `style="color:red"` therefore reaches this function as raw text with real
 * quotes in it. Because `<` and `>` cannot survive in text, a `<…>` match is always a real
 * tag, and text can never be rewritten. A bare `/style="([^"]*)"/g` would have silently
 * corrupted any file containing an HTML style attribute.
 */
export function hoistInlineStyles(html: string): string {
  return html.replace(/<([a-zA-Z][^>]*)>/g, (tag, body: string) => {
    const attribute = body.match(/\sstyle="([^"]*)"/);
    if (!attribute) return tag;
    return `<${body.replace(attribute[0], ` ${HOISTED}="${attribute[1]}"`)}>`;
  });
}

/**
 * Applies every declaration parked by {@link hoistInlineStyles} under `root`, through the
 * CSSOM, and clears the marker.
 *
 * Declarations Monaco emits are plain `prop:value` pairs (`top:126px`, `width:22px`,
 * `line-height:18px`). A malformed pair is skipped rather than thrown on: this runs inside
 * a `MutationObserver` callback on the editor's render path, where an exception would take
 * out the rest of that batch — and a dropped declaration costs one misplaced element, where
 * a throw costs the whole view.
 */
export function applyHoistedStyles(root: ParentNode): void {
  for (const node of root.querySelectorAll(`[${HOISTED}]`)) {
    const declarations = node.getAttribute(HOISTED) ?? '';
    node.removeAttribute(HOISTED);
    if (!(node instanceof HTMLElement)) continue;

    for (const declaration of declarations.split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      node.style.setProperty(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
    }
  }
}

/** Whether {@link installStyleAttributeInterception} has already run. */
let styleAttributeIntercepted = false;

/**
 * Routes every `setAttribute('style', …)` on the page through the CSSOM instead.
 *
 * {@link replayRefusedStyleAttributes} repairs the damage after the fact, which restores what
 * the user sees but does not stop the browser reporting the refusal first — three reports per
 * editor session, straight at `report-uri /api/csp-violation-report`. This gets in front of
 * the write instead, which is the same thing {@link installInlineStyleHoisting} does for
 * Monaco's `innerHTML` markup and the reason that channel reports nothing.
 *
 * **Semantically transparent.** These two are defined to do the same work — parse the text
 * into the element's declaration block, and leave the attribute serialising back to it:
 *
 * ```js
 * el.setAttribute('style', value);
 * el.style.cssText = value;
 * ```
 *
 * The difference is only which one CSP governs. `style-src-attr` refuses the first and has
 * nothing to say about the second, which is the split `hoistInlineStyles` already relies on.
 *
 * Deliberately global, and deliberately not scoped to Monaco. It cannot be scoped: the write
 * happens on an element Monaco creates, so there is no container to wrap and no hook to pass
 * — and every other component on the page benefits from the same redirection, because any
 * `style` attribute any of them sets is refused by the same directive. Anything that is not a
 * `style` attribute on a styleable element goes to the native implementation untouched.
 *
 * Not released, for the same reason {@link installDocumentHeadAdoption} is not: it guards a
 * page-lifetime prototype, and unwrapping it when the last editor closes would reopen the
 * hole for the next one while a second editor might still be open.
 */
export function installStyleAttributeInterception(): void {
  if (styleAttributeIntercepted) return;
  styleAttributeIntercepted = true;

  const native = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function setAttribute(
    this: Element,
    name: string,
    value: string
  ): void {
    // `style` is the only attribute this touches, and only where there is a declaration
    // block to write to. SVG elements have one too, which is why this is not an
    // `instanceof HTMLElement` check.
    if (name.toLowerCase() === 'style' && 'style' in this) {
      (this as unknown as ElementCSSInlineStyle).style.cssText = value;
      return;
    }
    native.call(this, name, value);
  };
}

/** The subset of a Trusted Types policy Monaco actually calls. */
interface MonacoPolicy {
  createHTML?: (value: string) => string;
  createScriptURL?: (value: string) => string;
}

/**
 * Installs the hoisting hook on `MonacoEnvironment`.
 *
 * **Must be called before `import('monaco-editor')`.** Monaco creates its policies in
 * static initialiser blocks — `static { this._ttPolicy = createTrustedTypesPolicy(…) }` in
 * `viewLayer.js` and nine siblings — so they are all created while the module graph
 * evaluates. Setting the environment afterwards, which is where `getWorker` is set and
 * where this was tried first, is too late by exactly that much: the hook is never called,
 * the editor renders normally, and the violations keep arriving. Nothing reports the
 * mistake, so the ordering is pinned by a test.
 *
 * `createScriptURL` is passed straight through. The `defaultWorkerFactory` policy uses it
 * rather than `createHTML`, and dropping it would break worker loading — which is the
 * language services, not styling.
 *
 * Any environment already present is preserved, so this composes with `getWorker`.
 */
export function installInlineStyleHoisting(): void {
  const environment = (self.MonacoEnvironment ?? {}) as Record<string, unknown>;

  self.MonacoEnvironment = {
    ...environment,
    createTrustedTypesPolicy(_name: string, options: MonacoPolicy) {
      const createHTML = (value: string) => {
        const hoisted = hoistInlineStyles(value);
        return options.createHTML ? options.createHTML(hoisted) : hoisted;
      };
      return { createHTML, createScriptURL: options.createScriptURL };
    }
  } as typeof self.MonacoEnvironment;
}
