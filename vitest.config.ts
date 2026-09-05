import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // tsconfig keeps jsx: 'preserve' for Next; tests that import a component
  // need the JSX transform applied here (Vite 8 transforms with oxc).
  oxc: {
    jsx: { runtime: 'automatic' },
    tsconfigRaw: { compilerOptions: { jsx: 'react-jsx' } },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/snowball.ts', 'src/app/api/plan/calculate/route.ts'],
    },
  },
});
