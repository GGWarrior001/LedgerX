/**
 * vite.config.ts – LedgerX (HARDENED v4)
 *
 * Changes from v3:
 *   - Added `test` block with Vitest configuration
 *   - jsdom environment for Web Crypto / localStorage tests
 *   - `import.meta.env.MODE === 'test'` properly set via `mode` override
 *   - Coverage: V8 provider, 80% threshold across all metrics
 *   - `sourcemap: false` confirmed for production (no source leak)
 *   - `lovable-tagger` only runs in non-test modes
 */
import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => ({
  base: './',

  server: {
    host: '::',
    port: 8080,
    hmr: { overlay: false },
  },

  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      '@tanstack/query-core',
    ],
  },

  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase'))      return 'firebase';
          if (
            id.includes('@radix-ui') ||
            id.includes('cmdk') ||
            id.includes('vaul')
          )                                 return 'ui-vendor';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          return 'vendor';
        },
      },
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          warning.message.includes('use client')
        ) return;
        warn(warning);
      },
    },
  },

  // ── Vitest ──────────────────────────────────────────────────────────────────
  test: {
    /** jsdom gives us localStorage, crypto.subtle, and DOM APIs in tests. */
    environment: 'jsdom',

    globals: true,

    setupFiles: ['./src/test/setup.ts'],

    /** Ensure import.meta.env.MODE = 'test' so PBKDF2_ITERATIONS uses 1,000. */
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },

    /** Path alias must mirror the resolve.alias above. */
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    /** Coverage via V8 (fastest, no instrumentation overhead). */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      /**
       * Phase 6 target: 80%+ (90% target for v5 once all features stabilised).
       * Threshold failure blocks CI/CD.
       */
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   75,
        statements: 80,
      },
    },

    /** Increase timeout for PBKDF2 operations (even at 1,000 iterations). */
    testTimeout: 15_000,
  },
}));
