import { describe, expect, it } from 'vitest'
import { DependencyGraph } from './DependencyGraph'
import { energyAt, energyCompatibility, energyRank, isEnergySafe, taskEnergyIdeal, taskEnergyMinimum } from './EnergyModel'
import { LearningEngine } from './LearningEngine'
import { TimeEstimator } from './TimeEstimator'

describe('modelos de soporte V3', () => {
  it('modela energía con defaults y límites seguros', () => {
    expect(energyRank('muy_alta')).toBe(4)
    expect(taskEnergyMinimum({ id: '1', title: 'Compleja', complexity: 0.8 })).toBe('alta')
    expect(taskEnergyMinimum({ id: '2', title: 'Normal' })).toBe('media')
    expect(taskEnergyIdeal({ id: '3', title: 'Ideal', energyIdeal: 'muy_alta' })).toBe('muy_alta')
    expect(isEnergySafe({ id: '1', title: 'x', energyMinimum: 'alta' }, 'baja')).toBe(false)
    expect(energyCompatibility({ id: '1', title: 'x', energyMinimum: 'baja', energyIdeal: 'media' }, 'muy_alta')).toBeCloseTo(0.7)
    expect(energyAt('2026-01-01T10:00:00', [{ start: '2026-01-01T09:00:00', end: '2026-01-01T11:00:00', level: 'alta' }])).toBe('alta')
    expect(energyAt('2026-01-01T12:00:00', [])).toBe('media')
  })

  it('estima con historia exacta, contextual y fallback', () => {
    const estimator = new TimeEstimator()
    const history = [
      { taskId: 'a', context: 'dev', plannedMinutes: 30, actualMinutes: 45, completed: true },
      { taskId: 'a', context: 'dev', plannedMinutes: 60, actualMinutes: 75, completed: true },
    ]
    const exact = estimator.estimate({ id: 'a', title: 'A', estimatedMinutes: 40 }, history)
    expect(exact.predictedMinutes).toBe(55)
    expect(exact.averageMinutes).toBe(60)
    expect(exact.standardDeviation).toBe(15)
    expect(exact.averageError).toBe(15)
    expect(exact.sampleSize).toBe(2)
    expect(estimator.estimate({ id: 'b', title: 'B', context: 'dev', estimatedMinutes: 40 }, history).sampleSize).toBe(2)
    expect(estimator.estimate({ id: 'c', title: 'C' }).confidence).toBe(0.35)
  })

  it('construye un perfil estadístico sin persistencia', () => {
    const profile = new LearningEngine().buildProfile([
      { taskId: 'a', context: 'dev', plannedMinutes: 30, actualMinutes: 40, actualStart: '2026-01-01T09:00:00', completed: true, productivity: 0.8 },
      { taskId: 'a', context: 'dev', plannedMinutes: 30, actualMinutes: 35, actualStart: '2026-01-02T11:00:00', completed: false, cancelled: true, rescheduled: true },
    ])
    expect(profile.sampleSize).toBe(2)
    expect(profile.completionRate).toBe(0.5)
    expect(profile.cancellationRate).toBe(0.5)
    expect(profile.rescheduleRate).toBe(0.5)
    expect(profile.averageProductivity).toBe(0.4)
    expect(profile.preferredStartHour).toBe(10)
    expect(profile.durationByTask.a.sampleSize).toBe(2)
    expect(profile.durationByContext.dev.sampleSize).toBe(2)
    expect(new LearningEngine().buildProfile([]).preferredStartHour).toBeUndefined()
    const sparse = new LearningEngine().buildProfile([{ plannedMinutes: 10, actualMinutes: 12, completed: true }])
    expect(sparse.durationByTask).toEqual({})
    expect(sparse.durationByContext).toEqual({})
    expect(sparse.averageProductivity).toBe(1)
  })

  it('ordena un DAG y detecta bloqueos, faltantes y ciclos', () => {
    const graph = new DependencyGraph()
    const clean = graph.analyze([
      { id: 'a', title: 'A', completed: true },
      { id: 'b', title: 'B', dependencies: ['a'] },
      { id: 'c', title: 'C', dependencies: ['b'] },
    ])
    expect(clean.orderedIds).toEqual(['a', 'b', 'c'])
    expect(clean.blockedIds).toEqual(['c'])
    const broken = graph.analyze([
      { id: 'x', title: 'X', dependencies: ['y'] },
      { id: 'y', title: 'Y', dependencies: ['x'] },
      { id: 'z', title: 'Z', dependencies: ['void'] },
    ])
    expect(broken.cycles[0]).toEqual(['x', 'y'])
    expect(broken.missingDependencies.z).toEqual(['void'])
    expect(broken.blockedIds.sort()).toEqual(['x', 'y', 'z'])
  })
})
