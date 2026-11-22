import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Some tests build every built-in template (~1 s locally); GitHub's 2-core runners are several
    // times slower, so the 5 s default made CI fail on timing alone.
    testTimeout: 30_000,
  },
});
