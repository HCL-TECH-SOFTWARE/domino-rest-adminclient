/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-unsaved-changes-dialog';
import { RouterController } from '../../router/RouterController';
import { StoreController } from '../../store/StoreController';
import {
  allowNavigation,
  blockNavigation,
  cancelNavigation,
} from '../../store/navigationGuard/action';
import { selectIsDirty, selectPendingPath } from '../../store/navigationGuard/selectors';
import { runSaveFunction, setSaveFunction } from '../../store/navigationGuard/saveFunction';
import { BACK_NAVIGATION } from '../../store/navigationGuard/types';

/**
 * Guards against navigation away from a page with unsaved changes.
 *
 * ## Why this is an element and not a controller
 *
 * Wave 4 cut `NavigationGuardContext` along one line: state that can be serialised went to a
 * store slice, and the registered save function — a closure — went to a module singleton
 * beside it. What was left in the React component after that cut is two things, and the same
 * knife separates them:
 *
 * - three listener registrations whose lifetime has to match *something's* lifetime, and
 * - a dialog, which has to be rendered somewhere.
 *
 * A reactive controller answers the first and not the second, and it needs a Lit host to give
 * it that lifetime — which does not exist here. The guard's only mount point is `Views.tsx`,
 * a React file that stays React through P4, so a controller would have to be hosted by the
 * very thing that has not converted yet. A plain `installNavigationGuard()` module is the
 * honest shape for "listeners on `document` and `window`", but it hands the teardown problem
 * to whoever calls it and still leaves the dialog homeless: someone has to render
 * `keep-unsaved-changes-dialog` and wire its three events.
 *
 * A custom element is the thing that already has connect/disconnect semantics, already has
 * somewhere to put the dialog, and — the deciding point — is a place that can clear the
 * registered save function on disconnect, which `saveFunction.ts`'s own docblock asks for and
 * which nothing was doing when the guard itself went away.
 *
 * ## It renders nothing but the dialog, and takes no children
 *
 * The listeners below are on `document` and `window`, so what is guarded is the whole app
 * rather than a subtree. It was a provider wrapping the routes, which implied a scope it
 * never actually had — a component moved out of that subtree by #806 would have looked
 * guarded and not been. The host is `display: contents` for the same reason: it is a mount
 * point, not a box, and must not become a flex item of whatever contains it.
 *
 * Four kinds of navigation are intercepted:
 *
 * 1. **Hard navigation** (address-bar change, refresh, tab close) → `beforeunload`.
 * 2. **In-app anchor links** → a document-level click listener in the *capture* phase.
 *    Anchors inside a component's shadow root count: see the `composedPath()` note on
 *    {@link handleDocumentClick} (#884, fixed in #901).
 * 3. **Browser back / forward** → `popstate`.
 * 4. **Programmatic navigation** → callers ask the store first, as `keep-breadcrumb-router`
 *    does: dispatch `blockNavigation(path)` when `selectIsDirty` says so, navigate otherwise.
 *
 * All three listeners are registered only while something is dirty. The old provider kept
 * them installed permanently and had each handler return early, which put a capture-phase
 * listener in front of every click in the app for the whole session.
 */
@customElement('keep-navigation-guard')
export default class NavigationGuard extends KeepElement {
  static styles = css`
    /* A mount point, not a box. Without this the host is an inline box in whatever lays out
       the app shell, which is a layout change for a component that renders nothing visible
       until the dialog opens. */
    :host {
      display: contents;
    }
  `;

  /** Router basename so we can strip it from anchor href attributes (e.g. "/admin/ui"). */
  @property({ type: String }) accessor basename = '';

  /*
   * Two controllers over the two primitive selectors, rather than one over the slice object.
   *
   * That is what `navigationGuard/selectors.ts` says they are for, and it keeps the pair a
   * 1:1 rename of the two `useSelector` calls this replaced. `dispatch` is `store.dispatch`
   * on either of them; every action dispatched here changes `pendingPath`, so `pending` is
   * the one spelling used throughout.
   */
  private readonly dirty = new StoreController(this, selectIsDirty);

  private readonly pending = new StoreController(this, selectPendingPath);

  /*
   * The guard never reads the location — only moves it — so the selector is constant and this
   * host never re-renders on navigation. `navigate()` reads the router on each call, which is
   * what lets a test install a memory-backed one after the element exists.
   */
  private readonly route = new RouterController(this, () => null);

  /** Whether the three listeners are currently installed. Mirrors "something is dirty". */
  private listening = false;

  connectedCallback(): void {
    super.connectedCallback();
    // Not left to `willUpdate` alone: a re-connected element gets no update of its own, and
    // the page can already be dirty by the time this one arrives.
    this.syncListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // `isConnected` is already false here, so this is the removal path.
    this.syncListeners();
    /*
     * Clear the registered save.
     *
     * The screen that registers one clears it on its own teardown (`keep-access-tabs` does),
     * but nothing was clearing it when the *guard* went away — and the function that would be
     * called next is a closure over a screen that is no longer on the page. Belt to that pair
     * of braces, and what `saveFunction.ts`'s docblock asks for.
     */
    setSaveFunction(null);
  }

