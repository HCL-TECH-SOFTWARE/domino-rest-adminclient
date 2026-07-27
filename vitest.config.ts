/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import wyw from '@wyw-in-js/vite';

// Standalone Vitest config. It reuses the same plugin graph as the Vite build
// (Linaria via @wyw-in-js + SWC/React) so components transform identically to
// `npm run build`/`dev`, but deliberately omits the dev-server CSP header and
// /api proxy from vite.config.mts, which are irrelevant in a test context.
export default defineConfig({
  plugins: [
    // Keep wyw so Linaria `styled` components resolve to real components.
    wyw({ include: ['**/*.{ts,tsx}'] }),
    // tsDecorators enables SWC transpilation of TypeScript experimental
    // decorators (tsconfig `experimentalDecorators`), which the Lit elements
    // use (@customElement/@property/@state/@query). useDefineForClassFields
    // must be false so decorated class fields compile to constructor
    // assignments instead of `defineProperty`, which would otherwise shadow
    // Lit's reactive accessors (see lit.dev/msg/class-field-shadowing).
    react({
      tsDecorators: true,
      useAtYourOwnRisk_mutateSwcOptions(options) {
        options.jsc ??= {};
        options.jsc.transform ??= {};
        options.jsc.transform.useDefineForClassFields = false;
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost/admin/ui' }, // == old jest testEnvironmentOptions.url
    },
    setupFiles: ['./test/setupTests.ts'],
    css: false, // ignore CSS/Linaria virtual modules (replaces __mocks__/styleMock.js)
    // Every run used to end with "close timed out after 10000ms / something prevents Vite
    // server from exiting", adding ~10s to each local and CI run (#692).
    //
    // It is not a leak in our tests. `--reporter=hanging-process` blames ~2,956 FILEHANDLE
    // entries with no stack, alongside `napi_rs_threadsafe_function` — a native addon, not
    // a timer or observer of ours. Bisected to the coverage provider, not to any test:
    //
    //   vitest run test/utils/form.test.ts               0.97s, clean
    //   vitest run test/utils/form.test.ts --coverage    13.28s, "close timed out"
    //   vitest run <a Monaco/Lit suite>                  1.04s, clean
    //
    // So the handles belong to @vitest/coverage-v8 (4.1.10, matching vitest), and there is
    // nothing in this repo to dispose. Tests have already finished and the exit code is
    // already 0 by the time this timer starts — it only bounds how long Vitest waits for a
    // server that will not close. Capping it at 1s takes a full-suite run from ~13s of
    // teardown to ~1s. Revisit when coverage-v8 stops holding them.
    teardownTimeout: 1000,
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true, // reset mock history between tests (replaces jest.clearAllMocks)
    reporters: process.env.CI
      ? ['default', ['vitest-sonar-reporter', { outputFile: 'coverage/sonar-report.xml' }]]
      : ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types.ts', // pure type/const modules
        'src/index.tsx',
        // keep-source is a 752-line interactive tree/source editor (context
        // menus, drag, dialogs, validation). It is covered at the API level
        // by keep-source.test.ts, but exhaustive unit coverage in jsdom is
        // impractical, so it is excluded from the coverage ratchet.
        'src/components/keep-elements/keep-source.ts',
      ],
      // Enforced ratchet gate. Every floor sits a few points below what is actually
      // measured, so a routine refactor does not fail CI but a real regression does.
      // Raise these as coverage grows — a gate far below reality protects nothing.
      //
      // Measured on `new_code` when these numbers were last set:
      //   global          lines 32.4  stmts 32.8  funcs 28.9  branches 29.6
      //   keep-elements   lines 84.2  stmts 83.7  funcs 78.0  branches 68.6
      //   services        lines 96.8  stmts 96.9  funcs 96.7  branches 95.2
      //   store reducers  lines 100   stmts 100   funcs 100   branches 96.3
      //   utils           lines 99.1  stmts 99.1  funcs 96.2  branches 90.6
      thresholds: {
        lines: 30,
        statements: 30,
        functions: 27,
        branches: 28,
        'src/store/**/reducer.ts': { lines: 95, statements: 95, functions: 90, branches: 88 },
        'src/utils/**': { lines: 85, statements: 85, functions: 55, branches: 60 },
        // The 26 converted Lit elements. Raised from 70/70/60/50 once the element
        // suites and the Monaco tests landed.
        'src/components/keep-elements/**': { lines: 80, statements: 80, functions: 72, branches: 62 },
        // Pure, well-covered helpers (log, theme, icon library, WA token readers).
        // Nothing here should ever ship untested.
        'src/services/**': { lines: 90, statements: 90, functions: 90, branches: 88 },
      },
    },
  },
});
