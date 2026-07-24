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
    react(),
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
      },
    },
  },
});
