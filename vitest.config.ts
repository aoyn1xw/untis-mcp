import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@untis-mcp/sanitization': fileURLToPath(
        new URL('./packages/sanitization/src/index.ts', import.meta.url),
      ),
      '@untis-mcp/untis-client': fileURLToPath(
        new URL('./packages/untis-client/src/index.ts', import.meta.url),
      ),
    },
  },
  test: { include: ['{apps,packages}/**/*.test.ts'] },
});
