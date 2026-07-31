/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #770 — the People and Groups screens, and `@mui/x-data-grid` with them.
 *
 * These were not deprecated. They were routed under react-router v5 and then **dropped
 * rather than converted** by the v6 upgrade in `9324783` (2024-04-25), which wrapped
 * `/groups`, `/people`, `/mail` and `/settings` in a JSX comment. For fifteen months the
 * sidenav and the homepage still offered them on any deployment whose `adminui.json` set
 * `users` or `groups` true, and every one of those links landed on a blank page.
 *
 * That is the failure mode this file guards. Deleting the components alone would not have
 * fixed it — the entry points are in three other files, and each one is independently
 * capable of resurrecting a dead link:
 *
 *   - `sidenav/Routes.ts`      the route metadata
 *   - `keep-elements/keep-side-nav.ts`  the `navitems.users` / `navitems.groups` link blocks
 *   - `keep-elements/keep-homepage.ts`  the People Management tile
 *
 * A source scan because there is nothing left to render. Deleted code has no behaviour to
 * assert on, and the thing worth preventing is a *reintroduction* — which review does not
 * catch, since each of these looks locally reasonable.
 */

const ROOT = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');
const has = (file: string) => existsSync(resolve(ROOT, file));

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const SELF = 'test/people-groups-removed.test.ts';

const SOURCES = ['src', 'test']
  .flatMap((d) => walk(resolve(ROOT, d)))
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ file: f.slice(ROOT.length + 1), text: readFileSync(f, 'utf8') }))
  // This file names the things it forbids, inside assertions rather than comments, so it
  // would report itself.
  .filter(({ file }) => file !== SELF);

/** Whole-line comments dropped, so the notes recording this removal are not offenders. */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

const offenders = (pattern: RegExp) =>
  SOURCES.filter(({ text }) => pattern.test(code(text))).map(({ file }) => file);

describe('People and Groups stay removed (#770)', () => {
  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('has no components/groups, components/people or components/peopleSelector', () => {
    expect(has('src/components/groups')).toBe(false);
    expect(has('src/components/people')).toBe(false);
    expect(has('src/components/peopleSelector')).toBe(false);
  });

  it('has no people, groups or peopleSelector store slice', () => {
    for (const slice of ['people', 'groups', 'peopleSelector']) {
      expect(has(`src/store/${slice}`), `store/${slice} is back`).toBe(false);
    }
    // …and the root reducer no longer mounts them under their old keys.
    const store = code(read('src/store/index.ts'));
    for (const key of ['groups:', 'peoples:', 'members:']) {
      expect(store, `rootReducer still mounts ${key}`).not.toContain(key);
    }
  });

  it('depends on no data grid', () => {
    const pkg = JSON.parse(read('package.json'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps)).not.toContain('@mui/x-data-grid');
    // It was the last of them; the whole point of #770 was to avoid replacing it.
    const found = offenders(/x-data-grid|DataGrid/);
    expect(found, `a data grid is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('offers no navigation entry that leads nowhere', () => {
    // The actual 2024 regression: the links outlived their routes. Each of these three
    // files could bring one back on its own.
    expect(code(read('src/components/sidenav/Routes.ts'))).not.toMatch(/'\/people'|'\/groups'/);
    // `sidenav/SideNav.tsx` became `keep-elements/keep-side-nav.ts` in #806, and
    // `home/sections/Section.tsx` folded into `keep-elements/keep-homepage.ts` in wave 8.
    // The link blocks moved with them, so the guard follows the code and not the path.
    const navFiles = [
      'src/components/keep-elements/keep-side-nav.ts',
      'src/components/keep-elements/keep-homepage.ts',
    ];
    for (const file of navFiles) {
      expect(code(read(file)), `${file} still gates on a removed flag`).not.toMatch(
        /navitems\.(users|groups)/,
      );
    }
  });

  it('carries no navitems flag that nothing reads', () => {
    // `users` and `groups` survived in the account state after their consumers went. Left
    // there, the next person to add a nav item wires it to a flag that controls nothing —
    // which is how the blank links lasted fifteen months.
    const types = code(read('src/store/account/types.ts'));
    expect(types).not.toMatch(/\busers:\s*boolean/);
    expect(types).not.toMatch(/\bgroups:\s*boolean/);
    // The server still sends both keys; showPages() must simply not copy them.
    expect(code(read('src/store/account/action.ts'))).not.toMatch(/pageList\.(users|groups)/);
  });

  it('keeps no stylesheet rules for the removed screens', () => {
    // The components went in #774; their rules in styles.css did not, and CSS has no
    // compiler to notice. Dead selectors read as live ones to the next person styling a
    // screen — `.group-members-div` looks like something worth matching.
    const css = read('src/styles/styles.css');
    for (const selector of [
      'group-add-member-button',
      'group-form-button-style',
      'group-form-button-small',
      'group-remove-member-button',
      'groups-click-row-div',
      'people-crud-div',
      'group-members-div',
      'people-selector-div',
    ]) {
      expect(css, `styles.css still carries .${selector}`).not.toContain(selector);
    }
  });

  it('leaves /mail commented out, and says why', () => {
    // /mail was disabled by the same commit but is blocked on LABS-1214 (#698), not on
    // #770 — so it stays, and the note has to keep saying so.
    const views = read('src/components/keep-elements/keep-views.ts');
    expect(views).toMatch(/LABS-1214/);
    expect(views).toMatch(/\/mail/);
    // Both spellings: the JSX `path="/people"` the routes had under react-router, and the
    // `path: '/people'` a route object in `keep-views` would use. Checking only the first would
    // have gone quietly vacuous the moment the route table stopped being JSX.
    expect(code(views), '/people or /groups routing is back').not.toMatch(
      /path\s*[:=]\s*['"]?\/(people|groups)\b/,
    );
  });
});
