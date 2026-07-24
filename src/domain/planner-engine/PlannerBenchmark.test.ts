import { describe, expect, it } from 'vitest'
import { PlannerEngine } from './PlannerEngine'
import type { BusyBlock, PlannerTaskV3 } from './PlannerTypes'

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const engine = new PlannerEngine()
const base = {
  date: '2026-07-23',
  now: '2026-07-23T07:00:00',
  workingHours: { start: '07:00', end: '23:59' },
  preferences: { bufferMinutes: 0 },
}

function measure(run: () => void) {
  run()
  return median(Array.from({ length: 5 }, () => {
    const start = performance.now()
    run()
    return performance.now() - start
  }))
}

describe('PlannerEngine V3 performance budgets', () => {
  it('procesa 1000 tareas en menos de 100 ms', () => {
    const tasks: PlannerTaskV3[] = Array.from({ length: 1000 }, (_, index) => ({
      id: `task-${index}`, title: `Task ${index}`, estimatedMinutes: 5,
      priority: index % 10 === 0 ? 'alta' : 'media', importance: (index % 100) / 100,
    }))
    const elapsed = measure(() => { engine.createPlan({ ...base, tasks }) })
    console.info(`[benchmark:v3] 1000 tareas: ${elapsed.toFixed(2)} ms (mediana de 5)`)
    expect(elapsed).toBeLessThan(100)
  })

  it('procesa 500 eventos en menos de 50 ms', () => {
    const events: BusyBlock[] = Array.from({ length: 500 }, (_, index) => ({
      id: `event-${index}`, title: `Event ${index}`, start: '2026-07-23T23:59:00',
      end: '2026-07-24T00:00:00', source: index % 2 ? 'google' : 'outlook',
    }))
    const tasks: PlannerTaskV3[] = Array.from({ length: 20 }, (_, index) => ({ id: `task-${index}`, title: `Task ${index}`, estimatedMinutes: 15 }))
    const elapsed = measure(() => { engine.createPlan({ ...base, tasks, externalEvents: events }) })
    console.info(`[benchmark:v3] 500 eventos: ${elapsed.toFixed(2)} ms (mediana de 5)`)
    expect(elapsed).toBeLessThan(50)
  })
})
