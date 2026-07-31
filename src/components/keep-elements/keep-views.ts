/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-navigation-guard';
import './keep-page-routers';
import './keep-breadcrumb-router';
import './keep-page-loading';
import './keep-router-outlet';
import type { KeepRoute } from './keep-router-outlet';
import { StoreController } from '../../store/StoreController';
import { store } from '../../store/store';
import { ROUTER_BASE } from '../../router/instance';
import { RouterController } from '../../router/RouterController';
import { setLoading } from '../../store/loading/action';
import { fetchScopes, fetchKeepPermissions } from '../../store/databases/action';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/keep-elements/keep-views');

/**
 * The main region's loading state, while a route's chunk is in flight.
 *
 * One module-scope instance rather than a fresh `html` per render: it is handed to the outlet
 * as a property, and a new object every update would re-render the outlet for nothing.
 */
const LOADING_VIEW = html`<keep-page-loading message="loading view"></keep-page-loading>`;

/** Page title suffix per first path segment. Anything unlisted is the overview. */
const SUBTITLES: Record<string, string> = {
  scope: 'Scopes',
  schema: 'Schemas',
  apps: 'Applications',
};

/**
 * The authenticated main region and its route table. Tag: `keep-views`.
 *
 * Converted from `Views.tsx` (#719 P4). The React file's job was to be the one place that
 * knew the seven routes, and it could not stop being React while `RouterOutlet` was a React
 * component — which is why this element and `keep-router-outlet` land together.
 *
 * ## What that swap actually removed
 *
 * Eleven `@lit/react` wrappers. Seven of them existed only because `React.lazy` needs a module
 * whose default export is a *component*, and a `keep-*` module's default export is a class, so
 * every route pointed at a wrapper instead of at the element behind it. The routes below name
 * the tag and import the module for its registration side effect; nothing stands between the
 * route and the screen any more.
 *
 * ## The routes
 *
 * `guard` is what `<Route element={<PrivateRoutes/>}>` used to be: that wrapper existed only
 * to render an `<Outlet/>` or a `<Navigate to='/'/>`, which is a predicate and a redirect
 * target written as a component. Both are fields here.
 *
 * It is belt-and-braces either way: `App.tsx` only renders `AppShell` — and so this element —
 * when authenticated, so the redirect branch is not reachable today.
 *
 * `/callback` is deliberately absent. It was declared here as well as in `App.tsx`, but App's
 * copy always won, and its element is the whole page rather than a main-region view, so this
 * one could never render.
 *
 * `/mail` stays commented out: the Mail/Dashboard pair is blocked on LABS-1214 (#698).
 * `/settings` went with `src/components/settings/` (#681), and `/groups` and `/people` went
 * with their screens in #770 — the v6 router upgrade (9324783, 2024-04-25) commented all four
 * out instead of converting them, and nobody noticed for fifteen months. When `/mail` returns
 * it returns as one more entry in the table below, naming the `keep-mail` tag and lazily
 * importing that module — described rather than written out, because a sample call is
 * indistinguishable from a real one to anything that reads this file as text.
 */
@customElement('keep-views')
export default class Views extends KeepElement {
  static readonly styles = css`
    /* The document's border-box reset does not cross a shadow boundary. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /*
     * A block box, so the main region below measures the same as it did when the styled main
     * element was itself the one slotted into the page.
     */
    :host {
      display: block;
    }

    /*
     * The main region of the page element (#707), formerly the ViewContainer styled main.
     *
     * The horizontal padding used to belong to the deleted RightPanel; it moved here because
     * this is the element that occupies the main column. Its old second job — overriding the
     * page element's own 48px padding for a slotted main — is gone with the shadow boundary:
     * that rule reaches the host, and the host is no longer a main.
     *
     * The height stays viewport-relative rather than 100% because both bars it subtracts sit
     * outside the page element's own grid rows: the 23px keep-footer bar is a fixed overlay,
     * and the header-height custom property is what the page element measures its header
     * region to be. Reading that variable replaces a hardcoded 56px — get it wrong by a pixel
     * and the document gains a second scrollbar on top of this element's own. Custom
     * properties inherit across a shadow boundary, so it still reads here.
     */
    .view-container {
      position: relative;
      height: calc(100vh - var(--header-height, 0px) - 23px);
      overflow-y: auto;
      padding: 0 40px;
    }

    @media only screen and (width < 768px) {
      /* No footer overlay below the breakpoint — see the media query in keep-footer.ts. */
      .view-container {
        height: calc(100vh - var(--header-height, 0px));
        padding: 0;
      }
    }
  `;

