import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../domain/models'
import { defaultPlanningProfile } from './domain/entities/UserPlanningProfile'
import { contextAffinity, isDeepWorkCandidate, canInterrupt } from './domain/heuristics/PlanningHeuristics'
import { normalizePlannerTask } from './domain/entities/PlannerTask'
import { duration, subtractIntervals, toMinutes, toTime } from './domain/valueObjects/Time'
import { fromLegacyTask } from './infrastructure/adapters/LegacyTaskAdapter'
import { AppleCalendarAdapter, GoogleCalendarAdapter, OutlookCalendarAdapter } from './infrastructure/calendar/CalendarAdapters'
import { LocalLearningRepository, MemoryLearningRepository } from './infrastructure/storage/LocalLearningRepository'
import { PlannerEngine } from './plannerEngine'

const legacy = (patch: Partial<Task> = {}): Task => ({
  id: 'legacy', title: 'Tarea heredada', completed: false, priority: 'alta', category: 'Trabajo',
  tags: ['objetivo'], subtasks: [], recurrence: 'semanal', trackedMinutes: 0,
  createdAt: '2026-07-20T08:00:00.000Z', ...patch,
})

describe('Compatibilidad e infraestructura del Planner AI Engine', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('adapta tareas históricas y conserva valores predeterminados', () => {
    const adapted = fromLegacyTask(legacy())
    expect(adapted).toMatchObject({ energyRequired: 'Medium', estimatedMinutes: 30, context: 'Trabajo', repeatType: 'weekly', preferredPeriod: 'any', movable: true, aiGenerated: false })
    expect(adapted.importance).toBe(.9)
    expect(fromLegacyTask(legacy({ priority: 'baja', energyLevel: 'alta', preferredPeriod: 'noche' }))).toMatchObject({ importance: .3, energyRequired: 'High', preferredPeriod: 'evening' })
  })

  it('normaliza límites y evalúa heurísticas de foco y contexto', () => {
    const left = normalizePlannerTask({ id: '1', title: 'Uno', importance: 9, urgency: -2, estimatedMinutes: 300, tags: ['producto'], context: 'Trabajo' })
    const right = normalizePlannerTask({ id: '2', title: 'Dos', tags: ['producto'], context: 'Estudio', focusRequired: .9, interruptible: false })
    expect(left.importance).toBe(1); expect(left.urgency).toBe(0)
    expect(contextAffinity()).toBe(1); expect(contextAffinity(left, left)).toBe(1); expect(contextAffinity(left, right)).toBe(.7)
    expect(contextAffinity(left, normalizePlannerTask({ id: '3', title: 'Tres' }))).toBe(.25)
    expect(isDeepWorkCandidate(left)).toBe(true); expect(isDeepWorkCandidate(right)).toBe(true)
    expect(canInterrupt(right, 60)).toBe(false); expect(canInterrupt(left, 15)).toBe(true)
  })

  it('maneja horarios inválidos, límites y sustracción de intervalos', () => {
    expect(Number.isNaN(toMinutes('8:00'))).toBe(true); expect(Number.isNaN(toMinutes('25:00'))).toBe(true)
    expect(toTime(-1)).toBe('00:00'); expect(toTime(1500)).toBe('24:00'); expect(duration({ start: 20, end: 10 })).toBe(0)
    expect(subtractIntervals({ start: 0, end: 100 }, [{ start: -10, end: 10 }, { start: 20, end: 30 }, { start: 25, end: 40 }, { start: 200, end: 300 }])).toEqual([{ start: 10, end: 20 }, { start: 40, end: 100 }])
  })

  it('expone contratos de calendario con errores de autorización explícitos', async () => {
    for (const adapter of [new GoogleCalendarAdapter(), new OutlookCalendarAdapter(), new AppleCalendarAdapter()]) {
      await expect(adapter.listEvents('2026-07-22', '2026-07-23')).rejects.toThrow(`adaptador ${adapter.provider}`)
    }
  })

  it('persiste aprendizaje local y se recupera de almacenamiento corrupto', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
    const repository = new LocalLearningRepository()
    const event = { id: 'e1', completed: true, cancelled: false, delayedMinutes: 0, productivity: .8, recordedAt: '2026-07-22T08:00:00.000Z' }
    repository.append([event]); expect(repository.list()).toEqual([event])
    const pattern = { sampleSize: 1, completionRate: 1, averageDelayMinutes: 0, effectiveHours: [8], contextPerformance: { general: 1 }, updatedAt: '2026-07-22T09:00:00.000Z' }
    repository.savePattern(pattern); expect(repository.getPattern()).toEqual(pattern)
    storage.set('gm-planner:learning:events:v1', '{broken'); storage.set('gm-planner:learning:pattern:v1', '{broken')
    expect(repository.list()).toEqual([]); expect(repository.getPattern()).toBeUndefined()
  })

  it('tolera fallos de localStorage porque el aprendizaje es opcional', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    const repository = new LocalLearningRepository()
    expect(repository.list()).toEqual([]); expect(repository.getPattern()).toBeUndefined()
    expect(() => repository.append([])).not.toThrow(); expect(() => repository.savePattern({ sampleSize: 0, completionRate: 0, averageDelayMinutes: 0, effectiveHours: [], contextPerformance: {}, updatedAt: '' })).not.toThrow()
  })

  it('ejecuta todos los métodos públicos y optimiza sin mutar el plan original', () => {
    const repository = new MemoryLearningRepository(); expect(repository.getPattern()).toBeUndefined()
    const engine = new PlannerEngine(), profile = defaultPlanningProfile('America/Bogota')
    const task = normalizePlannerTask({ id: '1', title: 'Tarea', estimatedMinutes: 30 })
    const plan = engine.planDay({ date: '2026-07-22', tasks: [task], profile })
    expect(engine.rankTasks({ date: '2026-07-22', time: '08:00', tasks: [task], profile })).toHaveLength(1)
    expect(engine.optimize({ ...plan, blocks: [...plan.blocks].reverse() }).blocks[0].start <= engine.optimize(plan).blocks.at(-1)!.start).toBe(true)
    expect(engine.splitTask(task)).toEqual([task]); expect(engine.buildFocusBlocks({ date: '2026-07-22', events: [], profile }).length).toBeGreaterThan(0)
    expect(engine.learn([]).sampleSize).toBe(0)
  })
})
