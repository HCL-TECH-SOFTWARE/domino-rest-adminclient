/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-page-loading';
import { RouterController } from '../../router/RouterController';
import { StoreController } from '../../store/StoreController';
import { store } from '../../store/store';
import { authenticate, removeAuth, renewToken, setIdpLogin } from '../../store/account/action';
import type { TokenProps } from '../../store/account/types';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/keep-elements/keep-app');

/**
 * The three things this app can be showing at its outermost level.
 *
 * Not a route table. `App.tsx` expressed the same decision as one because `RouterOutlet` was
 * the tool it had, and that cost more than it looked: `Router.setRoutes` holds *one* table and
 * overwrites it, so App's two-route version and the main region's seven-route version were two
 * writers racing. App's was `[/callback, *]` with a `load` on the catch-all, so whenever it
 * wrote last `Router.prefetch` (#813) matched `*` for every path and fetched the already-loaded
 * shell instead of the view under the pointer. Which one was live changed over a session: App's
 * effect re-ran when `authenticated` changed, the outlet's `willUpdate` on every navigation.
 *
 * `keep-views` holds the only outlet now, so the published table no longer depends on ordering.
 */
type View = 'callback' | 'shell' | 'login';

/**
 * How to fetch each view, and the reason `AppShell` stopped being eager (#974).
 *
 * `App.tsx` imported it **both ways** — statically for the `/callback` route's `element:` and
 * dynamically for the catch-all's `load:`. A static import wins, so the dynamic one emitted no
 * chunk and the whole authenticated shell sat in the entry closure: every visitor stopped at
 * the login screen downloaded it. Nothing about the file said so, and the build log does not
 * distinguish eager from lazy — `dist/.vite/manifest.json` does, which is what the bundle gate
 * reads.
 *
 * Both `import()` calls of a shared module resolve to the same chunk, so the shell is fetched
 * once whichever of its two views is reached first.
 *
 * **Write the specifiers inline.** They have to be statically analysable or the bundler emits
 * one chunk for everything (#813).
 */
const LOADERS: Record<View, () => Promise<unknown>> = {
  callback: () => Promise.all([import('./keep-app-shell'), import('./keep-callback-page')]),
  shell: () => Promise.all([import('./keep-app-shell'), import('./keep-views')]),
  login: () => import('./keep-login-page'),
};

/** The main region on every real route. Module scope, so its identity never changes. */
const VIEWS_SHELL = html`<keep-app-shell
  .main=${html`<keep-views></keep-views>`}
></keep-app-shell>`;

/** Shown while a view's chunk is in flight. */
const LOADING = html`<keep-page-loading message="loading page"></keep-page-loading>`;

/**
 * The application root. Tag: `keep-app`.
 *
 * Converted from `App.tsx` (#719 half 2) — the last React component in the tree, and with it
 * `react`, `react-dom`, `react-redux`, `@lit/react` and the whole `keep-elements/react/`
 * wrapper directory.
 *
 * Its three jobs are the ones the component had: restore the session from local storage,
 * decide which of {@link View} the current URL and auth state call for, and fetch that view's
 * chunk. Everything below it — routing, the shell's chrome, the screens — belongs to
 * `keep-app-shell` and `keep-views`.
 *
 * ## Light DOM
 *
 * {@link createRenderRoot} returns `this`, as `keep-app-shell` does and for its reason: the
 * shell's stylesheet, Web Awesome's `native.css` and four utility classes in `styles.css` are
 * all document-scope, and a shadow root anywhere above the shell puts its markup out of their
 * reach. See that element's class note for the full argument.
 *
 * ## The session is restored before the first render, not after it
 *
 * `App.tsx` held a `valid` flag that started `false` and was set `true` by the same effect
 * that read the token, so the first pass always rendered the loading page and the real
 * decision was made on the second. `connectedCallback` runs before Lit's first update, so
 * there is nothing left for that flag to sequence and it is dropped rather than ported: the
 * `authenticate()` dispatch has already landed by the time {@link view} is first read.
 */
@customElement('keep-app')
export default class App extends KeepElement {
  /** Light DOM — see the class note. */
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  private readonly authenticated = new StoreController(this, (s) => s.account.authenticated);

