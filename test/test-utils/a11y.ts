/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { expect } from 'vitest';
import axe from 'axe-core';

/**
 * axe-core against a mounted element, for #713.
 *
 * The issue's own decision was "(c) defer to the WA migration, then add an axe smoke test".
 * The migration is done — zero `.tsx` files — so this is that test's engine.
 *
 * ## What it can and cannot see, measured
 *
 * axe **does** cross shadow boundaries. That is not an assumption: `a11y-smoke.test.ts`
 * opens with a probe element that hides an unnamed `<button>` and an `alt`-less `<img>`
 * inside a shadow root and asserts both are found. Without that case every assertion here
 * could pass by never looking anywhere.
 *
 * It cannot see anything that needs paint. `vitest.config.ts` runs with `css: false` and
 * jsdom has no canvas backend — `getContext()` throws "Not implemented" — so `color-contrast`
 * comes back **incomplete**, never violation, whatever the colours are. That is the caveat
 * the issue records, and it holds: contrast and visible focus need a browser. #944 is the
 * worked example of how those get checked instead.
 *
 * ## Why rules are disabled, and which
 *
 * Two groups, for two different reasons.
 *
 * **Page-scoped rules** ask questions about a document — is there a main landmark, one `h1`,
 * a language, a skip link. A component mounted in a bare `<div>` fails all of them, and
 * would fail them no matter how the component is written, so they measure the harness rather
 * than the subject. They belong to a page-level audit, which is a browser pass.
 *
 * **`color-contrast`** is disabled rather than left to report `incomplete`, because an
 * incomplete result that can never resolve is noise that trains people to skim the output.
 */
const PAGE_SCOPED = [
  'region',
  'landmark-one-main',
  'landmark-unique',
  'page-has-heading-one',
  'html-has-lang',
  'html-lang-valid',
  'bypass',
  'document-title',
];

/** Needs paint; see the docblock. */
const NEEDS_A_BROWSER = ['color-contrast'];

const RULES = Object.fromEntries(
  [...PAGE_SCOPED, ...NEEDS_A_BROWSER].map((id) => [id, { enabled: false }]),
);

export interface A11yFinding {
  id: string;
  impact: string;
  help: string;
  nodes: string[];
}

/** Every violation axe can see in `root`, flattened to something readable in a diff. */
export async function a11yViolations(root: Element): Promise<A11yFinding[]> {
  const results = await axe.run(root, { resultTypes: ['violations'], rules: RULES });
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? 'unknown',
    help: violation.help,
    nodes: violation.nodes.map((node) => node.html.replace(/\s+/g, ' ').slice(0, 120)),
  }));
}

/**
 * Assert `root` has no violation axe can see.
 *
 * The message carries the offending markup rather than a count, because "1 violation" sends
 * the reader back to the DOM to find out which node and why.
 */
export async function expectNoA11yViolations(root: Element, label: string): Promise<void> {
  const findings = await a11yViolations(root);
  expect(
    findings,
    `${label} has accessibility violations:\n` +
      findings
        .map((f) => `  ${f.id} [${f.impact}] — ${f.help}\n${f.nodes.map((n) => `      ${n}`).join('\n')}`)
        .join('\n'),
  ).toEqual([]);
}
