import { defineConfig } from 'vitest/config';

export default defineConfig({
  // A fixed synthetic origin lets MSW intercept the actual API adapter.
  define: { 'import.meta.env.VITE_API_BASE': JSON.stringify('http://localhost:3000') },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
  },
});
