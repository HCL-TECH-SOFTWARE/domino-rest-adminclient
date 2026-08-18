/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Browser-side half of the Monaco smoke gate (`scripts/smoke.mjs`).
 *
 * Every check here stands for one thing about the editor that **no test in `npm test` can
 * state**, because `keep-monaco-editor.test.ts` replaces `monaco-editor` with a fake and
 * every other suite mocks the component. Two failure modes are being guarded:
 *
 * 1. **The stylesheet is refused.** #1002: the shipped policy sends `style-src-elem 'self'`,
 *    which refuses an inline `<style>`, so 308 kB of Monaco CSS was inert in production and
 *    the editor rendered with no gutter and no syntax colours. A refused `<style>` keeps its
 *    text and only loses its `.sheet`, so the DOM looks fine — which is why
 *    `editor-styled` measures a *resolved* style rather than the presence of the sheet.
 *
 * 2. **A contribution was never registered.** #1022 replaces the everything-import with an
 *    explicit list, and a contribution nobody imported does not throw, warn, or appear
 *    anywhere. The suggest widget simply never opens; the folding chevron is simply not
 *    there. This file must go **green before that change** and stay green after it, or it
 *    proves nothing about it.
 *
 * What each check is the gate on:
 *
 *   editor-mounts          the dynamic import resolved and Monaco built something.
 *   editor-styled          the shadow root got the stylesheet *and it applies* — a gutter
 *                          with a real width, which only the sheet can produce.
 *   json-tokenised         the JSON grammar. After #1022 it is the only one registered, and
 *                          this is the difference between coloured JSON and grey text.
 *   json-worker-reports    a round trip through json.worker: markers appear only if the
 *                          worker starts, loads and answers. Vacuous in any browser without
 *                          `Worker` — hence `workerConstructor` in the published result.
 *   format-document-works  Monaco's own `editor.action.formatDocument`, which is what
 *                          replaced Prettier when the editor became JSON-only (#1023), and
 *                          what `formatOnPaste`/`formatOnType` invoke.
 *   suggest-widget-opens   `suggestController`. In couch-companion-ui this is one of eight
 *                          deep paths that **no `features/<x>/register` covers** —
 *                          `features/suggest/register` contains only suggestInlineCompletions.
 *                          We register no completion provider, so the widget is driven here
 *                          the way the app drives it: `wordBasedSuggestions: 'currentDocument'`
 *                          offering a word already in the buffer.
 *   folding-available      a contribution with no visible widget until used — exactly the
 *                          shape a denylist loses silently. `folding: true` is set in the
 *                          editor options, so the action must exist.
 *   codicons-render        a shadow root **ignores** an `@font-face`; what draws our icons is
 *                          the document-level face. Measured by comparing a glyph's advance
 *                          width against a font that does not exist, because the mechanism is
 *                          exactly the thing that might have stopped being true.
 *   diff-editor-renders    `keep-forms-container` drives `diffMode`. The weakest check here
 *                          and knowingly so: the diff widget comes with the API, so it stays
 *                          green even with every registration removed. It guards the
 *                          component's own diff path, not the registry.
 *
 * Results are published on `window.__smokeResult` for the driver to read over CDP.
 */

import './editor.css';
// Side-effect import: this is what registers `<keep-monaco-editor>`. A type-only import
// would erase and the element would never upgrade, leaving every check below vacuously red.
import '../../src/components/keep-elements/keep-monaco-editor';
import type MonacoEditor from '../../src/components/keep-elements/keep-monaco-editor';
import type * as Monaco from 'monaco-editor';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];
const add = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls until `read` returns something truthy or the budget runs out.
 *
 * The budget is deliberately modest: everything here answers well under a second when it
 * works, and the budgets only ever add up on the failing path — where enough of them in
 * series can outrun `waitForResult`'s window in the driver, so a genuinely broken editor
 * would report "the page did not finish" instead of naming the checks that failed.
 */
async function until<T>(read: () => T | undefined, budgetMs = 5000): Promise<T | undefined> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() > deadline) return undefined;
    await sleep(100);
  }
}

