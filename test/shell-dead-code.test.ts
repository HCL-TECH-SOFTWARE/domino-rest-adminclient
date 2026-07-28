import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #707 PR 1 — the app shell's dead code, guarded so it stays gone.
 *
 * Four things were removed, none of which could be observed at runtime:
 *
 * 1. **`Header.tsx`'s desktop branch.** Its only call site was
 *    `HomeElement.tsx`'s `{matches && <Header/>}`, where `matches` is
 *    `useMediaQuery('(max-width:768px)')` — and `Header` re-tested the *identical* query,
 *    returning `<MobileHeader/>` when true. So whenever it was mounted the query was true
 *    and the desktop branch never rendered. There has been no desktop header. The whole
 *    file went; the shell renders `MobileHeader` directly.
 * 2. **`SnackbarToaster`.** Dead twice over: its only mount site was that branch, and its
 *    `open` came from `state.alert.snackbarStatus`, which the reducer initialised to `false`
 *    and **no case ever wrote**. `components/alerts/Notification.tsx` is the live path.
 * 3. **The `open` prop chain.** `App.tsx` held `const [open] = useState(false)` — no setter,
 *    permanently false — and threaded it through `mainElementProps` to `Views`, which
 *    declared `ViewsProps.open` and never destructured it. (The shell has its own real
 *    collapse state; that one stays.)
 * 4. **`ipadMatches`**, a second `useMediaQuery('(max-width:768px)')` in `HomeElement`
 *    identical to `matches`.
 *
 * A source scan because that is the only instrument that works here: deleted code leaves
 * nothing to render, and report 03 §2.2 maps the header slot to exactly this content — so
 * without a guard, PR 3 could reintroduce a desktop header and a toaster nobody has seen as
 * a side effect of the shell swap. They should come back only by deliberate design.
 *
 * PR 3 landed and the guards held: `AppShell.tsx` fills the header slot on mobile only, with
 * `MobileHeader` and nothing else. See `app-shell.test.ts` for the shell's own invariants.
 */

const SRC = resolve(process.cwd(), 'src');

const walk = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, match);
    return match.test(entry.name) ? [path] : [];
  });

const rel = (file: string) => file.slice(resolve(process.cwd()).length + 1);

/** Whole-line comments dropped, so the notes recording these removals aren't offenders. */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

const SOURCES = walk(SRC, /\.tsx?$/).map((file) => ({ file: rel(file), text: readFileSync(file, 'utf8') }));

const offenders = (pattern: RegExp) => SOURCES.filter(({ text }) => pattern.test(code(text))).map(({ file }) => file);

describe('shell dead code stays removed (#707)', () => {
  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('has no components/header/Header.tsx', () => {
    expect(existsSync(resolve(SRC, 'components/header/Header.tsx'))).toBe(false);
    // MobileHeader is the one that actually rendered, and stays.
    expect(existsSync(resolve(SRC, 'components/header/MobileHeader.tsx'))).toBe(true);
  });

  it('references SnackbarToaster nowhere', () => {
    const found = offenders(/SnackbarToaster/);
    expect(found, `SnackbarToaster is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('carries no snackbarStatus or snackbarMessagE', () => {
    const found = offenders(/snackbarStatus|snackbarMessagE/);
    expect(found, `dead alert state is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('threads no mainElementProps', () => {
    const found = offenders(/mainElementProps/);
    expect(found, `the dead prop chain is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('has no ipadMatches', () => {
    const found = offenders(/ipadMatches/);
    expect(found, `the duplicate media query is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('leaves the shell with no MUI media query at all', () => {
    // Two identical `useMediaQuery('(max-width:768px)')` calls in `HomeElement` were the
    // symptom that hid the duplication; PR 1 collapsed them to one. PR 3 removed the last:
    // `AppShell` derives its breakpoint from the same expression `wa-page` compiles into its
    // shadow root, so React and the component cannot disagree at 768px — which MUI's
    // `(max-width:768px)` did, calling it mobile where `wa-page` says desktop.
    const shell = SOURCES.find(({ file }) => file === 'src/AppShell.tsx');
    expect(shell, 'the shell moved again — repoint this guard').toBeDefined();
    expect(code(shell!.text)).not.toMatch(/useMediaQuery/);
    expect(existsSync(resolve(SRC, 'components/home/HomeElement.tsx'))).toBe(false);
  });

  it('leaves Views without a props interface', () => {
    const views = SOURCES.find(({ file }) => file === 'src/Views.tsx')!;
    expect(code(views.text)).not.toMatch(/interface ViewsProps/);
  });
});
