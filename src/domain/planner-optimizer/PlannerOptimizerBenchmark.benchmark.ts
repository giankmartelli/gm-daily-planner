import { describe, expect, it } from 'vitest'
import { PlannerEngine, type BusyBlock, type DailyPlan, type PlannedTask, type PlannerTaskV3 } from '../planner-engine'
import { PlannerBenchmark } from './PlannerBenchmark'
import { PlannerOptimizer } from './PlannerOptimizer'
import { preferences } from './PlannerOptimizer.fixtures'
import { SimulationEngine } from './SimulationEngine'

const addMinutes = (iso: string, minutes: number) => new Date(Date.parse(`${iso}Z`) + minutes * 60_000).toISOString().slice(0, 19)
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const measure = (run: () => void) => {
  run()
  return median(Array.from({ length: 5 }, () => {
    const start = performance.now()
    run()
    return performance.now() - start
  }))
}

function planWithTasks(count: number): DailyPlan {
  let cursor = '2026-07-23T00:00:00'
  const orderedTasks: PlannedTask[] = Array.from({ length: count }, (_, index) => {
    const suggestedStart = cursor
    const suggestedEnd = addMinutes(cursor, 5)
    cursor = suggestedEnd
    return {
      taskId: `task-${index}`, title: `Task ${index}`, priority: 50 + index % 50,
      suggestedStart, suggestedEnd, reason: 'Greedy', confidence: 0.8, estimatedMinutes: 5,
      energyRequired: index % 3 ? 'media' : 'alta', alerts: [], dependencies: [], score: 50, factors: [],
    }
  })
  return { date: '2026-07-23', orderedTasks, unscheduledTaskIds: [], conflicts: [], suggestions: [], totalPlannedMinutes: count * 5, generatedAt: '2026-07-23T00:00:00' }
}

describe('Planner Optimizer V4 performance and quality budgets', () => {
  it('optimiza 1000 tareas en menos de 150 ms', () => {
    const plan = planWithTasks(1000)
    const optimizer = new PlannerOptimizer()
    const elapsed = measure(() => { optimizer.optimize({ plan }) })
    console.info(`[benchmark:v4] 1000 tareas: ${elapsed.toFixed(2)} ms (mediana de 5)`)
    expect(elapsed).toBeLessThan(150)
  })

  it('procesa el pipeline con 500 eventos en menos de 80 ms', () => {
    const tasks: PlannerTaskV3[] = Array.from({ length: 20 }, (_, index) => ({ id: `task-${index}`, title: `Task ${index}`, estimatedMinutes: 15 }))
    const events: BusyBlock[] = Array.from({ length: 500 }, (_, index) => ({
      id: `event-${index}`, title: `Event ${index}`, start: '2026-07-23T23:59:00', end: '2026-07-24T00:00:00', source: index % 2 ? 'google' : 'outlook',
    }))
    const engine = new PlannerEngine(), optimizer = new PlannerOptimizer()
    const elapsed = measure(() => {
      const plan = engine.createPlan({ date: '2026-07-23', now: '2026-07-23T08:00:00', tasks, externalEvents: events, workingHours: { start: '08:00', end: '18:00' } })
      optimizer.optimize({ plan })
    })
    console.info(`[benchmark:v4] pipeline 500 eventos: ${elapsed.toFixed(2)} ms (mediana de 5)`)
    expect(elapsed).toBeLessThan(80)
  })

  it('simula 100, 500, 1000 y 5000 tareas con métricas de memoria y calidad', () => {
    const results = new SimulationEngine().simulate()
    for (const result of results) console.info(`[simulation:v4] ${result.taskCount}: ${result.latencyMs.toFixed(2)} ms, ${result.estimatedMemoryBytes} bytes, score ${result.optimizedScore}, ganancia ${result.gain}`)
    expect(results.map((result) => result.taskCount)).toEqual([100, 500, 1000, 5000])
    expect(results.every((result) => result.estimatedMemoryBytes > 0 && result.optimizedScore >= result.baselineScore)).toBe(true)
  })

  it('compara explícitamente greedy y optimizer', () => {
    const plan = planWithTasks(30)
    const contexts = Object.fromEntries(plan.orderedTasks.map((task, index) => [task.taskId, `context-${index % 3}`]))
    const result = new PlannerBenchmark().compare(plan, preferences({ taskContexts: contexts }))
    console.info(`[benchmark:v4] greedy ${result.greedy.score} vs optimizer ${result.optimizer.score}; ganancia ${result.gain.toFixed(2)} (${result.qualityGainPercent.toFixed(2)}%)`)
    expect(result.optimizer.score).toBeGreaterThanOrEqual(result.greedy.score)
    expect(result.gain).toBeGreaterThanOrEqual(0)
  })
})