/**
 * The live Monaco instance behind a mounted component.
 *
 * Reaching past the element's public surface on purpose: what is under test is what Monaco
 * was given the ability to *do*, and an action registry is not observable from outside.
 */
function editorOf(el: MonacoEditor): Monaco.editor.IStandaloneCodeEditor {
  return (el as unknown as { editor: Monaco.editor.IStandaloneCodeEditor }).editor;
}

async function mount(props: Partial<MonacoEditor> = {}): Promise<MonacoEditor> {
  const el = document.createElement('keep-monaco-editor') as MonacoEditor;
  // A class, not `el.style`: see the note in editor.css — `style-src-attr 'none'`.
  el.className = 'smoke-editor';
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  await until(() => el.shadowRoot?.querySelector('.monaco-editor'));
  return el;
}

const tokenClasses = (root: ParentNode): Set<string> => {
  const classes = new Set<string>();
  for (const span of root.querySelectorAll('.view-line span span')) {
    for (const cls of span.classList) if (cls.startsWith('mtk')) classes.add(cls);
  }
  return classes;
};

const NL = String.fromCharCode(10);

async function run(): Promise<void> {
  const el = await mount({ value: ['{', '  "_id": "smoke",', '  "n": 12', '}'].join(NL) });
  const root = el.shadowRoot!;

  /*
   * Only now, after the component has mounted. `keep-monaco-editor` installs the
   * trusted-types and document.head hooks *before* its own `import('monaco-editor')`, and
   * both are documented as too late if anything evaluates Monaco first. A static import at
   * the top of this file would do exactly that, and the gate would be measuring a
   * configuration the app never runs (#1002).
   */
  const monaco = await import('monaco-editor');

  add(
    'editor-mounts',
    root.querySelector('.monaco-editor') !== null,
    `.monaco-editor in the shadow root: ${root.querySelector('.monaco-editor') !== null}`
  );

  /* ---- styling: the sheet must be there AND resolve ------------------------------------- */

  /*
   * Not a byte count, and not the gutter width — both were tried and neither is faithful.
   *
   * Deleting the `_adoptMonacoStyles()` call, which is precisely the #1002 failure, still
   * leaves 148,538 chars in the shadow root and a 41 px gutter, because
   * `monaco-style-elements.ts` separately adopts the ~136 kB theme sheet Monaco injects into
   * the editor container. A check on either number passes over the exact bug it exists to
   * catch.
   *
   * These three properties are only ever set by `editor.main.css`. Measured both ways:
   *
   *                          with the sheet     without it
   *   .monaco-editor         position: relative  position: static
   *   .overflow-guard        overflow:  hidden   overflow:  visible
   *   .view-line             position: absolute  position: static
   *
   * The first is verbatim what #1002 reported — "`position: static` where Monaco needs
   * `relative`" — so this asserts the layout contract the stylesheet exists to provide,
   * rather than the presence of some bytes that might provide it.
   */
  const sheetChars = [...root.adoptedStyleSheets].reduce(
    (total, sheet) => total + [...sheet.cssRules].reduce((n, rule) => n + rule.cssText.length, 0),
    0
  );
  const resolved = (selector: string, property: string) => {
    const node = root.querySelector(selector);
    return node ? getComputedStyle(node).getPropertyValue(property) : 'MISSING';
  };
  const layout = {
    'editor.position': resolved('.monaco-editor', 'position'),
    'overflow-guard.overflow': resolved('.overflow-guard', 'overflow'),
    'view-line.position': resolved('.view-line', 'position')
  };
  add(
    'editor-styled',
    layout['editor.position'] === 'relative' &&
      layout['overflow-guard.overflow'] === 'hidden' &&
      layout['view-line.position'] === 'absolute',
    `${Object.entries(layout).map(([k, v]) => `${k}=${v}`).join(', ')} (${sheetChars} chars adopted)`
  );

  /* ---- the one language we register ------------------------------------------------------ */

  await until(() => tokenClasses(root).size > 1);
  const tokens = tokenClasses(root);
  add(
    'json-tokenised',
    tokens.size > 1,
    `${tokens.size} distinct token classes: ${[...tokens].sort().join(', ') || 'none'}`
  );

  /* ---- json.worker: markers are proof of a round trip ------------------------------------ */

  const model = editorOf(el).getModel()!;
  model.setValue('{ "unclosed": ');
  const markers = await until(() => {
    const found = monaco.editor.getModelMarkers({ resource: model.uri });
    return found.length > 0 ? found : undefined;
  });
  add(
    'json-worker-reports',
    markers !== undefined,
    markers
      ? `json.worker returned ${markers.length} marker(s): ${markers[0]!.message}`
      : 'no markers within the poll budget — json.worker may not be starting'
  );

  /* ---- Monaco's own formatter, which replaced Prettier in #1023 --------------------------- */

  model.setValue(['{', '"a":1,', '     "b":[true,null]', '}'].join(NL));
  const beforeFormat = model.getValue();
  editorOf(el).getAction('editor.action.formatDocument')?.run();
  const afterFormat = await until(() => {
    const now = model.getValue();
    return now !== beforeFormat ? now : undefined;
  });
  add(
    'format-document-works',
    afterFormat !== undefined,
    afterFormat
      ? `formatDocument reindented ${beforeFormat.length} chars to ${afterFormat.length}`
      : 'formatDocument changed nothing — the JSON language service may not be registered'
  );

  /* ---- the suggest widget, driven the way the app drives it ------------------------------- */

  /*
   * No completion provider: #1023 established there is no caller for one. The widget is still
   * live because the editor is built with `wordBasedSuggestions: 'currentDocument'`,
   * `quickSuggestions` and `suggestOnTriggerCharacters` — so a word already in the buffer is
   * what must come back. `smokeFieldOne` is in the document; `smokeF` is a prefix only it
   * matches, which matters because the suggest list is virtualized: on a shorter prefix the
   * real rows can be off-screen and the check would fail for the wrong reason.
   */
  const editor = editorOf(el);
  model.setValue(['{', '  "smokeFieldOne": 1,', '  "x": "smokeF"', '}'].join(NL));
  editor.focus();
  editor.setPosition({ lineNumber: 3, column: 17 });
  editor.trigger('smoke', 'editor.action.triggerSuggest', {});
  const suggested = await until(() => {
    const widget = root.querySelector('.suggest-widget');
    if (!widget || !widget.classList.contains('visible')) return undefined;
    const rows = [...widget.querySelectorAll('.monaco-list-row')];
    const mine = rows.filter((row) => row.textContent?.includes('smokeFieldOne'));
    return mine.length > 0 ? { rows: rows.length, mine: mine.length } : undefined;
  });
  // Enough state in the failure line to tell the ways this breaks apart without a second run:
  // the widget never opened (suggestController missing) versus it opened but word-based
  // suggestions contributed nothing (the option, or the word-based provider).
  const widgetNow = root.querySelector('.suggest-widget');
  const seen = [...(widgetNow?.querySelectorAll('.monaco-list-row') ?? [])]
    .map((row) => row.textContent?.trim().slice(0, 20))
    .slice(0, 6);
  add(
    'suggest-widget-opens',
    suggested !== undefined,
    suggested
      ? `${suggested.rows} suggestion row(s), ${suggested.mine} from wordBasedSuggestions`
      : `no word-based completion appeared (widget visible: ${widgetNow?.classList.contains('visible')}, ` +
        `rows: ${JSON.stringify(seen)}) — suggestController may be missing (#1022)`
  );

  /* ---- a contribution with no widget until it is used ------------------------------------ */

  add(
    'folding-available',
    editor.getAction('editor.foldAll') !== null,
    `editor.foldAll action registered: ${editor.getAction('editor.foldAll') !== null}`
  );

  /* ---- codicons: only the document-level @font-face can draw them ------------------------- */

  await document.fonts.ready;
  await document.fonts.load('16px codicon').catch(() => []);
  const faces = [...document.fonts].filter((face) => face.family.replace(/["']/g, '') === 'codicon');

  // U+EAB6 is a real codicon glyph; a font that does not exist gives the fallback advance
  // width. Equal widths mean the face never applied — what a missing codicon register looks
  // like. The probe is styled from editor.css for the same reason the host is.
  const probe = document.createElement('div');
  probe.className = 'smoke-font-probe';
  probe.innerHTML =
    '<span class="smoke-glyph"></span><span class="smoke-fallback"></span>';
  document.body.append(probe);
  await sleep(100);
  const glyphWidth = probe.querySelector('.smoke-glyph')!.getBoundingClientRect().width;
  const fallbackWidth = probe.querySelector('.smoke-fallback')!.getBoundingClientRect().width;
  add(
    'codicons-render',
    faces.length > 0 && glyphWidth > 0 && glyphWidth !== fallbackWidth,
    `${faces.length} codicon face(s) in the document; glyph ${glyphWidth.toFixed(2)}px vs ` +
      `fallback ${fallbackWidth.toFixed(2)}px`
  );

  /* ---- the diff editor keep-forms-container drives ---------------------------------------- */

  /*
   * Deleted lines, not a one-line modification. That is what makes Monaco render an
   * `inline-deleted-margin-view-zone`, and it is the only path in the whole ESM tree that
   * calls `setAttribute('style', …)` — the channel #1024 was about. With a `{"a":1}` vs
   * `{"a":2}` diff the zone renders only sometimes, which is exactly why that violation
   * appeared on a laptop and not on CI.
   */
  const diff = await mount({
    diffMode: true,
    value: ['{', '  "a": 1,', '  "b": 5', '}'].join(NL),
    originalValue: ['{', '  "a": 1,', '  "x1": 2,', '  "x2": 3,', '  "b": 5', '}'].join(NL)
  });
  const panes = await until(() => {
    const found = diff.shadowRoot!.querySelectorAll('.monaco-diff-editor .editor');
    return found.length >= 2 ? found : undefined;
  });
  add(
    'diff-editor-renders',
    panes !== undefined,
    panes ? `${panes.length} panes inside .monaco-diff-editor` : 'fewer than two panes'
  );

  /* ---- #1024: the two channels that were refused under the shipped CSP ------------------ */

  /*
   * Both of these assert the *rendered result*, not the absence of a violation report. The
   * driver already fails on any report; what it cannot tell you is whether the fix restored
   * the thing the user sees. These are the two measurements from the investigation.
   */
  const sign = await until(() =>
    diff.shadowRoot!.querySelector('.inline-deleted-margin-view-zone .delete-sign')
  );
  const signPosition = sign ? getComputedStyle(sign).position : 'no such element';
  add(
    'deletion-indicators-positioned',
    signPosition === 'absolute',
    sign
      ? `.delete-sign resolves to position: ${signPosition} (refused: static, applied: absolute)`
      : 'no inline-deleted margin view zone rendered — this check proves nothing (#1024)'
  );

  // The suggest widget is still open on the first editor from the check above.
  const focusedRow = root.querySelector('.suggest-widget .monaco-list-row.focused');
  const rowBackground = focusedRow ? getComputedStyle(focusedRow).backgroundColor : 'no focused row';
  add(
    'suggest-selection-visible',
    focusedRow !== null && rowBackground !== 'rgba(0, 0, 0, 0)',
    focusedRow
      ? `focused suggestion background ${rowBackground} (refused sheet leaves it transparent)`
      : 'no focused suggestion row — this check proves nothing (#1024)'
  );
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    add('threw', false, String(error));
  }
  const out = document.getElementById('out');
  if (out) {
    out.textContent = checks.map((c) => `${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: ${c.detail}`).join('\n');
  }
  (window as unknown as { __smokeResult: unknown }).__smokeResult = {
    checks,
    // Read here rather than assumed by the driver: every worker assertion above would be
    // "green" in a browser that has no Worker at all, which is exactly how jsdom lets the
    // unit suite stay green over a broken one.
    workerConstructor: typeof Worker === 'function'
  };
}

void main();
