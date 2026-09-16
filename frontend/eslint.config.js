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
      // Existing adapter typing and unused imports are later-batch debt.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript checks names in TS/TSX.
    },
  },
);
