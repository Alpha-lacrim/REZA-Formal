import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-ssr/**', 'build/**', 'coverage/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'tests/*.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.cjs'], languageOptions: { globals: { module: 'readonly', require: 'readonly' } } },
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: { globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', URL: 'readonly', process: 'readonly', __dirname: 'readonly' } },
    rules: {
      // Remaining legacy commerce adapter typing and unused imports migrate incrementally.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript checks names in TS/TSX.
    },
  },
  {
    files: ['services/auth.ts', 'services/catalog.ts', 'services/normalization.ts', 'services/http/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
);
