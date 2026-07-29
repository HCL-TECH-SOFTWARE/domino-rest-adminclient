# #718 — consolidate the icon systems onto `wa-icon`

Branch `feat/718-wa-icon-codemod`, based on `origin/new_code` @ `d4db66b`.

## Why this is being run as a sweep

The issue's own text and every earlier revision of `docs/reports/06-waves.md` say **not** to
run this as a standalone codemod, because `track:icons` overlaps `track:views` and a sweep
would fight the per-file component pass for the same files.

That objection was raised and the user chose the sweep anyway. It has since largely expired:
`d4db66b` restructured the programme to **single-lane** — "lanes A, B and C are empty of open
work", so there is no concurrent instance to collide with, and #718 is listed as one of the
issues that "close *inside* #806". The remaining cost is that a file converted here will be
converted again when #806 reaches it; the icon line of #806's per-file recipe simply becomes
a no-op.

## Baseline on `d4db66b` (measured, not assumed)

```
npm run lint          exit 0
npm run build         exit 0
npm run test          exit 0    121 files / 1523 tests, coverage 65.09 %
npm run bundle:budget exit 0    868.6 kB raw / 238.9 kB gzip
                                budget 892.5 / 245.9 — under by 23.9 kB raw / 7.0 kB gzip
```

The eager closure contains `createSvgIcon-*.js` at **84.8 kB raw / 28.4 kB gzip** — MUI's icon
factory. This codemod should *shrink* the bundle rather than threaten the 2 % headroom.

## Scope

| System | Files | Action |
|---|--:|---|
| `@mui/icons-material` | 33 | convert to `wa-icon` |
| `react-icons` | 18 | convert to `wa-icon` |
| overlap | 8 | — |
| **distinct** | **43** | |

Out of scope, deliberately: `src/styles/app-icons.ts` (issue **#731** — 15 of its 19 render
sites are `<img>`, not `wa-icon`, so its conversion is not separable from the component pass)
and the `.Mui*` half of `dark-mode.css` (issue **#709**).

## Constraints that gate this work

- `npm run lint` / `build` / `test` / `bundle:budget` all pass — CI runs all four.
- Coverage is enforced per directory: `components/keep-elements/**` and `services` at 90 %.
- **No `style=` attributes** — production CSP sends `style-src-attr 'none'`;
  `test/csp-inline-styles.test.ts` holds the count at zero.
- `test/services/icon-library.test.ts` fails on any glyph name not registered in `ICONS`.
  It scans for literal `<wa-icon>` tags and `icon="…"` props — **a new React wrapper is
  invisible to it**, so the guard must be extended in the same task that introduces the
  wrapper, not later.
- Whole-line comments are stripped before those scans, but *trailing* comments are not, and
  the per-file gates elsewhere are greps — so naming a removed package in prose keeps it
  looking present.

## Tasks

- [ ] **1. The primitive.** A React `KeepIcon` that renders `wa-icon` with `library="fa"`
      baked in, so the CDN fallback is structurally unreachable from a call site. Extend
      `icon-library.test.ts` to scan `<KeepIcon name="…">` in the same commit.
- [ ] **2. Register the glyphs.** Extend `ICONS` in `src/services/icon-library.ts` from 17 to
      cover every name the mapping needs. Every name verified present in
      `@fortawesome/fontawesome-free` before it is written down.
- [ ] **3–N. Convert, in batches**, grouped by directory so each batch is independently
      reviewable and testable. Batch boundaries set from the inventories.
- [ ] **N+1. Drop the dependencies.** Remove `@mui/icons-material` and `react-icons` from
      `package.json` once both greps return 0. Add a guard so they cannot come back.
- [ ] **N+2. Verify.** All four gates, plus a browser pass — the suite runs with `css: false`
      and cannot see an icon that renders at the wrong size, in the wrong colour, or not at all.

## What the inventories changed

**`react-icons`: 38 sites, 21 identifiers** (not the 16 a grep suggested — `MdRefresh`,
`MdEdit`, `FaSort`, `BsThreeDots` and `FaRegFolderOpen` sit on import lines the first grep
did not decompose). Zero `styled(Icon)` wrappers and zero icons passed as values: every one
is inline JSX, so the conversion is mechanical and the hard cases are **props and CSS**, not
indirection.

- **`RxDividerVertical` is not an icon and gets no glyph.** Rendered, it is a 1×11 rounded
  rect in a 15×15 box — a ~1.5 px rule. `AppItem.tsx:360` already draws that exact separator
  as `<div className='short-vertical'/>` (`styles.css:618`, token-aware). Reusing it removes
  5 sites and the whole `rx` pack without registering anything.
- **Size cannot become an inline style.** 13 sites pass `size` in `em` and one passes
  `size={20}`. `style=` is forbidden — production CSP sends `style-src-attr 'none'` and
  `test/csp-inline-styles.test.ts` pins the count at zero — so every size lands as a class,
  Linaria at the call site, never an attribute.
- `color` is not an attribute on `wa-icon` (4 sites, one passing a `var()`) — it inherits
  `currentColor`, so those become a colour rule on the class.
- Three sites carry a duplicated `transform: translateY(29%)` alignment hack tuned to the old
  glyphs' bounding boxes. Re-measure against `wa-icon`; do not copy.
- `ColumnDetails.tsx:70` puts `onClick` on a bare icon with no button. That is a pre-existing
  a11y defect owned by **#713** — preserve the behaviour here, do not silently fix or worsen it.
- `ICONS` is a flat name→URL map, so one weight per name. No name currently needs both solid
  and regular, but that is a property of today's mapping, not a guarantee.

## Open questions resolved before starting

`Album`, `Apps` and `Storage` have no obvious one-to-one Font Awesome equivalent. Each is
resolved against its call-site context from the inventory, not guessed.

## Review

_Pending._
