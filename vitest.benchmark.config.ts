import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/domain/planner-optimizer/**/*.benchmark.ts'],
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
  },
})