  /*
   * Listener installation is store-driven state, so it belongs on the way *into* an update,
   * not after one. `StoreController.sync` calls `requestUpdate()` with no property name, so
   * there is nothing in the changed-properties map to key off — `syncListeners` is idempotent
   * instead, and `listening` is the edge the map would otherwise have provided.
   */
  protected willUpdate(): void {
    this.syncListeners();
  }

  private syncListeners(): void {
    const wanted = this.isConnected && this.dirty.value;
    if (wanted === this.listening) return;
    this.listening = wanted;
    if (wanted) {
      this.startListening();
    } else {
      this.stopListening();
    }
  }

  private startListening(): void {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    // Capture phase so we run *before* the router's own handler — and before the anchor's,
    // which is what `stopPropagation()` below relies on.
    document.addEventListener('click', this.handleDocumentClick, true);
    // Push once when the page turns dirty, so the first Back has an entry to land on.
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', this.handlePopState);
  }

  private stopListening(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('click', this.handleDocumentClick, true);
    window.removeEventListener('popstate', this.handlePopState);
  }

  /* ------------------------------------------------------------------ *
   *  1. beforeunload — browser address-bar / refresh / close            *
   * ------------------------------------------------------------------ */

  private readonly handleBeforeUnload = (e: BeforeUnloadEvent): void => {
    e.preventDefault();
    // Required by some browsers (Chrome, older Edge)
    e.returnValue = '';
  };

  /* ------------------------------------------------------------------ *
   *  2. Capture-phase click — intercept <a> clicks                      *
   * ------------------------------------------------------------------ */

  private readonly handleDocumentClick = (e: MouseEvent): void => {
    // The nearest <a> the click actually passed through. `composedPath()` rather than
    // `closest()` because `e.target` is **retargeted to the host** for anything inside a
    // shadow root, and `closest()` then walks light-DOM ancestors that hold no anchor: the
    // handler returned here and navigation proceeded with the user's work discarded, with no
    // error and nothing to notice (#884). The path is ordered target-outward, so `find`
    // gives the nearest anchor, which is what `closest()` meant.
    //
    // A *closed* shadow root is still invisible — `composedPath()` stops at one, and no
    // traversal gets past it. Nothing here uses one; Lit and Web Awesome both open theirs.
    const anchor = e
      .composedPath()
      .find(
        (node): node is HTMLAnchorElement =>
          node instanceof HTMLAnchorElement && node.hasAttribute('href'),
      );
    if (!anchor) return;

    // The attribute, not `anchor.href`: the resolved property is absolute
    // ("http://host/scope"), which the `startsWith('http')` test below would read as an
    // external link and wave through — and the basename stripping wants the attribute form.
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
      return; // external / mail / hash links — let them through
    }

    // Stop the browser navigating, and the link's own click handler from running — this
    // listener is on the capture phase precisely so it decides first. (react-router was
    // removed in #716; the in-repo router is what handles the click otherwise.)
    e.preventDefault();
    e.stopPropagation();

    // Strip the router basename to recover the route-relative path
    const routePath =
      this.basename && href.startsWith(this.basename)
        ? href.slice(this.basename.length) || '/'
        : href;

    this.pending.dispatch(blockNavigation(routePath));
  };

  /* ------------------------------------------------------------------ *
   *  3. popstate — browser back / forward buttons                       *
   * ------------------------------------------------------------------ */

  private readonly handlePopState = (): void => {
    // Push the current URL back to undo the navigation
    window.history.pushState(null, '', window.location.href);
    this.pending.dispatch(blockNavigation(BACK_NAVIGATION));
  };

  /* ------------------------------------------------------------------ *
   *  Dialog callbacks                                                    *
   * ------------------------------------------------------------------ */

  /**
   * The user is leaving: clear the guard, then perform what was held.
   *
   * The pending path is read **before** the dispatch. The store notifies synchronously, so
   * `allowNavigation()` has already reset `pending.value` to `null` by the time `dispatch`
   * returns — where React closed over the value its render was given and never had to think
   * about it. Reading afterwards is a guard that always returns early: the dialog closes and
   * the user stays exactly where they asked not to be.
   *
   * `pendingPath` can also legitimately be `null` here — the dialog is always rendered and
   * only its `open` changes, so its events can arrive with nothing queued. A stray one must
   * not navigate the user anywhere.
   */
  private leave(): void {
    const pending = this.pending.value;
    this.pending.dispatch(allowNavigation());
    if (!pending) return;
    if (pending === BACK_NAVIGATION) {
      this.route.navigate(-1);
      return;
    }
    this.route.navigate(pending);
  }

  private async handleSave(): Promise<void> {
    await runSaveFunction();
    this.leave();
  }

  private handleCancel(): void {
    this.pending.dispatch(cancelNavigation());
  }

  render() {
    return html`
      <keep-unsaved-changes-dialog
        ?open=${this.pending.value !== null}
        @dialog-save=${this.handleSave}
        @dialog-discard=${this.leave}
        @dialog-cancel=${this.handleCancel}
      ></keep-unsaved-changes-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-navigation-guard': NavigationGuard;
  }
}
