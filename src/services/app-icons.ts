/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { APP_ICON_NAMES, DEFAULT_APP_ICON_NAME } from '../styles/app-icon-names';

export { APP_ICON_NAMES, DEFAULT_APP_ICON_NAME };

export type AppIconMap = Readonly<Record<string, string>>;

/**
 * Access to the 86 application icons, which live in a lazily loaded chunk.
 *
 * `styles/app-icons.ts` is 221 KB of base64 (~62 KB gzip, ~10 % of the entry chunk) and
 * nothing tree-shakes it, because every use site reads it by a runtime `iconName` that
 * comes back from the backend. #731 chose option (c): leave the data URIs and the
 * `iconName` contract alone and just get the module off the critical path. This module is
 * the seam that makes that possible — it is the only thing that imports `app-icons`, and
 * it does so with `import()`.
 *
 * The names are *not* lazy: they come from `app-icon-names.ts`, which is ~1 KB, so
 * `checkIcon()` and the picker ordering stay synchronous. Only the payloads wait.
 */

/**
 * Stable empty snapshot. It was here because `useSyncExternalStore` must not see a new object
 * on each read; that hook is gone (see below), but the guarantee is still worth keeping —
 * `getAppIcons()` is read straight into Lit templates, and returning a fresh `{}` per call
 * would defeat every `Object.is` comparison downstream.
 */
const EMPTY: AppIconMap = Object.freeze({});

let icons: AppIconMap | null = null;
let inFlight: Promise<AppIconMap> | null = null;

/**
 * Fetch the payload chunk. Idempotent and safe to call from anywhere — concurrent callers
 * share one `import()`, and once it resolves every later call is synchronous.
 *
 * A rejected import is not cached: the chunk request is retried on the next call rather
 * than leaving the app permanently iconless after one flaky network moment.
 */
export function loadAppIcons(): Promise<AppIconMap> {
  if (icons) return Promise.resolve(icons);
  inFlight ??= import('../styles/app-icons')
    .then((module) => {
      icons = module.default as AppIconMap;
      return icons;
    })
    .catch((error) => {
      inFlight = null;
      throw error;
    });
  return inFlight;
}

/**
 * The payloads as they stand right now: the real map once loaded, `{}` before that.
 * Callers that render must cope with a miss — see `appIconUri()` and `AppIcon`.
 */
export function getAppIcons(): AppIconMap {
  return icons ?? EMPTY;
}

/** Whether the payload chunk has landed. Drives the loading state at the render sites. */
export function appIconsLoaded(): boolean {
  return icons !== null;
}

/** Whether `name` is one of the 86 icons. Answers correctly before the chunk loads. */
export function isAppIconName(name: string | undefined | null): boolean {
  return !!name && APP_ICON_NAMES.includes(name);
}

/**
 * The bare base64 for an icon, or `''` when the name is unknown or its payload has not
 * arrived. This is the form that goes on the wire — the schema and scope POST bodies carry
 * `icon` next to `iconName`, so the payload has to stay reachable outside of rendering.
 *
 * `icons` defaults to the module snapshot; components pass the one `useAppIcons()` gave
 * them so the value and the render that produced it agree.
 */
export function appIconPayload(name: string | undefined | null, icons: AppIconMap = getAppIcons()): string {
  return (name ? icons[name] : undefined) ?? '';
}

/**
 * The `data:` URI for an icon, or `''` when the name is unknown or its payload has not
 * arrived. Empty rather than a half-built string: `src="data:image/svg+xml;base64,
 * undefined"` is what a broken-image flash looks like, and callers can test truthiness to
 * pick a skeleton instead.
 */
export function appIconUri(name: string | undefined | null, icons: AppIconMap = getAppIcons()): string {
  const payload = appIconPayload(name, icons);
  return payload ? `data:image/svg+xml;base64,${payload}` : '';
}

/*
 * `useAppIcons()` stood here — a `useSyncExternalStore` over a module-level subscriber set,
 * with a `subscribe` that also kicked off the load. It is gone, and with it the last React
 * import anywhere under `src/services/`. (Spelled that way on purpose: #719's exit gate greps
 * for the import statement as raw text, and quoting it here would keep it looking present.)
 *
 * Its two remaining callers, `ScopeFormContainer` and `DetailsSection`, both became Lit
 * elements in #806 wave 5. A Lit element has its own reactivity and does not want a hook: the
 * pattern every converted element uses instead is `loadAppIcons()` in `connectedCallback`
 * resolving into a `@state` field, which is a plain promise and needs no push channel. The
 * subscriber set had no other reader, so the notify loop in `loadAppIcons` and the `clear()`
 * in the test seam went with it.
 *
 * Nothing replaces it. If a future consumer needs to be *pushed* to rather than awaiting the
 * promise, the set is three lines and is in the history.
 */

/** Test seam: forget the loaded payloads so the next call re-imports. */
export function resetAppIconsForTest(): void {
  icons = null;
  inFlight = null;
}
