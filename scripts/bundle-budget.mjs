/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Ratcheting bundle-size gate (#813), the build-side counterpart to the coverage
 * thresholds in `vitest.config.ts`.
 *
 * What it measures is the **eager closure**: every chunk reachable from an entry through
 * *static* imports, plus their CSS. That is what a browser must download before it can
 * paint. Lazy chunks are deliberately excluded — the whole point of splitting work is that
 * `dist` gets bigger in total while the critical path gets smaller, so total `dist` size
 * is not merely a worse metric, it moves the wrong way when you succeed.
 *
 * The build log cannot answer this. It prints all 104 chunks by size and says nothing
 * about which are eager, so it supports both "the bundle is 15.4 MB" and "the bundle is
 * 1.6 MB". `dist/.vite/manifest.json` is the only place Vite records `imports` (static)
 * against `dynamicImports` (lazy), which is why `build.manifest` is now on.
 *
 * Usage:
 *   node scripts/bundle-budget.mjs            # check against bundle-budget.json
 *   node scripts/bundle-budget.mjs --update   # rewrite the budget to the measurement
 *
 * `--update` is how the ratchet tightens: land a split, run it, commit the smaller
 * numbers. It refuses to *raise* a budget, so a regression cannot be waved through by
 * rerunning it — that takes a deliberate edit of the JSON, which shows up in review.
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const MANIFEST = join(DIST, '.vite', 'manifest.json');
const BUDGET = join(ROOT, 'bundle-budget.json');

/**
 * Every file a browser must fetch before first paint.
 *
 * Follows `imports` and never `dynamicImports`, breadth-first from each entry, with a
 * `seen` set so a chunk shared by two importers is counted once rather than twice.
 *
 * Exported for `test/bundle-budget.test.ts` — the walk is the part with the bug potential,
 * and it can be tested against a synthetic manifest without running a build.
 *
 * @param {Record<string, {file: string, isEntry?: boolean, imports?: string[], dynamicImports?: string[], css?: string[]}>} manifest
 * @returns {string[]} dist-relative paths, sorted
 */
export function entryClosure(manifest) {
  const files = new Set();
  const seen = new Set();
  const queue = Object.keys(manifest).filter((key) => manifest[key].isEntry);

  while (queue.length > 0) {
    const key = queue.shift();
    if (seen.has(key)) continue;
    seen.add(key);

    const chunk = manifest[key];
    // A manifest can name an import that has no entry of its own; skip rather than throw,
    // so a Vite change cannot turn this gate into a build failure with a stack trace.
    if (!chunk) continue;

    if (chunk.file) files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const next of chunk.imports ?? []) queue.push(next);
  }

  return [...files].sort();
}

/** Raw and gzip totals for a list of dist-relative paths. */
function measure(files) {
  let raw = 0;
  let gzip = 0;
  const rows = [];

  for (const file of files) {
    const path = join(DIST, file);
    const bytes = readFileSync(path);
    const gz = gzipSync(bytes).length;
    raw += statSync(path).size;
    gzip += gz;
    rows.push({ file, raw: bytes.length, gzip: gz });
  }

  return { raw, gzip, rows };
}

const kb = (n) => `${(n / 1000).toFixed(1)} kB`;

/**
 * Slack between the measurement and the budget, mirroring the coverage floors' "a few
 * points below what is actually measured".
 *
 * A budget pinned exactly to the measurement fails on a patch bump of any dependency,
 * which trains people to raise it without reading it — wide enough to absorb a dependency
 * bump, far narrower than the class of regression this exists to catch. The `KeepElements`
 * barrel alone accounts for 613.6 kB.
 *
 * ## Why raw is 3 % and gzip is still 2 %
 *
 * **Raw was widened from 2 % to 3 % for the duration of #806** — a deliberate, temporary
 * loosening, to be tightened again when the per-file pass finishes.
 *
 * The reason is that raw is the metric #806 pushes on, and it does so for reasons that have
 * nothing to do with a regression. Converting a React view to a Lit element moves its markup
 * from JSX into a `static styles` + `html` template, and #718 inlined 44 icon glyphs as
 * base64 `data:` URIs — both add *raw* bytes that gzip absorbs almost completely. That is why
 * the icon codemod landed at **+19.5 kB raw but only +4.9 kB gzip**. A raw budget tight
 * enough to catch a real regression during a migration that legitimately adds raw bytes just
 * fails on the migration.
 *
 * gzip stays at 2 % precisely because it is the metric that does *not* move for those
 * reasons, so it remains the sensitive half of the gate. A change that grows gzip is still
 * caught at the old tolerance.
 *
 * ⚠️ **This is a migration accommodation, not a new normal. Put raw back to 0.02 when #806
 * closes** — and re-baseline with `--update` at that point, which will tighten both.
 */
