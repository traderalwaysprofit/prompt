import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: [
        'scripts/lib/observability-config.mjs',
        'scripts/renderVisual.ts',
        'src/core/**/*.ts',
        'src/games-registry.js',
        'src/observability/**/*.ts',
        'src/schemas/**/*.ts',
        'src/visual/**/*.ts',
        'worker/b2b-prospecting.js',
        'worker/url-sanitizer.js',
        'worker/validation.js',
      ],
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 75,
        lines: 75,
      },
    },
  },
});
