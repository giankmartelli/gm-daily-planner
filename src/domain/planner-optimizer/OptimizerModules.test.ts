import { describe, expect, it } from 'vitest'
import { AlternativePlanner } from './AlternativePlanner'
import { ConstraintModel } from './ConstraintModel'
import { FocusBlockOptimizer } from './FocusBlockOptimizer'
import { MetricsEngine } from './MetricsEngine'
import { OptimizationSolver } from './OptimizationSolver'
import { ScenarioGenerator } from './ScenarioGenerator'
import { WorkloadBalancer } from './WorkloadBalancer'
import { addMinutes, plannedTask, preferences } from './PlannerOptimizer.fixtures'

describe('módulos del optimizador V4', () => {
  it('detecta solapamientos, dependencias, duración, protección y horizonte', () => {
    const original = [
      plannedTask('a', '2026-07-23T08:00:00'),
      plannedTask('b', '2026-07-23T08:30:00', { dependencies: ['a'] }),
    ]
    const invalid = [
      plannedTask('b', '2026-07-23T07:30:00', { dependencies: ['a'] }),
      plannedTask('a', '2026-07-23T07:45:00', { suggestedEnd: '2026-07-23T07:45:00' }),
    ]
    const violations = new ConstraintModel().validate(invalid, original, preferences({ protectedTaskIds: new Set(['a']) }))
    expect(new Set(violations.map((item) => item.type))).toEqual(new Set(['overlap', 'dependency', 'duration', 'protected', 'horizon']))
    expect(violations.every((item) => item.explanation)).toBe(true)
  })

  it('crea bloques de foco de 60, 90 y 120 minutos sin interrupciones', () => {
    const focus = new FocusBlockOptimizer()
    const start = '2026-07-23T08:00:00'
    const tasks = [
      plannedTask('a', start, { energyRequired: 'alta', estimatedMinutes: 30 }),
      plannedTask('b', '2026-07-23T08:30:00', { energyRequired: 'alta', estimatedMinutes: 30 }),
      plannedTask('c', '2026-07-23T09:00:00', { energyRequired: 'alta', estimatedMinutes: 30 }),
      plannedTask('d', '2026-07-23T09:30:00', { energyRequired: 'alta', estimatedMinutes: 30 }),
    ]
    expect(focus.detect(tasks, 60, 90)[0]).toMatchObject({ durationMinutes: 90, protected: true })
    expect(focus.detect(tasks.slice(0, 2), 60, 120)[0].durationMinutes).toBe(60)
    expect(focus.detect(tasks, 60, 120)[0].durationMinutes).toBe(120)
    expect(focus.detect([plannedTask('low', start, { energyRequired: 'baja' })])).toEqual([])
  })

  it('balancea energía sin perder tareas', () => {
    const tasks = [
      plannedTask('h1', '2026-07-23T08:00:00', { energyRequired: 'alta' }),
      plannedTask('h2', '2026-07-23T08:30:00', { energyRequired: 'muy_alta' }),
      plannedTask('h3', '2026-07-23T09:00:00', { energyRequired: 'alta' }),
      plannedTask('low', '2026-07-23T09:30:00', { energyRequired: 'baja' }),
    ]
    const balanced = new WorkloadBalancer().balance(tasks, 2)
    expect(balanced.map((task) => task.taskId)).toEqual(['h1', 'h2', 'low', 'h3'])
    expect(new WorkloadBalancer().balance(tasks.slice(0, 3), 1)).toHaveLength(3)
  })

  it('genera escenarios únicos y aplica backtracking acotado', () => {
    const tasks = ['a', 'b', 'c', 'd'].map((id, index) => plannedTask(id, addMinutes('2026-07-23T08:00:00', index * 60), { priority: index * 10 }))
    const scenarios = new ScenarioGenerator().generate(tasks, preferences({ beamWidth: 20, backtrackingDepth: 2, taskContexts: { a: 'x', b: 'y', c: 'x', d: 'y' } }))
    expect(scenarios.length).toBeGreaterThanOrEqual(5)
    expect(new Set(scenarios.map((scenario) => scenario.sequence.map((task) => task.taskId).join(','))).size).toBe(scenarios.length)
    expect(scenarios.some((scenario) => scenario.id.startsWith('backtrack:'))).toBe(true)
  })

  it('ordena alternativas seguras antes que las inválidas', () => {
    const tasks = [plannedTask('a', '2026-07-23T08:00:00'), plannedTask('b', '2026-07-23T08:30:00')]
    const scenarios = new ScenarioGenerator().generate(tasks, preferences())
    const solved = new OptimizationSolver().solve(scenarios, tasks, preferences())
    expect(solved[0].violations).toEqual([])
    const safe = new AlternativePlanner().select(solved, 2)
    expect(safe).toHaveLength(2)
    expect(new AlternativePlanner().select([], 0)).toEqual([])
  })

  it('calcula costes de contexto, fatiga, fragmentación, huecos y energía', () => {
    const tasks = [
      plannedTask('a', '2026-07-23T08:00:00', { energyRequired: 'alta', priority: 90 }),
      plannedTask('b', '2026-07-23T08:45:00', { energyRequired: 'alta', priority: 80 }),
      plannedTask('c', '2026-07-23T09:15:00', { energyRequired: 'alta', priority: 70, dependencies: ['a'] }),
    ]
    const prefs = preferences({
      maximumConsecutiveHighEnergy: 1,
      taskContexts: { a: 'x', b: 'y', c: 'x' },
      energyForecast: [{ start: '2026-07-23T08:00:00', end: '2026-07-23T12:00:00', level: 'baja' }],
    })
    const metrics = new MetricsEngine().measure(tasks, [], prefs)
    expect(metrics.contextSwitches).toBe(2)
    expect(metrics.idleMinutes).toBe(15)
    expect(metrics.fatigue).toBeGreaterThan(0)
    expect(metrics.energyAlignment).toBe(0)
    expect(metrics.score).toBeGreaterThanOrEqual(0)
    expect(metrics.cost).toBeLessThanOrEqual(100)
  })
})
