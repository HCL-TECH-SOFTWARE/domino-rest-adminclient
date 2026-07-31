/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * #685 — the policy that actually ships, in `jar/config/config.json`.
 *
 * That file is packaged verbatim into the JAR by `pom.xml` (`<resource><directory>jar`),
 * so what is written here is what a browser enforces against a real user. It is a plain
 * string in a JSON file: nothing validates it, and CSP fails open in the directions that
 * matter — a directive that is misspelled, duplicated or wildcarded simply stops
 * restricting, with no error anywhere.
 *
 * Every assertion below is a defect this file actually had.
 */

const ROOT = resolve(process.cwd());
const config = JSON.parse(readFileSync(resolve(ROOT, 'jar/config/config.json'), 'utf8'));
const entries: Record<string, { csp?: string }> = config.webapps.webjars;

const SPA = ['/admin/ui', '/admin/ui/*'];
const csp = (key: string) => entries[key].csp!;

/** `worker-src 'self' blob:` -> `{ 'worker-src': ["'self'", 'blob:'] }`, first wins. */
const directives = (policy: string) => {
  const map = new Map<string, string[]>();
  for (const part of policy.split(';').map((p) => p.trim()).filter(Boolean)) {
    const [name, ...values] = part.split(/\s+/);
    // CSP honours the FIRST occurrence of a directive and ignores every later one, so a
    // Map that keeps the first is what the browser sees.
    if (!map.has(name)) map.set(name, values);
  }
  return map;
};

/** Every occurrence, so a duplicate is visible rather than silently collapsed. */
const occurrences = (policy: string, name: string) =>
  policy.split(';').filter((part) => part.trim().split(/\s+/)[0] === name).length;

/**
 * A directive's source list with `'report-sample'` removed.
 *
 * It is not a source and matches nothing — it asks the browser to put a snippet of the
 * offending code into the report, which is what makes a `report-uri` payload triageable
 * rather than just a directive name. Production carries it on every directive now, so an
 * assertion about *sources* has to drop it or it fails on the keyword instead of the policy.
 */
const sources = (policy: string, name: string) =>
  (directives(policy).get(name) ?? []).filter((value) => value !== "'report-sample'");

