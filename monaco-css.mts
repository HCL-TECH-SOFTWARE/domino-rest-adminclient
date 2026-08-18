/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/*
 * One alias, needed by both `vite.config.mts` and `vitest.config.ts`, which share nothing
 * else. It exists because Monaco 0.56 made its own stylesheet unreachable by name.
 *
 * ## Why the app imports that stylesheet at all
 *
 * `keep-monaco-editor` renders Monaco into a shadow root. The CSS Monaco's own ESM modules
 * pull in lands in the *document*, and the shadow boundary stops it there — so the component
 * imports the bundled `editor.main.css` with `?inline` and adopts it as a constructed
 * stylesheet inside its own root (#1002). Without it the editor is unstyled text: no gutter,
 * no syntax colours, no cursor. Nothing in the suite can see that failure, because every
 * test mocks `monaco-editor` wholesale.
 *
 * ## What 0.56 changed
 *
 * 0.55 shipped a pass-through `exports` map:
 *
 *     "./*": "./*"
 *
 * 0.56 replaced it with a catch-all that reorganises the package into tree-shakeable entry
 * points:
 *
 *     "./*.js": "./esm/vs/*.js",   "./*": "./esm/vs/*.js"
 *
 * Every subpath is now answered with a `.js` file under `esm/vs/`. Nothing moved on disk;
 * the package simply stopped answering to the names we were using. For the three `?worker`
 * imports that is a rename — see the note at the import site in `keep-monaco-editor.ts`.
 * For the stylesheet there is no spelling that works: the catch-all appends `.js`, so
 * `min/vs/editor/editor.main.css` resolves to `esm/vs/min/vs/editor/editor.main.css.js`
 * and no `.css` in the package can be reached by name at all. The file is still shipped —
 * only the door is shut — so the specifier is aliased straight to it.
 */

import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** The specifier `keep-monaco-editor.ts` imports — the real file name, kept readable at the import site. */
export const MONACO_CSS_SPECIFIER = 'monaco-editor/min/vs/editor/editor.main.css';

/**
 * Absolute path to that stylesheet, resolved out of the installed package.
 *
 * Deliberately *not* the `require.resolve('<pkg>/package.json')` idiom, which is the usual way
 * to find a package root: the same catch-all swallows `monaco-editor/package.json` too and it
 * fails with MODULE_NOT_FOUND. Resolving the entry point and walking up out of `min/vs/` is
 * what is left.
 */
export const MONACO_CSS_FILE = path.join(
  path.resolve(path.dirname(require.resolve('monaco-editor')), '../..'),
  'min/vs/editor/editor.main.css'
);

/*
 * Fail at config load, not at runtime. If a future Monaco moves the file for real, the
 * alias would point at nothing and Vite would fall back to resolving the bare specifier —
 * which, thanks to the catch-all, "succeeds" at a `.js` path that is not a stylesheet. The
 * app would build, every gate would stay green, and the only symptom would be an unstyled
 * editor that nobody notices until a user opens a Source tab.
 */
if (!fs.existsSync(MONACO_CSS_FILE)) {
  throw new Error(
    `monaco-editor's bundled stylesheet is not at ${MONACO_CSS_FILE}. The package layout ` +
      'changed: find editor.main.css inside monaco-editor and update MONACO_CSS_FILE in ' +
      'monaco-css.mts, or keep-monaco-editor will render unstyled.'
  );
}

/**
 * Ready to spread into a Vite/Vitest `resolve.alias`.
 *
 * A regex rather than the plain `{ specifier: file }` object form, because Vite matches an
 * alias against the *whole* import specifier — query and all. The import site needs `?inline`
 * (it wants the stylesheet as a string to adopt, not a side-effecting stylesheet import), and
 * `…editor.main.css?inline` neither equals `…editor.main.css` nor starts with
 * `…editor.main.css/`, so the object form silently does not match and the build fails as if
 * there were no alias at all. The capture group carries any query through to the replacement;
 * with no query it expands empty.
 */
export const monacoCssAlias = [
  {
    find: new RegExp(`^${MONACO_CSS_SPECIFIER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?.*)?$`),
    replacement: `${MONACO_CSS_FILE}$1`
  }
];
