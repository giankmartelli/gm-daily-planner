import { describe, expect, it } from 'vitest'
import { PlannerBenchmark } from './PlannerBenchmark'
import { PlannerOptimizer } from './PlannerOptimizer'
import { dailyPlan, plannedTask, preferences } from './PlannerOptimizer.fixtures'
import { RescheduleEngine } from './RescheduleEngine'
import { SimulationEngine } from './SimulationEngine'

describe('replanificación, simulación y benchmark V4', () => {
  it('recalcula solo el sufijo afectado por una reunión', () => {
    const tasks = [
      plannedTask('a', '2026-07-23T08:00:00'),
      plannedTask('b', '2026-07-23T08:30:00'),
      plannedTask('c', '2026-07-23T09:00:00'),
    ]
    const current = new PlannerOptimizer().optimize({ plan: dailyPlan(tasks), preferences: { protectedTaskIds: new Set(['a', 'b', 'c']) } })
    const result = new RescheduleEngine().replan(current, { type: 'meeting', id: 'm', start: '2026-07-23T08:30:00', end: '2026-07-23T09:30:00' })
    expect(result.preservedTaskIds).toEqual(['a'])
    expect(result.affectedTaskIds).toEqual(['b', 'c'])
    expect(result.plan.selected.tasks.filter((task) => ['b', 'c'].includes(task.taskId)).map((task) => task.suggestedStart).sort()[0]).toBe('2026-07-23T09:30:00')
  })

  it('recalcula duración, elimina canceladas y no cambia si no afecta', () => {
    const tasks = [plannedTask('a', '2026-07-23T08:00:00'), plannedTask('b', '2026-07-23T08:30:00')]
    const current = new PlannerOptimizer().optimize({ plan: dailyPlan(tasks) })
    const longer = new RescheduleEngine().replan(current, { type: 'duration', taskId: 'a', actualMinutes: 60 })
    expect(longer.plan.selected.tasks.find((task) => task.taskId === 'a')?.estimatedMinutes).toBe(60)
    const cancelled = new RescheduleEngine().replan(current, { type: 'cancelled', taskId: 'a' })
    expect(cancelled.plan.selected.tasks.some((task) => task.taskId === 'a')).toBe(false)
    const untouched = new RescheduleEngine().replan(current, { type: 'cancelled', taskId: 'missing' })
    expect(untouched.plan).toBe(current)
    expect(untouched.affectedTaskIds).toEqual([])
  })

  it('simula cargas deterministas y mide memoria/calidad', () => {
    const results = new SimulationEngine().simulate([100, 500])
    expect(results.map((result) => result.taskCount)).toEqual([100, 500])
    expect(results.every((result) => result.latencyMs >= 0 && result.estimatedMemoryBytes > 0)).toBe(true)
    expect(results.every((result) => result.optimizedScore >= result.baselineScore)).toBe(true)
  })

  it('compara greedy y optimizer con score, latencia y ganancia', () => {
    const tasks = [
      plannedTask('a', '2026-07-23T08:00:00'),
      plannedTask('b', '2026-07-23T08:30:00'),
      plannedTask('c', '2026-07-23T09:00:00'),
    ]
    const result = new PlannerBenchmark().compare(dailyPlan(tasks), preferences({ taskContexts: { a: 'x', b: 'y', c: 'x' } }))
    expect(result.greedy.latencyMs).toBeGreaterThanOrEqual(0)
    expect(result.optimizer.latencyMs).toBeGreaterThanOrEqual(0)
    expect(result.gain).toBe(result.optimizer.score - result.greedy.score)
    expect(Number.isFinite(result.qualityGainPercent)).toBe(true)
  })
})