  /*
   * Five controllers over four primitives and one flag, rather than one over each slice.
   *
   * Change detection is `Object.is` on the selector's result, so a slice selector re-renders
   * this element on every unrelated write to `state.databases` — which the schemas screens do
   * constantly. Each of these is exactly one `useSelector` this file used to hold.
   */
  private readonly scopePull = new StoreController(this, (s) => s.databases.scopePull);

  private readonly databasePull = new StoreController(this, (s) => s.databases.databasePull);

  private readonly authenticated = new StoreController(this, (s) => s.account.authenticated);

  private readonly idpLogin = new StoreController(this, (s) => s.account.idpLogin);

  private readonly quickConfigDrawer = new StoreController(
    this,
    (s) => s.drawer.quickConfigDrawer,
  );

  /** Only the first path segment decides a title or a fetch, so nothing narrower is read. */
  private readonly route = new RouterController(this, (location) => location.pathname);

  /**
   * The predicate every route below is guarded on, as one bound field.
   *
   * An arrow rather than a method: the outlet calls it as a bare function, so a method would
   * run with `this` undefined and the guard would throw instead of answering.
   */
  private readonly guard = (): boolean => this.authenticated.value;

  /**
   * The route table, built once.
   *
   * `Views.tsx` rebuilt this in a `useMemo` keyed on `authenticated`, because `RouterOutlet`
   * memoised one `React.lazy` per route on the table's identity and a fresh table remounted
   * every view. Nothing here is keyed on identity: {@link guard} reads the controller live, so
   * the table is a constant and the predicate is the only moving part.
   *
   * The `import()` calls are inline on purpose (#813). The specifier has to be statically
   * analysable for the bundler to emit a chunk per route, so a helper taking a path string
   * would silently produce one big chunk again.
   */
  private readonly routes: readonly KeepRoute[] = [
    {
      path: '/',
      tag: 'keep-homepage',
      load: () => import('./keep-homepage'),
      guard: this.guard,
      redirectTo: '/',
    },
    {
      path: '/schema',
      tag: 'keep-schemas-list',
      load: () => import('./keep-schemas-list'),
      guard: this.guard,
      redirectTo: '/',
    },
    {
      path: '/schema/:nsfPath/:dbName',
      tag: 'keep-forms-container',
      load: () => import('./keep-forms-container'),
      guard: this.guard,
      redirectTo: '/',
    },
    {
      path: '/schema/:nsfPath/:dbName/:formName/access',
      tag: 'keep-access-mode',
      load: () => import('./keep-access-mode'),
      guard: this.guard,
      redirectTo: '/',
    },
    {
      path: '/scope',
      tag: 'keep-scopes-list',
      load: () => import('./keep-scopes-list'),
      guard: this.guard,
      redirectTo: '/',
    },
    {
      /*
       * Before `/apps/consents`, and safely so: a pattern with no trailing `*` has to match
       * segment for segment, so `/apps` cannot swallow the deeper path.
       */
      path: '/apps',
      tag: 'keep-applications',
      load: () => import('./keep-applications'),
      guard: this.guard,
      redirectTo: '/',
    },
    {
      path: '/apps/consents',
      tag: 'keep-consents-container',
      load: () => import('./keep-consents-container'),
      guard: this.guard,
      redirectTo: '/',
    },
  ];

  /**
   * Whether the quick-config drawer has ever been opened; see {@link mountQuickConfig}.
   * Latches, and is never cleared.
   */
  @state() private accessor quickConfigMounted = false;

  /** Whether its import is in flight, so a re-render does not ask for it again. */
  private quickConfigLoading = false;

  /** Whether the one-shot permissions fetch has been made. */
  private permissionsFetched = false;

  /** Whether a `fetchScopes` is in flight — the replacement for the old `useRef` guard. */
  private scopePulling = false;

  /** The previous `idpLogin`, because that effect is edge-triggered and must stay so. */
  private previousIdpLogin: boolean | undefined;

  /*
   * Every store- and URL-driven effect the React file held, on the way *into* an update.
   *
   * `willUpdate` rather than `updated`: a dispatch after a completed update schedules a second
   * one and costs a frame, and the first painted frame is then the one without the data. The
   * deeper reason the shapes differ is that a `useEffect` dependency array is *edge*-triggered
   * while `willUpdate` is *level*-triggered, and `StoreController` calls `requestUpdate()` with
   * no property name — so there is nothing in the changed-properties map to key off.
   *
   * The answer is idempotence, not a synthetic edge: the title write, the two latches and the
   * two store-guarded fetches below are all safe to run on any update. Only
   * {@link refetchOnIdpLogin} genuinely needs an edge, and it keeps its own.
   */
  protected willUpdate(): void {
    const section = this.section;

    // Writing the same string is a no-op, so this needs no edge of its own.
    document.title = `HCL Domino REST API | ${SUBTITLES[section] ?? 'Overview'}`;

    if (!this.permissionsFetched) {
      this.permissionsFetched = true;
      store.dispatch(fetchKeepPermissions());
    }

    this.pullScopes(section);
    this.showLoadingOnSchemas(section);
    this.refetchOnIdpLogin();

    if (this.quickConfigDrawer.value) this.mountQuickConfig();
  }

