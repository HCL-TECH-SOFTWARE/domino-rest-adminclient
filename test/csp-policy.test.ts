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
      expect(directives(csp(key)).get('style-src-attr')).toEqual(["'none'"]);
    }
  });

  it('allows no inline script', () => {
    // `index.html` loads two modules by src and has no inline script. `'unsafe-inline'`
    // was re-added in 81c0335 for a pre-render theme <script> that has since moved into
    // src/index.ts; verified with zero violations against `npm run build` output.
    for (const key of SPA) {
      expect(directives(csp(key)).get('script-src')).toEqual(["'self'"]);
    }
  });

  it('keeps blob: workers, which Monaco needs', () => {
    // keep-monaco-editor.ts instantiates the editor/json/ts workers through Vite `?worker`
    // imports. Drop blob: and the Source tab and Diff view stop working.
    for (const key of SPA) {
      expect(directives(csp(key)).get('worker-src')).toContain('blob:');
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

  it('keeps the connect-src wildcard, which OIDC needs', () => {
    /*
     * This one looks like a defect and is not, so it is asserted rather than left to be
     * "tidied up" by the next reader.
     *
     * `src/components/login/pkce.js` fetches `idp.wellKnown` — the IdP's discovery document
     * — and then the `token_endpoint` that document names. For any external IdP (Entra ID,
     * Okta, Keycloak, Ping) both are a different origin, and the origin is deployment
     * specific, so it cannot be enumerated in a config file shipped inside the JAR.
     *
     * Narrowing this to `'self' data:` breaks SSO login for every such deployment. The
     * navigation to the authorize endpoint is unaffected either way — that is a top-level
     * navigation, which connect-src does not govern — so the breakage would appear only at
     * the token exchange, after the user had already authenticated.
     */
    for (const key of SPA) {
      expect(directives(csp(key)).get('connect-src')).toContain('*');
    }
  });

  it('serves no path nothing requests', () => {
    // /monaco-editor-core/* had its own entry and CSP. Monaco is a bundled ESM import, so
    // nothing has requested that path since; MONACO_EDITOR_DIR had no reader either.
    expect(Object.keys(entries)).not.toContain('/monaco-editor-core/*');
    const source = readFileSync(resolve(ROOT, 'src/config.dev.ts'), 'utf8');
    expect(source).not.toMatch(/^export const MONACO_EDITOR_DIR/m);
  });

  it('is mirrored by the dev server, so dev can catch what production refuses', () => {
    // A dev policy looser than production reports nothing and proves nothing — which is
    // precisely what happened: dev sent style-src-attr 'unsafe-inline' while production
    // sent 'none', so the violation could not surface until it was measured in a browser.
    const vite = readFileSync(resolve(ROOT, 'vite.config.mts'), 'utf8');
    const header = vite.match(/'Content-Security-Policy-Report-Only':\s*`([^`]+)`/)?.[1];
    expect(header, 'no report-only header found in vite.config.mts').toBeDefined();

    const dev = directives(header!.replace(/\s+/g, ' ').trim());
    const prod = directives(csp('/admin/ui'));
    for (const [name, values] of prod) {
      const devValues = (dev.get(name) ?? []).filter((v) => v !== "'report-sample'");
      expect(devValues, `dev ${name} does not match production`).toEqual(values);
    }
  });
});
