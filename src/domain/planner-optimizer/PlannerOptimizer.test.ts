import { describe, expect, it } from 'vitest'
import type { EnergyLevelV3 } from '../planner-engine'
import { PlannerOptimizer } from './PlannerOptimizer'
import { addMinutes, dailyPlan, plannedTask } from './PlannerOptimizer.fixtures'

describe('PlannerOptimizer V4', () => {
  it('genera múltiples alternativas, elige la mejor y no modifica V3', () => {
    const start = '2026-07-23T08:00:00'
    const tasks = Array.from({ length: 6 }, (_, index) => plannedTask(String(index), addMinutes(start, index * 30), {
      priority: index === 5 ? 95 : 50,
      energyRequired: index % 2 ? 'alta' : 'baja',
    }))
    const plan = dailyPlan(tasks)
    const original = structuredClone(plan)
    const optimized = new PlannerOptimizer().optimize({
      plan,
      preferences: { taskContexts: { '0': 'a', '1': 'b', '2': 'a', '3': 'b', '4': 'a', '5': 'b' } },
    })
    expect(optimized.alternatives).toHaveLength(3)
    expect(optimized.selected.metrics.score).toBeGreaterThanOrEqual(optimized.baselineMetrics.score)
    expect(optimized.gain).toBeGreaterThanOrEqual(0)
    expect(optimized.decisions).toHaveLength(6)
    expect(optimized.decisions.every((decision) => decision.why && decision.changed)).toBe(true)
    expect(plan).toEqual(original)
  })

  it('respeta tareas protegidas y mantiene el baseline si las alternativas son inválidas', () => {
    const tasks = [
      plannedTask('a', '2026-07-23T08:00:00', { priority: 10 }),
      plannedTask('b', '2026-07-23T08:30:00', { priority: 100 }),
    ]
    const optimized = new PlannerOptimizer().optimize({ plan: dailyPlan(tasks), preferences: { protectedTaskIds: new Set(['a', 'b']) } })
    expect(optimized.selected.id).toBe('baseline')
    expect(optimized.selected.violations).toEqual([])
  })

  it('devuelve un plan vacío válido', () => {
    const result = new PlannerOptimizer().optimize({ plan: dailyPlan([]) })
    expect(result.selected.tasks).toEqual([])
    expect(result.selected.metrics.score).toBeGreaterThanOrEqual(0)
    expect(result.decisions).toEqual([])
  })

  it('alinea energía con el pronóstico y explica trade-offs', () => {
    const tasks = [
      plannedTask('low', '2026-07-23T08:00:00', { energyRequired: 'baja' }),
      plannedTask('high', '2026-07-23T08:30:00', { energyRequired: 'alta', priority: 90 }),
    ]
    const result = new PlannerOptimizer().optimize({
      plan: dailyPlan(tasks),
      preferences: {
        energyForecast: [{ start: '2026-07-23T08:00:00', end: '2026-07-23T10:00:00', level: 'alta' as EnergyLevelV3 }],
      },
    })
    expect(result.selected.metrics.energyAlignment).toBe(1)
    expect(result.decisions.every((decision) => decision.improved.length)).toBe(true)
  })
})
