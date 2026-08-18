/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Everything Monaco must register before `keep-monaco-editor` creates an editor — and
 * nothing else.
 *
 * Until 0.55 the package had one door: `import 'monaco-editor'`, which registers all 80
 * language grammars, all four rich language services, every editor contribution, and an LSP
 * client we never call. 0.56 broke it into addressable pieces (#1021). This file is the list
 * we chose (#1022); the component imports it for its side effects and then talks to
 * `monaco-editor/editor`, which is the API alone and registers nothing at all.
 *
 * ## A denylist, not an allowlist
 *
 * Every editor feature Monaco ships is registered below except those named in
 * `DENIED_FEATURES` in `monaco-imports.mts`, each with a reason. A missing contribution is
 * not an error: it is a menu entry that never appears and a keybinding that does nothing, on
 * a screen nobody happened to open. An allowlist would be 63 chances to lose one silently,
 * for a saving measured in tens of kilobytes against a change whose prize is measured in
 * megabytes — and the megabytes are all in the *languages*, not the features.
 *
 * ## Adding to this file is not optional when Monaco grows
 *
 * `assertMonacoImports()` reads this file at build time and fails if the package ships a
 * feature that is neither imported here nor explicitly denied. Without that, an upgrade
 * could add a feature and we would simply never register it — the one real weakness of a
 * denylist, closed by a gate rather than by vigilance.
 *
 * ## What is NOT registered, and why that is the point
 *
 * The CSS, HTML and TypeScript language services. Nothing in the app edits CSS or HTML, and
 * #1023 made the editor JSON-only, so nothing can create a TypeScript model either.
 * Registering them made the build emit, into every tarball and container image:
 *
 *     ts.worker      6,913,781 B
 *     css.worker     1,074,856 B
 *     html.worker      739,920 B
 *
 * for services `MonacoEnvironment.getWorker` never handed a worker to, fetched by nobody.
 *
 * Also not registered: the LSP client (`esm/external/monaco-lsp-client`), which
 * `esm/vs/index.js` pulls in and exports as `lsp`. Nothing calls it.
 *
 * ## The deep paths at the bottom are load-bearing
 *
 * `esm/vs/index.js` imports eight modules that **no `features/<x>/register` covers**, and
 * `features/register.all.js` does not cover them either. Computed rather than eyeballed —
 * `monaco-imports.mts` re-derives the set at build time and fails if it changes.
 *
 * The sharpest is `suggestController`: `features/suggest/register` contains only
 * `suggestInlineCompletions.js`, so without this import the suggest widget does not exist at
 * all. The editor is built with `wordBasedSuggestions: 'currentDocument'`,
 * `quickSuggestions` and `suggestOnTriggerCharacters`, so that widget opens as soon as anyone
 * types — and `test/smoke/editor.ts` asserts it does, because nothing else can.
 *
 * These resolve only through 0.56's catch-all `exports` map rather than a published entry
 * point, which makes them the fragile part of this file. `monaco-imports.mts` resolves every
 * one at build time for exactly that reason.
 */

/*
 * LANGUAGES. One, where the everything-entry registered eighty.
 *
 * JSON has no `languages/definitions/json` to import: its tokenizer lives in the rich
 * service, so the service is not optional for us and neither is json.worker. That is also
 * what provides `editor.action.formatDocument` — the formatter that replaced Prettier when
 * the editor became JSON-only (#1023) — and the markers behind the red squiggles.
 */
import 'monaco-editor/languages/features/json/register';

/*
 * FEATURES. Every one Monaco ships except what `DENIED_FEATURES` names.
 */
import 'monaco-editor/features/anchorSelect/register';
import 'monaco-editor/features/bracketMatching/register';
import 'monaco-editor/features/caretOperations/register';
import 'monaco-editor/features/clipboard/register';
import 'monaco-editor/features/codeAction/register';
import 'monaco-editor/features/codeEditor/register';
import 'monaco-editor/features/codelens/register';
import 'monaco-editor/features/codicon/register'; // the document-level @font-face; a shadow root ignores its own copy, so this draws every icon
import 'monaco-editor/features/colorPicker/register';
import 'monaco-editor/features/comment/register';
import 'monaco-editor/features/contextmenu/register';
import 'monaco-editor/features/cursorUndo/register';
import 'monaco-editor/features/diffEditor/register';
import 'monaco-editor/features/diffEditorBreadcrumbs/register';
import 'monaco-editor/features/dnd/register';
import 'monaco-editor/features/documentSymbols/register';
import 'monaco-editor/features/dropOrPasteInto/register';
import 'monaco-editor/features/find/register';
import 'monaco-editor/features/floatingMenu/register';
import 'monaco-editor/features/folding/register'; // folding: true is set in the editor options
import 'monaco-editor/features/fontZoom/register';
import 'monaco-editor/features/format/register'; // editor.action.formatDocument, which replaced Prettier in #1023
import 'monaco-editor/features/gotoError/register';
import 'monaco-editor/features/gotoLine/register';
import 'monaco-editor/features/gotoSymbol/register';
import 'monaco-editor/features/gpu/register';
import 'monaco-editor/features/hover/register';
import 'monaco-editor/features/iPadShowKeyboard/register';
import 'monaco-editor/features/inPlaceReplace/register';
import 'monaco-editor/features/indentation/register';
import 'monaco-editor/features/inlayHints/register';
import 'monaco-editor/features/inlineProgress/register';
import 'monaco-editor/features/insertFinalNewLine/register';
import 'monaco-editor/features/inspectTokens/register';
import 'monaco-editor/features/lineSelection/register';
import 'monaco-editor/features/linesOperations/register';
import 'monaco-editor/features/linkedEditing/register';
import 'monaco-editor/features/links/register';
import 'monaco-editor/features/longLinesHelper/register';
import 'monaco-editor/features/middleScroll/register';
import 'monaco-editor/features/multicursor/register';
import 'monaco-editor/features/parameterHints/register';
import 'monaco-editor/features/placeholderText/register';
import 'monaco-editor/features/quickCommand/register';
import 'monaco-editor/features/quickHelp/register';
import 'monaco-editor/features/quickOutline/register';
import 'monaco-editor/features/readOnlyMessage/register';
import 'monaco-editor/features/referenceSearch/register';
import 'monaco-editor/features/rename/register';
import 'monaco-editor/features/sectionHeaders/register';
import 'monaco-editor/features/semanticTokens/register';
import 'monaco-editor/features/smartSelect/register';
import 'monaco-editor/features/snippet/register';
import 'monaco-editor/features/stickyScroll/register';
import 'monaco-editor/features/suggest/register'; // only suggestInlineCompletions — the widget itself is a deep path below
import 'monaco-editor/features/toggleHighContrast/register';
import 'monaco-editor/features/toggleTabFocusMode/register';
import 'monaco-editor/features/tokenization/register';
import 'monaco-editor/features/unicodeHighlighter/register';
import 'monaco-editor/features/unusualLineTerminators/register';
import 'monaco-editor/features/wordHighlighter/register';
import 'monaco-editor/features/wordOperations/register';
import 'monaco-editor/features/wordPartOperations/register';
/*
 * DEEP PATHS. The eight modules `esm/vs/index.js` imports that no register covers.
 */
import 'monaco-editor/editor/browser/coreCommands'; // cursor commands and their keybindings
import 'monaco-editor/editor/common/standaloneStrings'; // localized strings for all of the above
import 'monaco-editor/editor/contrib/suggest/browser/suggestController'; // the suggest widget itself — see the warning above
import 'monaco-editor/editor/contrib/caretOperations/browser/caretOperations';
import 'monaco-editor/editor/contrib/dropOrPasteInto/browser/copyPasteContribution';
import 'monaco-editor/editor/contrib/gotoSymbol/browser/goToCommands';
import 'monaco-editor/editor/contrib/gotoError/browser/markerSelectionStatus';
import 'monaco-editor/editor/contrib/semanticTokens/browser/documentSemanticTokens';

/*
 * Deliberately not imported: `base/browser/ui/codicons/codicon/codicon-modifiers.css`, the
 * ninth thing `index.js` pulls in that no register covers. It is 948 bytes of animation for
 * `.codicon-modifier-spin` and `.codicon-modifier-disabled`, and it is unreachable by name
 * anyway — the same catch-all that hides `editor.main.css` appends `.js` to it (see
 * `monaco-css.mts`). Aliasing a second stylesheet to animate a spinner this app never shows
 * is not worth the machinery. The static codicons, which the app does show, come from
 * `features/codicon/register` above and are asserted by `test/smoke/editor.ts`.
 */