describe('the shipped CSP (#685)', () => {
  it('gives both SPA entries the same policy', () => {
    // They disagreed: only `/admin/ui` opened img-src to `*`, so which URL the user landed
    // on decided how protected they were.
    expect(csp('/admin/ui')).toBe(csp('/admin/ui/*'));
  });

  it('declares no directive twice', () => {
    // `/admin/ui/*` declared worker-src twice. The browser used the first and ignored the
    // second, so editing the second would have done nothing at all.
    for (const key of Object.keys(entries)) {
      const policy = entries[key].csp;
      if (!policy) continue;
      const names = policy.split(';').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      expect(dupes, `${key} declares ${dupes.join(', ')} more than once`).toEqual([]);
      expect(occurrences(policy, 'worker-src')).toBeLessThan(2);
    }
  });

  it('keeps style-src-attr locked down', () => {
    // The directive the app was violating. `test/csp-inline-styles.test.ts` keeps source
    // free of style attributes; this keeps the reason for that rule from being deleted.
    for (const key of SPA) {
      expect(sources(csp(key), 'style-src-attr')).toEqual(["'none'"]);
    }
  });

  it('allows no inline script', () => {
    // `index.html` loads two modules by src and has no inline script. `'unsafe-inline'`
    // was re-added in 81c0335 for a pre-render theme <script> that has since moved into
    // src/index.ts; verified with zero violations against `npm run build` output.
    for (const key of SPA) {
      expect(sources(csp(key), 'script-src')).toEqual(["'self'"]);
    }
  });

  it('keeps blob: workers, which Monaco needs', () => {
    // keep-monaco-editor.ts instantiates the editor/json/ts workers through Vite `?worker`
    // imports. Drop blob: and the Source tab and Diff view stop working.
    for (const key of SPA) {
      expect(sources(csp(key), 'worker-src')).toContain('blob:');
    }
  });

  it('reaches no external origin', () => {
    // setBasePath is gone (#673) and icons are self-hosted via icon-library.ts, so the
    // WebAwesome CDN, fonts.gstatic.com and ssl.gstatic.com are all dead weight — and each
    // one is a third party that could serve script into this app.
    for (const key of Object.keys(entries)) {
      const policy = entries[key].csp ?? '';
      expect(policy, `${key} still allows an external origin`).not.toMatch(/https?:\/\//);
    }
  });

  it('lets connect-src reach an IdP, but only over https', () => {
    /*
     * `connect-src` cannot be `'self' data:`, and it no longer needs to be `*`.
     *
     * `src/components/login/pkce.js` fetches `idp.wellKnown` — the IdP's discovery document
     * — and then the `token_endpoint` that document names. For any external IdP (Entra ID,
     * Okta, Keycloak, Ping) both are a different origin, and the origin is deployment
     * specific, so it cannot be enumerated in a config file shipped inside the JAR. Narrowing
     * to `'self' data:` breaks SSO for every such deployment, and breaks it *after* the user
     * has authenticated: the navigation to the authorize endpoint is a top-level navigation,
     * which connect-src does not govern, so only the token exchange fails.
     *
     * `https:` is the scheme-source form and keeps that working while dropping cleartext
     * `http:`, `ws:` and `ftp:`, which the wildcard also allowed. Nothing in `src` opens a
     * WebSocket; Vite's HMR socket in dev is same-origin and covered by `'self'`.
     */
    for (const key of SPA) {
      expect(sources(csp(key), 'connect-src')).toEqual(["'self'", 'data:', 'https:']);
    }
  });

  it('spells the https scheme-source in a form that is not silently inert', () => {
    /*
     * `https:*` is the trap here, and it is worth a test of its own because every signal
     * points the wrong way.
     *
     * It is not valid grammar: `scheme-source` is `https:` with nothing after the colon, and
     * `host-source` needs `https://…`. `https:*` is neither, so the token is discarded and
     * the directive collapses to `'self' data:` — i.e. **every** cross-origin request refused
     * and SSO broken. Measured in Chrome. And Chrome does not warn: it echoes the directive
     * back in the violation message verbatim ("violates … connect-src 'self' data: https:*"),
     * which reads like the URL merely failed to match.
     *
     * `https://*` is valid but wrong for a different reason: a host-source with no port-part
     * pins the default port, so an IdP on `https://idp.example:8443` is refused. Also
     * measured — and already excluded by "reaches no external origin" above, which is why
     * only the inert spelling is asserted here.
     */
    for (const key of Object.keys(entries)) {
      const policy = entries[key].csp ?? '';
      expect(policy, `${key} has a host wildcard glued onto a scheme-source`).not.toMatch(
        /\bhttps?:\*/,
      );
    }
  });

  it('serves no path nothing requests', () => {
    // /monaco-editor-core/* had its own entry and CSP. Monaco is a bundled ESM import, so
    // nothing has requested that path since; MONACO_EDITOR_DIR had no reader either.
    expect(Object.keys(entries)).not.toContain('/monaco-editor-core/*');
    const source = readFileSync(resolve(ROOT, 'src/config.dev.ts'), 'utf8');
    expect(source).not.toMatch(/^export const MONACO_EDITOR_DIR/m);
  });

  it('reports violations, so a refusal in production is not silent', () => {
    /*
     * The failure mode this whole issue was about: a blocked style attribute sits in the
     * DOM, inspects correctly in devtools, and simply has no effect. Nothing surfaces to
     * the user, and nothing surfaces to us either — #685's defects went unnoticed for as
     * long as the policy had shipped.
     *
     * `report-uri` is the only option here. `report-to` needs a `Reporting-Endpoints`
     * response header, and these entries can set only `csp` and `Content-Type`.
     *
     * Only the two SPA entries. `/admin/*` serves subresources of the SPA document, so the
     * SPA's policy governs them and its own header applies only if an asset URL is
     * navigated to directly; `/adminui.json` is a JSON body that can violate nothing.
     */
    for (const key of SPA) {
      expect(sources(csp(key), 'report-uri')).toEqual(['/api/csp-violation-report']);
    }
  });

  it('is mirrored by the dev server, so dev can catch what production refuses', () => {
    // A dev policy looser than production reports nothing and proves nothing — which is
    // precisely what happened: dev sent style-src-attr 'unsafe-inline' while production
    // sent 'none', so the violation could not surface until it was measured in a browser.
    const vite = readFileSync(resolve(ROOT, 'vite.config.mts'), 'utf8');
    const header = vite.match(/'Content-Security-Policy-Report-Only':\s*`([^`]+)`/)?.[1];
    expect(header, 'no report-only header found in vite.config.mts').toBeDefined();

    // `'report-sample'` is dropped from both sides rather than one: production carries it
    // now too, and it is a reporting keyword either way — it decides what a report *says*,
    // never what the policy *permits*, so it cannot make the two mirrors disagree.
    const devPolicy = header!.replace(/\s+/g, ' ').trim();
    const prodPolicy = csp('/admin/ui');
    for (const name of directives(prodPolicy).keys()) {
      expect(sources(devPolicy, name), `dev ${name} does not match production`).toEqual(
        sources(prodPolicy, name),
      );
    }
  });
});
