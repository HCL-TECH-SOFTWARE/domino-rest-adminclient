/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #762 — every source file carries the copyright banner, in one shape.
 *
 * Before this, 204 of 315 files had a notice and 111 had none; among those that did there
 * were four year spellings, two owner strings (`HCL America Inc.` and `HCL America Inc`)
 * and two comment shapes. A missing notice is not visible in review — nobody reads past the
 * first import — so it needs a guard rather than a convention.
 *
 * The years are deliberately **not** checked against git here. A file's end year is set when
 * its content changes, and a test that recomputed it would fail every PR that touched a file
 * without also bumping its header, which trains people to edit the notice thoughtlessly.
 * What is worth enforcing is the shape, the owner, and that a start year is never later than
 * its end year.
 */

const ROOT = resolve(process.cwd());

/** Files whose copyright belongs to someone else. See the note on VENDORED below. */
const VENDORED = [
  'src/components/login/base64url-arraybuffer.ts',
  'src/components/login/KeepWebAuthN.ts',
];

const ROOT_FILES = ['vite.config.mts', 'vitest.config.ts', 'index.html'];
const CODE_EXTS = /\.(ts|tsx|mts|css|js)$/;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const rel = (file: string) => file.slice(ROOT.length + 1);

const IN_SCOPE = [
  ...['src', 'test']
    .flatMap((d) => walk(resolve(ROOT, d)))
    .map(rel)
    .filter((f) => CODE_EXTS.test(f)),
  ...ROOT_FILES,
]
  .filter((f) => !VENDORED.includes(f))
  .sort();

const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

/**
 * The banner, as five lines. `index.html` uses HTML delimiters and a rule two characters
 * shorter, so that every file's block is the same 79 columns wide.
 */
const banner = (file: string) => {
  const html = file.endsWith('.html');
  const rule = '='.repeat(html ? 72 : 74);
  const open = html ? `<!-- ${rule} *` : `/* ${rule} *`;
  const close = html ? ` * ${rule} -->` : ` * ${rule} */`;
  return { open, close, html };
};

/** The banner's five lines, wherever it is allowed to start. */
const headerOf = (file: string) => {
  const lines = read(file).split('\n');
  // A doctype has to stay on line 1, so index.html's banner starts one line down.
  const offset = lines[0]?.startsWith('<!doctype') ? 1 : 0;
  return lines.slice(offset, offset + 5);
};

describe('copyright headers (#762)', () => {
  it('finds the files it is supposed to guard', () => {
    // A broken walk would make every assertion below vacuously pass.
    expect(IN_SCOPE.length).toBeGreaterThan(300);
    expect(IN_SCOPE).toContain('src/App.tsx');
    expect(IN_SCOPE).toContain('test/copyright-headers.test.ts');
    expect(IN_SCOPE).toContain('index.html');
  });

  it('opens every file with the banner', () => {
    // Collected rather than one `it` per file: 317 test names is reporter noise, and a
    // sweep that misses a directory is easier to see as one list than as 317 green ticks.
    const offenders = IN_SCOPE.flatMap((file) => {
      const [open, notice, rights, license, close] = headerOf(file);
      const { open: expectedOpen, close: expectedClose } = banner(file);
      const problem =
        open !== expectedOpen ? 'opening rule'
        : !/^ \* Copyright \(C\) \d{4}(, \d{4})? HCL America Inc\. +\*$/.test(notice ?? '') ? 'notice line'
        : rights !== ' * All rights reserved.'.padEnd(78) + '*' ? 'rights line'
        : license !== ' * Licensed under Apache 2 License.'.padEnd(78) + '*' ? 'licence line'
        : close !== expectedClose ? 'closing rule'
        : null;
      return problem ? [`${file} (${problem})`] : [];
    });
    expect(offenders, `banner missing or malformed in ${offenders.length} file(s)`).toEqual([]);
  });

  it('gives every file a sane year span', () => {
    const offenders = IN_SCOPE.flatMap((file) => {
      const years = (headerOf(file)[1]?.match(/\d{4}/g) ?? []).map(Number);
      const [start, end = start] = years;
      // One year means created and last touched in the same year; the pair form must
      // therefore never repeat it, and must not run backwards.
      const problem =
        years.length < 1 || years.length > 2 ? `expected one year or a pair, got ${years.length}`
        : start < 2000 ? `${start} is not a plausible start year`
        : end < start ? `${end} precedes ${start}`
        : years.length === 2 && end === start ? `${start} repeated instead of a single year`
        : null;
      return problem ? [`${file}: ${problem}`] : [];
    });
    expect(offenders).toEqual([]);
  });

  it('leaves third-party notices alone', () => {
    // These carry other people's copyrights, so replacing their header with the HCL banner
    // would be a licensing change dressed up as a formatting one. The sweep skips them and
    // this records why, otherwise the next pass "fixes" them.
    expect(read(VENDORED[0])).toMatch(/Copyright \(c\) 2017 Yuriy Ackermann/);
    expect(read(VENDORED[1])).toMatch(/Copyright \(c\) 2020 Paulo Lopes/);
    for (const file of VENDORED) {
      expect(read(file), `${file} was overwritten with the HCL banner`).not.toMatch(
        /^\/\* =+ \*\n \* Copyright \(C\) \d{4}.* HCL America/,
      );
    }
    // KeepWebAuthN already shows the shape to follow if HCL's contribution to one of these
    // ever needs recording: a scoped line under the original notice, naming what was
    // contributed — `(C) 2023 ES6 conversion HCL America Inc` — not a wholesale claim.
    expect(read(VENDORED[1])).toMatch(/\(C\) 2023 ES6 conversion HCL America Inc/);
  });

  it('spells the owner one way', () => {
    // `HCL America Inc` (no full stop) appeared in 12 files.
    const wrong = IN_SCOPE.filter((f) => /HCL America Inc(?!\.)/.test(read(f).slice(0, 400)));
    expect(wrong, `owner spelled without the full stop in: ${wrong.join(', ')}`).toEqual([]);
  });

  it('keeps every banner line at the same width', () => {
    // The block is a fixed 79 columns; only the closing line of the block-comment form is
    // 80, because `*/` is one character wider than the `*` above it.
    const offenders = IN_SCOPE.flatMap((file) =>
      headerOf(file)
        .map((line, i) => ({ file, i, len: line.length }))
        .filter(({ i, len }) => len !== (i === 4 && !file.endsWith('.html') ? 80 : 79)),
    );
    expect(offenders).toEqual([]);
  });
});
