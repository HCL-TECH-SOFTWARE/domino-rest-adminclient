/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #806 / #719 P4 — every `@lit/react` wrapper has a live React consumer.
 *
 * A wrapper under `keep-elements/react/` exists for exactly one reason: to let *React* JSX
 * render a `keep-*` custom element. It holds no behaviour — one `createComponent` call over
 * the element class, which stays. So when the per-file pass converts the last `.tsx` that
 * rendered `<KeepFoo>`, the wrapper has no reason to exist, and the element it wraps loses
 * nothing by its removal: registration comes from the Lit parent that imports the element
 * module, never from the wrapper.
 *
 * Nothing catches that today. The wrapper still compiles, still type-checks, still exports
 * cleanly from the barrel, and tree-shaking drops it from the bundle — so the only trace is
 * a file that imports React for a component nobody renders. **16 of the 46 wrappers had
 * accumulated that way** by the time anyone counted (2026-07-30), including all eight
 * schemas/scopes views orphaned by #865/#870/#876 and `KeepDefaultCard`, whose element is
 * heavily used but only ever from another element's template.
 *
 * That matters beyond tidiness. #719's exit gate is `grep -rn "from 'react'" src` coming up
 * empty, and each dead wrapper is one file standing between the programme and that gate,
 * with no consumer left to motivate anyone to remove it.
 *
 * ## What counts as a consumer
 *
 * `src` only, and neither the wrapper directory nor the barrel:
 *
 * - **The barrel re-exports every name**, so counting it would make every wrapper live and
 *   the check vacuous. A real consumer importing *through* the barrel still names the
 *   wrapper in its own import statement, which is what this finds.
 * - **Wrapper-to-wrapper references do not confer liveness.** If A is dead and B is used
 *   only by A, both should be reported; excluding the whole directory does that.
 * - **`test` does not count.** A wrapper whose only user is its own test is still dead
 *   code — the test is exercising something no screen renders. Delete both.
 * - **Comment lines are stripped**, so prose naming a wrapper (`Exposed via KeepElements.tsx
 *   as KeepDefaultCard`, which is how that one hid) is not mistaken for a use.
 *
 * The match is `\bName\b`, so `KeepSource` is not kept alive by `KeepSourceTree`.
 */

const ROOT = resolve(process.cwd());
const SRC = resolve(ROOT, 'src');
const REACT_DIR = resolve(SRC, 'components/keep-elements/react');
const BARREL = resolve(SRC, 'components/keep-elements/KeepElements.tsx');

const walk = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, match);
    return match.test(entry.name) ? [path] : [];
  });

const rel = (file: string) => file.slice(ROOT.length + 1);

/** Whole-line comments dropped, so prose naming a wrapper is not read as a use. */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

const WRAPPERS = walk(REACT_DIR, /\.ts$/).map((file) => ({
  name: file.slice(REACT_DIR.length + 1, -'.ts'.length),
  file: rel(file),
}));

const CONSUMERS = walk(SRC, /\.tsx?$/)
  .filter((file) => !file.startsWith(REACT_DIR + '/') && file !== BARREL)
  .map((file) => ({ file: rel(file), text: code(readFileSync(file, 'utf8')) }));

const usedIn = (name: string) => {
  const pattern = new RegExp(`\\b${name}\\b`);
  return CONSUMERS.filter(({ text }) => pattern.test(text)).map(({ file }) => file);
};

describe('@lit/react wrappers have live consumers (#806, #719 P4)', () => {
  it('finds wrappers and consumers to scan', () => {
    // Both guard against a silent pass if either directory moves: an empty wrapper list
    // has no orphans, and an empty consumer list makes every wrapper one.
    expect(WRAPPERS.length, 'no wrappers found — did keep-elements/react move?').toBeGreaterThan(0);
    expect(CONSUMERS.length, 'no source files found — did src move?').toBeGreaterThan(100);
  });

  it('exports every wrapper from the barrel, or not at all', () => {
    /*
     * The barrel is gone as of #806 wave 7, and its absence is the success condition rather
     * than a gap in this check.
     *
     * It existed as the import path ~50 route-local modules shared. #813 split the wrappers
     * into one file each precisely so that a module naming one did not drag the rest into its
     * chunk, and every consumer has since moved to a deep import — the last was `HomePage.tsx`,
     * a *route root*, which through the barrel was pulling four other route roots and their
     * whole screens into the `/` chunk.
     *
     * So this is skipped rather than deleted, and skipped rather than rewritten to assert the
     * file is absent. If someone reintroduces a barrel, the check that its exports all resolve
     * is worth having again immediately, and it is easier to un-skip a check than to notice a
     * missing one. The orphan check below is the one that carries the weight either way, and
     * it does not depend on a barrel existing.
     */
    if (!existsSync(BARREL)) return;

    const barrel = readFileSync(BARREL, 'utf8');
    const exported = [...barrel.matchAll(/from '\.\/react\/(\w+)'/g)].map((match) => match[1]);
    const names = new Set(WRAPPERS.map(({ name }) => name));
    const missing = exported.filter((name) => !names.has(name));

    expect(missing, `KeepElements.tsx exports wrappers that do not exist: ${missing.join(', ')}`).toEqual(
      [],
    );
  });

  it('leaves no wrapper whose only reference is the barrel', () => {
    const orphans = WRAPPERS.filter(({ name }) => usedIn(name).length === 0);

    expect(
      orphans.map(({ file }) => file),
      `These @lit/react wrappers have no consumer in src:\n` +
        orphans.map(({ name, file }) => `  ${name}  (${file})`).join('\n') +
        `\n\nA wrapper only exists so React JSX can render the element. If the last .tsx ` +
        `consumer just converted, delete the wrapper and its KeepElements.tsx line in the ` +
        `same commit — the element itself stays, and its Lit parent still registers it. ` +
        `Read the wrapper's \`events:\` map first: it records the custom-event -> prop-name ` +
        `mapping (onCardOpen: 'card-open') your Lit call site needs as @card-open=\${...}.`,
    ).toEqual([]);
  });
});
