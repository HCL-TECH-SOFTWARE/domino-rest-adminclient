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
    setupFiles: ['./src/setupTests.ts'],
    css: false, // ignore CSS/Linaria virtual modules (replaces __mocks__/styleMock.js)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
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
        'src/**/*.test.{ts,tsx}',
        'src/**/types.ts', // pure type/const modules
        'src/index.tsx',
        'src/test-utils/**',
        // lit-source is a 752-line interactive tree/source editor (context
        // menus, drag, dialogs, validation). It is covered at the API level
        // by lit-source.test.ts, but exhaustive unit coverage in jsdom is
        // impractical, so it is excluded from the coverage ratchet.
        'src/components/lit-elements/lit-source.ts',
      ],
      // Enforced ratchet gate. Global floors sit just below the current baseline
      // so CI fails if coverage regresses; the per-directory gates hold the
      // already-covered pure logic (reducers, utils) to a high bar. Raise these
      // numbers as more of the codebase gets tested (see reports/01).
      thresholds: {
        lines: 20,
        statements: 20,
        functions: 17,
        branches: 16,
        'src/store/**/reducer.ts': { lines: 95, statements: 95, functions: 90, branches: 88 },
        'src/utils/**': { lines: 85, statements: 85, functions: 55, branches: 60 },
        // Converted Lit elements (.js → .ts). Conservative floor that holds
        // across all batches; ratchet up once the large components (source) land.
        'src/components/lit-elements/**': { lines: 70, statements: 70, functions: 60, branches: 50 },
      },
    },
  },
});
