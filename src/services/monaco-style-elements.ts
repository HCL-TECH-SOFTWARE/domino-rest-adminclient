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

/**
 * Registers `root` as a tree whose style elements must be adopted rather than inserted, and
 * adopts any already in it.
 *
 * {@link adoptStyleElements} wraps `appendChild` on one node, which covers the two containers
 * the #1002 investigation found. That investigation recorded a third, in `div.monaco-list`,
 * as *empty* — and it was: the list widget only fills its stylesheet the first time the
 * suggest widget opens, and nothing had opened one. Measured with the widget open, it is
 * **5,160 characters** across 29 rules, and it is refused, so the suggest list loses the rule
 * that highlights the focused row. Its background stays `rgba(0, 0, 0, 0)` where adopting the
 * same text gives `rgb(0, 96, 192)`: you cannot see which completion is selected (#1024).
 *
 * Wrapping one node cannot catch it, because the list builds itself detached and is attached
 * whole. What catches it is {@link installStyleElementInterception}, which needs to know
 * which trees are ours — that is what this registers.
 *
 * @param root   the shadow root to claim
 * @param target the adoption target — normally `root` itself
 * @returns an unregister function; call it on teardown
 */
export function watchStyleElementsIn(root: ParentNode & Node, target: AdoptionTarget): () => void {
  if (!('adoptedStyleSheets' in target)) return () => {};

  const syncObservers: MutationObserver[] = [];

  const adopt = (element: HTMLStyleElement) => {
    const sheet = new CSSStyleSheet();
    const sync = () => sheet.replaceSync(element.textContent ?? '');
    sync();
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
    // A no-op when the interception got here first and the element was never inserted.
    element.remove();

    // Monaco rewrites these in place — the list re-emits every rule on a theme change — and
    // observers fire on detached nodes, which is what makes keeping the element out of the
    // tree safe rather than a one-shot copy.
    const observer = new MutationObserver(sync);
    observer.observe(element, { childList: true, characterData: true, subtree: true });
    syncObservers.push(observer);
  };

  watchedRoots.set(root, adopt);
  for (const style of root.querySelectorAll('style')) adopt(style);

  return () => {
    watchedRoots.delete(root);
    for (const sync of syncObservers) sync.disconnect();
    syncObservers.length = 0;
  };
}

/**
 * The roots {@link watchStyleElementsIn} has claimed, and how to adopt into each.
 *
 * A module-level registry rather than a parameter, because the interception below patches
 * prototypes shared by the whole page and has to decide, per insertion, whether the
 * destination is one of ours.
 */
const watchedRoots = new Map<Node, (element: HTMLStyleElement) => void>();

/** Whether {@link installStyleElementInterception} has already run. */
let styleElementIntercepted = false;

/**
 * Diverts a `<style>` appended anywhere inside a watched shadow root into its
 * `adoptedStyleSheets`, before it ever enters the tree.
 *
 * The subtree observer in {@link adoptStyleElementsIn} cannot win this race, and the reason
 * is worth writing down because it looks like it should. `createStyleSheet` appends the
 * element **empty** — `listWidget.js` passes no `beforeAppend` — so the append itself is not
 * a violation. `DefaultStyleController` then fills it in the *same task*, while a
 * `MutationObserver` callback is still queued as a microtask. The text is parsed, refused and
 * reported before the observer ever runs. Every *later* rewrite is silent, because by then
 * the element is detached — which is why the symptom was exactly one report per list.
 *
 * So this wraps `Node.prototype.appendChild`, which is synchronous and therefore early
 * enough. It is as narrow as a prototype patch can be: it acts only on an `HTMLStyleElement`
 * whose destination is inside a root some editor registered. Every other append on the page
 * — every Lit render, every Web Awesome component — reaches the native implementation with
 * one `instanceof` and one `Map` lookup in front of it.
 *
 * Not released, for the same reason {@link installDocumentHeadAdoption} is not. The registry
 * empties as editors tear down, so with no editor mounted the wrapper is inert.
 */
export function installStyleElementInterception(): void {
  if (styleElementIntercepted) return;
  styleElementIntercepted = true;

  const divert = (destination: Node, incoming: Node): boolean => {
    if (watchedRoots.size === 0) return false;
    const adoptInto = watchedRoots.get(destination.getRootNode());
    if (!adoptInto) return false;

    if (incoming instanceof HTMLStyleElement) {
      adoptInto(incoming);
      return true; // never inserted
    }
    // The subtree case, which is the one that actually fires. Adopting the descendants
    // leaves the incoming node itself to be inserted normally, minus its stylesheets.
    if (incoming instanceof Element) {
      for (const style of incoming.querySelectorAll('style')) adoptInto(style);
    }
    return false;
  };

  const nativeAppend = Node.prototype.appendChild;
  Node.prototype.appendChild = function appendChild<T extends Node>(this: Node, node: T): T {
    if (divert(this, node)) return node;
    return nativeAppend.call(this, node) as T;
  };

  const nativeInsert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function insertBefore<T extends Node>(
    this: Node,
    node: T,
    child: Node | null
  ): T {
    if (divert(this, node)) return node;
    return nativeInsert.call(this, node, child) as T;
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