  /** Only the path decides a view; a query-string change must not re-run the decision. */
  private readonly route = new RouterController(this, (location) => location.pathname);

  /**
   * Views whose module has arrived. Only ever grows — nothing is unloaded — so returning to
   * one already fetched renders it without a second pass through the loading page.
   */
  @state() private accessor ready: ReadonlySet<View> = new Set();

  /** Views already asked for, so a re-render does not ask again. Not reactive by design. */
  private readonly requested = new Set<View>();

  /** Guards the session restore against a reconnect: re-mounting must not re-dispatch. */
  private restored = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.restored) return;
    this.restored = true;
    this.restoreSession();
  }

  /**
   * Adopt whatever session local storage still holds.
   *
   * A straight port, including the shape of the branches: an identity-provider token is left
   * alone (its lifetime is the provider's business), a password token inside its window is
   * renewed, and one outside it is dropped. A token that will not parse is removed rather than
   * left to fail again on the next load.
   */
  private restoreSession(): void {
    const jwtToken = localStorage.getItem('user_token');
    if (!jwtToken) return;

    try {
      const parsedToken = JSON.parse(jwtToken);
      // An `access_token` is what an IDP round trip leaves behind; a password login does not.
      const idpLogin = !!parsedToken.access_token;
      if (idpLogin) store.dispatch(setIdpLogin(true));

      const { issueDate, expSeconds } = parsedToken as TokenProps;
      const storageTokenTime = new Date(issueDate).getTime() + 1000 * expSeconds;
      const today = new Date().getTime();

      store.dispatch(authenticate());
      if (today < storageTokenTime && !idpLogin) {
        store.dispatch(renewToken());
      } else if (!idpLogin) {
        store.dispatch(removeAuth());
      }
    } catch {
      // Corrupted — clear it and force a re-login rather than failing here every load.
      localStorage.removeItem('user_token');
      store.dispatch(removeAuth());
    }
  }

  /**
   * `/callback` first, and unguarded by authentication: it is the OIDC redirect landing, so
   * the whole point of it is that the session does not exist yet.
   */
  private get view(): View {
    if (this.route.value === '/callback') return 'callback';
    return this.authenticated.value ? 'shell' : 'login';
  }

  /*
   * Fetching happens on the way *into* an update, not after one. Starting it in `updated()`
   * would schedule a second update per change and paint the loading page one frame later than
   * necessary.
   */
  protected willUpdate(): void {
    this.fetch(this.view);
  }

  private fetch(view: View): void {
    if (this.requested.has(view)) return;
    this.requested.add(view);

    void LOADERS[view]().then(
      () => {
        this.ready = new Set(this.ready).add(view);
      },
      (error: unknown) => {
        /*
         * Retryable: dropping it from `requested` means the next update asks again, and the
         * next update is one navigation or one auth change away. A failed chunk therefore
         * leaves the loading page up rather than blanking the app permanently.
         */
        this.requested.delete(view);
        log.error('Failed to load a top-level view', { view, error });
      },
    );
  }

  /**
   * Going home after a password login (#806 wave 6).
   *
   * `keep-login-page` emits `login-success` rather than navigating itself, and the ordering
   * this pins — authenticate, *then* go home — is what the join is for. `App.tsx` caught the
   * event on `document`, because the page was rendered by an outlet that passed it no props;
   * bound to the element here, there is no document listener to install or tear down.
   */
  private readonly goHome = (): void => {
    this.route.navigate('/');
  };

  /**
   * The OIDC landing, wrapped in the shell — the one place the shell is on screen with
   * something other than the router behind it.
   *
   * An instance field rather than a module constant because of {@link goHome}, and declared
   * after it: class fields initialise in source order, so the handler has to exist first.
   */
  private readonly callbackShell = html`<keep-app-shell
    .main=${html`<keep-callback-page @authenticated=${this.goHome}></keep-callback-page>`}
  ></keep-app-shell>`;

  render() {
    const view = this.view;
    if (!this.ready.has(view)) return LOADING;

    if (view === 'callback') return this.callbackShell;
    if (view === 'shell') return VIEWS_SHELL;
    return html`<keep-login-page @login-success=${this.goHome}></keep-login-page>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-app': App;
  }
}
