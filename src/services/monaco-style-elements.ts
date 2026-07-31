/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Keeps the stylesheets Monaco injects from tripping `style-src-elem 'self'` (#1002).
 *
 * The last of the editor's CSP violations, and the only class that could not be reached
 * through a documented Monaco hook. `createStyleSheet()` in `base/browser/domStylesheets.js`
 * is:
 *
 * ```js
 * const style = document.createElement('style');
 * beforeAppend?.(style);        // the CSS text is set here …
 * container.appendChild(style); // … so the element is already populated when it lands
 * ```
 *
 * The text is in place before insertion, and there is no `MonacoEnvironment` hook on that
 * path — so nothing outside the module can get in front of it the way
 * `monaco-inline-styles.ts` gets in front of the `innerHTML` writes. What is available is
 * the **container**: measured against the built bundle, Monaco appends exactly two populated
 * style elements, and one of the containers is a `<div>` this application rendered.
 *
 * | container | size | what it is |
 * |---|---|---|
 * | `div.editor-container` — ours, inside the editor's shadow root | 136 kB | the theme sheet; blocking it is why syntax colouring was missing under the policy |
 * | `document.head` | 140 B | Monaco's global rule |
 *
 * (A third, in `div.monaco-list`, is empty — an empty `<style>` is not a violation.)
 *
 * So `appendChild` is wrapped on those two nodes, and a style element handed to either one
 * is adopted rather than inserted. Nothing is patched inside `monaco-editor`, and the policy
 * is untouched.
 *
 * Two things were measured rather than assumed, because both would have sunk this:
 *
 *  - **Monaco never reads `.sheet` on these elements.** A detached `<style>` has none, so a
 *    single read would have meant a `TypeError` instead of a stylesheet. Instrumented across
 *    editor construction and a theme switch: zero reads.
 *  - **It does rewrite `.textContent`,** once, on a theme change. A `MutationObserver` — which
 *    fires on detached nodes — replays that into the constructed sheet, so switching theme
 *    still recolours the editor.
 */

/** The half of `DocumentOrShadowRoot` this needs, so a test can pass a plain object. */
interface AdoptionTarget {
  adoptedStyleSheets: readonly CSSStyleSheet[];
}

/**
 * Adopts, rather than inserts, any style element appended to `container`.
 *
 * @param container the node Monaco appends to — wrapped in place, not subclassed
 * @param target    the document or shadow root whose `adoptedStyleSheets` receives the CSS
 * @returns a restore function that unwraps `container` and stops the resync observers
 */
export function adoptStyleElements(container: Node, target: AdoptionTarget): () => void {
  /*
   * Where adoption is unavailable, everything below is skipped and the element is inserted
   * as it is today: the styles apply, and the violation is reported. That is the same
   * degradation `adoptStyles()` makes in `keep-monaco-editor`, and it is the reason this
   * checks the capability rather than assuming it — a throw here would leave the editor
   * with no stylesheet at all, which is strictly worse than the problem being solved.
   */
  const native = container.appendChild.bind(container);
  if (!('adoptedStyleSheets' in target)) return () => {};

  const observers: MutationObserver[] = [];

  container.appendChild = (<T extends Node>(node: T): T => {
    if (!(node instanceof HTMLStyleElement)) return native(node);

    const sheet = new CSSStyleSheet();
    const sync = () => sheet.replaceSync(node.textContent ?? '');
    sync();
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];

    // Monaco rewrites the theme sheet's text in place when the theme changes. Observers
    // fire on detached nodes, which is what makes leaving the element out of the tree safe.
    const observer = new MutationObserver(sync);
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    observers.push(observer);

    return node;
  }) as typeof container.appendChild;

  return () => {
    container.appendChild = native;
    for (const observer of observers) observer.disconnect();
    observers.length = 0;
  };
}

/** Whether {@link installDocumentHeadAdoption} has already run. */
let headAdopted = false;

/**
 * Same interception for `document.head`, installed once for the page.
 *
 * **Must be called before `import('monaco-editor')`,** for the same reason
 * `installInlineStyleHoisting()` must be: Monaco writes its global rule into `document.head`
 * while its module graph evaluates, so an editor that installs this from `firstUpdated()` —
 * which is where it was, and where it looks like it belongs — is one violation too late.
 * Measured: exactly one, on the first editor of the session, and nothing afterwards.
 *
 * Not released. It is a page-lifetime node and Monaco can write to it at any point, so
 * unwrapping when the last editor closes would reopen the hole for the next one. The wrapper
 * is narrow — it acts only on `<style>` elements, and adopting one is what the CSP wants
 * from anything that appends a stylesheet to the head.
 */
export function installDocumentHeadAdoption(): void {
  if (headAdopted) return;
  headAdopted = true;
  adoptStyleElements(document.head, document);
}