  /** The first path segment: `''` for `/`, `schema`, `scope`, `apps`. */
  private get section(): string {
    return this.route.value.split('/')[1] ?? '';
  }

  /**
   * Fetch the scopes the current screen needs, once.
   *
   * The in-flight flag is a plain field rather than reactive state for the reason the `useRef`
   * it replaces was a ref: flipping it must not itself cause a render, or the fetch and the
   * render chase each other.
   */
  private pullScopes(section: string): void {
    if (this.scopePull.value) {
      this.scopePulling = false;
      return;
    }

    const needsScopes =
      section === '' ||
      section.startsWith('scope') ||
      section.startsWith('apps') ||
      section.startsWith('schema');

    if (needsScopes && !this.scopePulling) {
      this.scopePulling = true;
      store.dispatch(fetchScopes());
    }
  }

  /**
   * Show the spinner on the schemas screens while either pull is still outstanding.
   *
   * The React version also cleared a `databasePullingRef` here. That ref was written and never
   * read anywhere in the file, so it is dropped rather than ported.
   */
  private showLoadingOnSchemas(section: string): void {
    if (!section.startsWith('schema')) return;
    if (!this.scopePull.value || !this.databasePull.value) {
      store.dispatch(setLoading({ status: true }));
    }
  }

  /**
   * Re-fetch after an identity-provider login.
   *
   * The one effect here that must stay edge-triggered. Run on every update it would dispatch
   * two fetches per render for as long as the flag is set, and each fetch writes the store,
   * which schedules the next render.
   */
  private refetchOnIdpLogin(): void {
    const idpLogin = this.idpLogin.value;
    if (idpLogin === this.previousIdpLogin) return;
    this.previousIdpLogin = idpLogin;
    if (!idpLogin) return;
    store.dispatch(fetchScopes());
    store.dispatch(fetchKeepPermissions());
  }

  /**
   * Bring in the quick-config drawer on its first open, and leave it mounted (#813 step 3).
   *
   * It was the only thing on the eager path that reached the schema validator, and it renders a
   * drawer that starts closed — so the entry chunk was paying for a form most sessions never
   * open.
   *
   * Mounting it *while* the flag is true would be the smaller change and is what the issue
   * suggests, but it breaks two things. `keep-drawer` wraps a drawer whose close is animated
   * and whose after-hide event fires only once that animation finishes; unmounting the instant
   * the flag clears skips both. And the element renders the database-error alert *outside* the
   * drawer, so an error would vanish the moment the drawer closed rather than staying up to be
   * read.
   *
   * Mounting on first open and leaving it mounted keeps both behaviours. The one visible
   * difference is that the very first open has no slide-in animation, because the element
   * mounts with its open flag already set.
   */
  private mountQuickConfig(): void {
    if (this.quickConfigLoading) return;
    this.quickConfigLoading = true;
    void import('./keep-quick-config-drawer').then(
      () => {
        this.quickConfigMounted = true;
      },
      (error: unknown) => {
        // Retryable: the next open asks again rather than leaving the drawer permanently dead.
        this.quickConfigLoading = false;
        log.error('Failed to load the quick config drawer', { error });
      },
    );
  }

  render() {
    return html`
      <main id="main-stack" class="view-container">
        <!--
          A sibling, not a wrapper. It was a provider around the routes, but its state lives in
          the store now (#806 decision 1) and its listeners are on document and window — so the
          subtree it appeared to scope was never the subtree it guarded, and a component moved
          out of it would have looked guarded and not been.
        -->
        <keep-navigation-guard basename=${ROUTER_BASE}></keep-navigation-guard>
        <keep-page-routers>
          <keep-breadcrumb-router></keep-breadcrumb-router>
        </keep-page-routers>
        <keep-router-outlet
          .routes=${this.routes}
          .fallback=${LOADING_VIEW}
        ></keep-router-outlet>
        ${this.quickConfigMounted
          ? html`<keep-quick-config-drawer></keep-quick-config-drawer>`
          : nothing}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-views': Views;
  }
}
