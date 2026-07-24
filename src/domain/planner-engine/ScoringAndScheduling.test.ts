import { describe, expect, it } from 'vitest'
import { ConflictResolver } from './ConflictResolver'
import { ScoreCalculator } from './ScoreCalculator'
import { SmartScheduler, toMinute, toTime } from './SmartScheduler'
import { SuggestionGenerator } from './SuggestionGenerator'
import type { PlannerTaskV3, TaskScore } from './PlannerTypes'

const score = (taskId: string, value: number): TaskScore => ({ taskId, score: value, confidence: 0.8, factors: [] })

describe('scoring, scheduler, conflictos y sugerencias', () => {
  it('mantiene scores en 0..100 y bloquea dependencias/energía insuficiente', () => {
    const calculator = new ScoreCalculator()
    const context = {
      now: '2026-07-23T08:00:00', endOfDay: '2026-07-23T18:00:00', availableMinutes: 600,
      energy: 'baja' as const, completedTaskIds: new Set<string>(), previousContext: 'dev',
      profile: { sampleSize: 1, completionRate: 0.8, cancellationRate: 0, rescheduleRate: 0, averageProductivity: 0.8, durationByTask: {}, durationByContext: {} },
    }
    expect(calculator.calculate({ id: 'dep', title: 'Dep', dependencies: ['x'] }, context).score).toBe(0)
    expect(calculator.calculate({ id: 'deep', title: 'Deep', energyMinimum: 'alta' }, context).score).toBe(0)
    const result = calculator.calculate({ id: 'good', title: 'Good', priority: 'critica', dueAt: '2026-07-22T08:00:00', urgency: 1, importance: 1, context: 'dev' }, { ...context, energy: 'alta', completedTaskIds: new Set(['x']) })
    expect(result.score).toBeGreaterThan(70)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.factors.reduce((sum, factor) => sum + factor.contribution, 0)).toBeCloseTo(result.score, -1)
    const future = calculator.calculate({ id: 'future', title: 'Future', dueAt: '2026-07-30T08:00:00', estimatedMinutes: 900, urgency: Number.NaN }, {
      ...context, availableMinutes: 0, endOfDay: '2026-07-23T07:00:00', weights: Object.fromEntries(result.factors.map((factor) => [factor.key, 0])),
    })
    expect(future.score).toBe(0)
    expect(future.factors.find((factor) => factor.key === 'timeFit')?.value).toBe(0)
  })

  it('normaliza tiempos y rechaza horarios inválidos', () => {
    expect(toMinute('2026-07-23T09:15:00')).toBe(555)
    expect(toMinute('bad')).toBeNaN()
    expect(toTime('2026-07-23', 555)).toBe('2026-07-23T09:15:00')
    const result = new SmartScheduler().schedule({
      date: '2026-07-23', tasks: [{ id: 'a', title: 'A' }], scores: new Map(), estimates: new Map(), occupied: [],
      energyForecast: [], workingHours: { start: 'bad', end: '18:00' }, bufferMinutes: 0,
    })
    expect(result.conflicts[0].explanation).toContain('no es válido')
  })

  it('respeta horas fijas, fechas límite y capacidad', () => {
    const tasks: PlannerTaskV3[] = [
      { id: 'fixed', title: 'Fija', fixedStartAt: '2026-07-23T09:00:00', dueAt: '2026-07-22T10:00:00' },
      { id: 'large', title: 'Larga', estimatedMinutes: 300 },
    ]
    const result = new SmartScheduler().schedule({
      date: '2026-07-23', tasks, scores: new Map([['fixed', score('fixed', 90)], ['large', score('large', 50)]]),
      estimates: new Map([['fixed', 30], ['large', 300]]), occupied: [], energyForecast: [],
      workingHours: { start: '08:00', end: '10:00' }, bufferMinutes: 0,
    })
    expect(result.planned[0].suggestedStart).toBe('2026-07-23T09:00:00')
    expect(result.planned[0].alerts).toHaveLength(1)
    expect(result.unscheduledTaskIds).toContain('large')
  })

  it('usa defaults, desempata establemente y respeta earliestStartAt', () => {
    const result = new SmartScheduler().schedule({
      date: '2026-07-23',
      tasks: [
        { id: 'b', title: 'B', earliestStartAt: '2026-07-23T09:15:00' },
        { id: 'a', title: 'A', fixedStartAt: '2026-07-23T07:00:00' },
      ],
      scores: new Map(), estimates: new Map(),
      occupied: [{ id: 'invalid', title: 'Invalid', start: 'bad', end: 'bad', source: 'local' }],
      energyForecast: [], workingHours: { start: '08:00', end: '10:00' }, bufferMinutes: 0,
    })
    expect(result.unscheduledTaskIds).toContain('a')
    expect(result.planned[0].taskId).toBe('b')
    expect(result.planned[0].suggestedStart).toBe('2026-07-23T09:15:00')
    expect(result.planned[0].confidence).toBe(0.5)
  })

  it('detecta solapamientos y calcula tareas afectadas', () => {
    const resolver = new ConflictResolver()
    const blocks = [
      { id: 'a', title: 'A', start: '2026-01-01T08:00:00', end: '2026-01-01T09:00:00', source: 'google' as const },
      { id: 'b', title: 'B', start: '2026-01-01T08:30:00', end: '2026-01-01T10:00:00', source: 'outlook' as const },
      { id: 'c', title: 'C', start: '2026-01-01T11:00:00', end: '2026-01-01T12:00:00', source: 'local' as const },
    ]
    expect(resolver.detectBlockOverlaps(blocks)).toHaveLength(1)
    const plan = { date: '2026-01-01', generatedAt: '', unscheduledTaskIds: [], conflicts: [], suggestions: [], totalPlannedMinutes: 60, orderedTasks: [
      { taskId: 't', title: 'T', priority: 1, suggestedStart: '2026-01-01T08:00:00', suggestedEnd: '2026-01-01T09:00:00', reason: '', confidence: 1, estimatedMinutes: 60, energyRequired: 'media' as const, alerts: [], dependencies: [], score: 1, factors: [] },
    ] }
    expect(resolver.affectedTasks(plan, blocks[1])).toHaveLength(1)
    expect(resolver.preserveUnaffected(plan, blocks[1])).toHaveLength(0)
  })

  it('genera todas las acciones recomendadas de forma explicable', () => {
    const tasks: PlannerTaskV3[] = [
      { id: 'now', title: 'Now' },
      { id: 'split', title: 'Split', estimatedMinutes: 121 },
      { id: 'delegate', title: 'Delegate', delegable: true },
      { id: 'move', title: 'Move' },
      { id: 'delete', title: 'Delete', removable: true },
      { id: 'later', title: 'Later' },
    ]
    const scores = new Map(tasks.map((item) => [item.id, score(item.id, item.id === 'delete' ? 20 : item.id === 'later' ? 40 : 80)]))
    const result = new SuggestionGenerator().generate(tasks, scores, new Set(['delegate', 'move']))
    expect(Object.fromEntries(result.map((item) => [item.taskId, item.action]))).toEqual({
      now: 'hacer_ahora', split: 'dividir', delegate: 'delegar', move: 'mover', delete: 'eliminar', later: 'posponer',
    })
    expect(result.every((item) => item.explanation && item.confidence > 0)).toBe(true)
    expect(new SuggestionGenerator().generate([{ id: 'missing', title: 'Missing' }], new Map(), new Set())[0]).toMatchObject({ score: 0, confidence: 0.5 })
  })
})