const HEADROOM = { raw: 0.03, gzip: 0.02 };

const withHeadroom = (measured) => ({
  raw: Math.ceil(measured.raw * (1 + HEADROOM.raw)),
  gzip: Math.ceil(measured.gzip * (1 + HEADROOM.gzip)),
  measured,
  headroom: HEADROOM,
});

function main() {
  const update = process.argv.includes('--update');

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    console.error(
      `Cannot read ${MANIFEST}.\n` +
        `Run \`npm run build\` first. If the file is missing after a build, check that\n` +
        `\`build.manifest\` is still true in vite.config.mts — without it this gate is blind.`,
    );
    process.exit(1);
  }

  const files = entryClosure(manifest);
  if (files.length === 0) {
    console.error('The manifest declares no entry chunk. Refusing to report a budget of 0.');
    process.exit(1);
  }

  const { raw, gzip, rows } = measure(files);

  const lines = [
    '## Bundle budget — eager closure',
    '',
    '| File | raw | gzip |',
    '| --- | ---: | ---: |',
    ...rows.map((r) => `| \`${r.file}\` | ${kb(r.raw)} | ${kb(r.gzip)} |`),
    `| **total** (${rows.length} files) | **${kb(raw)}** | **${kb(gzip)}** |`,
    '',
  ];

  if (update) {
    const previous = JSON.parse(readFileSync(BUDGET, 'utf8'));
    const before = previous.measured ?? previous;
    if (raw > before.raw || gzip > before.gzip) {
      console.error(
        `Refusing to raise the budget.\n` +
          `  measured raw   ${kb(before.raw)} -> ${kb(raw)}\n` +
          `  measured gzip  ${kb(before.gzip)} -> ${kb(gzip)}\n\n` +
          `This flag exists to tighten the ratchet after a split lands. Raising it is a\n` +
          `deliberate decision, so make it by editing bundle-budget.json where a reviewer\n` +
          `will see the diff.`,
      );
      process.exit(1);
    }
    const next = withHeadroom({ raw, gzip });
    writeFileSync(BUDGET, `${JSON.stringify(next, null, 2)}\n`);
    console.log(
      `${lines.join('\n')}\nBudget updated: ${kb(next.raw)} raw / ${kb(next.gzip)} gzip ` +
        `(measured ${kb(raw)} / ${kb(gzip)} plus ${HEADROOM.raw * 100} % raw / ` +
        `${HEADROOM.gzip * 100} % gzip headroom).`,
    );
    return;
  }

  const budget = JSON.parse(readFileSync(BUDGET, 'utf8'));
  const over = raw > budget.raw || gzip > budget.gzip;

  lines.push(
    `Budget: ${kb(budget.raw)} raw / ${kb(budget.gzip)} gzip — ` +
      (over ? '❌ **over**' : `✅ under by ${kb(budget.raw - raw)} raw / ${kb(budget.gzip - gzip)} gzip`),
  );

  const report = lines.join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`, { flag: 'a' });
  }

  if (over) {
    console.error(
      `\nThe eager bundle grew past its budget.\n` +
        `  raw   ${kb(raw)} against ${kb(budget.raw)}\n` +
        `  gzip  ${kb(gzip)} against ${kb(budget.gzip)}\n\n` +
        `Something now reaches the entry through a *static* import that did not before —\n` +
        `often a barrel re-export pulling in far more than the one symbol you wanted.\n` +
        `Import the module directly, or load it with a dynamic import() if it is not\n` +
        `needed for first paint.`,
    );
    process.exit(1);
  }
}

// Only run when invoked directly, so the test can import `entryClosure` without this
// firing and calling process.exit on a machine that has never built.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
