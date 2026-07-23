import { describe, expect, it } from 'vitest'
import { RecalculateUseCase } from './application/useCases/PlannerUseCases'
import type { LearningEvent, PlannedBlock } from './domain/entities/Planning'
import { normalizePlannerTask, type PlannerTask } from './domain/entities/PlannerTask'
import { defaultPlanningProfile } from './domain/entities/UserPlanningProfile'
import { LearningEngine } from './domain/learning/LearningEngine'
import { TaskRanker } from './domain/ranking/TaskRanker'
import { DayScheduler } from './domain/scheduler/DayScheduler'
import { EnergyService } from './domain/services/EnergyService'
import { FocusService } from './domain/services/FocusService'
import { ScoringService } from './domain/services/ScoringService'
import { SubtaskService } from './domain/services/SubtaskService'
import { overlaps, toMinutes } from './domain/valueObjects/Time'
import { MemoryLearningRepository } from './infrastructure/storage/LocalLearningRepository'
import { PlannerEngine } from './plannerEngine'

const profile = defaultPlanningProfile('America/Bogota')
const task = (id: string, patch: Partial<PlannerTask> = {}) => normalizePlannerTask({ id, title: `Tarea ${id}`, createdAt: `2026-07-20T${String(Number(id.replace(/\D/g, '') || 1) % 24).padStart(2, '0')}:00:00.000Z`, ...patch })

describe('Planner AI Engine', () => {
  it('calcula la energía y compatibilidad sin números mágicos en el flujo', () => {
    const energy = new EnergyService()
    expect(energy.energyAt('08:00', profile)).toBe('High')
    expect(energy.energyAt('14:00', profile)).toBe('Low')
    expect(energy.compatibility(task('1', { energyRequired: 'High' }), '08:30', profile)).toBe(1)
    expect(energy.compatibility(task('1', { energyRequired: 'High' }), '14:00', profile)).toBeLessThan(.5)
  })

  it('puntúa deadline, importancia, urgencia y dependencias de forma explicable', () => {
    const service = new ScoringService(), context = { date: '2026-07-22', time: '08:00', completedTaskIds: new Set<string>(), profile }
    const urgent = service.score(task('1', { deadline: '2026-07-21', urgency: 1, importance: 1 }), context)
    const normal = service.score(task('2', { urgency: .2, importance: .2 }), context)
    const blocked = service.score(task('3', { dependencies: ['missing'] }), context)
    expect(urgent.total).toBeGreaterThan(normal.total)
    expect(urgent.reasons).toContain('Fecha límite vencida')
    expect(blocked).toMatchObject({ total: 0, blocked: true })
  })

  it('ordena de manera estable y excluye tareas completadas', () => {
    const ranked = new TaskRanker().rank([task('1', { completed: true }), task('2', { urgency: .2 }), task('3', { urgency: 1 })], { date: '2026-07-22', time: '08:00', completedTaskIds: new Set(), profile })
    expect(ranked.map((item) => item.task.id)).toEqual(['3', '2'])
  })

  it('construye una agenda sin solapamientos ni reuniones superpuestas', () => {
    const result = new DayScheduler().schedule({ date: '2026-07-22', tasks: [task('1', { estimatedMinutes: 90, deepWork: true }), task('2', { estimatedMinutes: 45 })], events: [{ id: 'meeting', title: 'Reunión', start: '08:00', end: '09:00', locked: true }], profile })
    const intervals = result.blocks.map((block) => ({ start: toMinutes(block.start), end: toMinutes(block.end) }))
    for (let left = 0; left < intervals.length; left += 1) for (let right = left + 1; right < intervals.length; right += 1) expect(overlaps(intervals[left], intervals[right])).toBe(false)
    expect(result.blocks.find((block) => block.taskId)?.start).toBe('09:00')
    expect(result.explanation[0]).toContain('minutos planificados')
  })

  it('no duplica el descanso cuando un evento existente ocupa el almuerzo', () => {
    const result = new DayScheduler().schedule({
      date: '2026-07-22',
      tasks: [task('1')],
      events: [{ id: 'lunch-meeting', title: 'Almuerzo con cliente', start: '12:00', end: '13:30', locked: true }],
      profile,
    })
    const intervals = result.blocks.map((block) => ({ start: toMinutes(block.start), end: toMinutes(block.end) }))
    for (let left = 0; left < intervals.length; left += 1) {
      for (let right = left + 1; right < intervals.length; right += 1) {
        expect(overlaps(intervals[left], intervals[right])).toBe(false)
      }
    }
    expect(result.blocks.filter((block) => block.kind === 'break')).toHaveLength(0)
  })

  it('conserva el pasado y recalcula únicamente el resto del día', () => {
    const past: PlannedBlock = { id: 'past', taskId: '1', title: 'Ya realizado', start: '08:00', end: '09:00', durationMinutes: 60, energy: 'High', score: 1, confidence: 1, reason: [], risk: 0, kind: 'task' }
    const currentPlan = { date: '2026-07-22', blocks: [past], unscheduledTasks: [], totalPlannedMinutes: 60, freeMinutes: 400, confidence: 1, risk: 0, explanation: [], generatedAt: new Date(0).toISOString() }
    const result = new RecalculateUseCase().execute({ date: '2026-07-22', tasks: [task('1'), task('2')], profile, currentPlan, trigger: 'event-created', at: '10:00', events: [{ id: 'new', title: 'Reunión nueva', start: '10:00', end: '11:00', locked: true }] })
    expect(result.blocks.some((block) => block.title === 'Ya realizado')).toBe(true)
    expect(result.blocks.find((block) => block.taskId === '2')?.start >= '11:00').toBe(true)
  })

  it('divide tareas largas preservando duración, prioridad y dependencias', () => {
    const original = task('1', { title: 'Crear landing', estimatedMinutes: 240, importance: .9, dependencies: ['brief'] })
    const parts = new SubtaskService().split(original)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.reduce((sum, item) => sum + item.estimatedMinutes, 0)).toBe(240)
    expect(parts.every((item) => item.importance === .9 && item.createdAutomatically && !item.aiGenerated)).toBe(true)
    expect(parts[1].dependencies).toContain('1:part:1')
  })

  it('crea bloques de foco respetando reuniones y capacidad diaria', () => {
    const blocks = new FocusService().build('2026-07-22', [{ id: 'meeting', title: 'Reunión', start: '10:00', end: '11:00' }], profile)
    expect(blocks.reduce((sum, block) => sum + block.durationMinutes, 0)).toBeLessThanOrEqual(profile.deepWorkCapacity)
    expect(blocks.every((block) => !overlaps({ start: toMinutes(block.start), end: toMinutes(block.end) }, { start: 600, end: 660 }))).toBe(true)
  })

  it('aprende patrones reales y acumula muestras sin depender de IA', () => {
    const repository = new MemoryLearningRepository(), learning = new LearningEngine(repository)
    const events: LearningEvent[] = [{ id: '1', completed: true, cancelled: false, delayedMinutes: 10, productivity: .9, actualStart: '2026-07-22T08:00:00.000Z', context: 'Trabajo', recordedAt: '2026-07-22T10:00:00.000Z' }, { id: '2', completed: false, cancelled: true, delayedMinutes: 30, productivity: .2, context: 'Trabajo', recordedAt: '2026-07-22T11:00:00.000Z' }]
    const pattern = learning.learn(events)
    expect(pattern).toMatchObject({ sampleSize: 2, completionRate: .5, averageDelayMinutes: 20 })
    expect(pattern.contextPerformance.Trabajo).toBe(.5)
    expect(repository.getPattern()).toEqual(pattern)
  })

  it('planifica una semana sin repetir tareas y expone la API pública completa', () => {
    const engine = new PlannerEngine(), tasks = [task('1', { preferredDays: [1] }), task('2', { preferredDays: [2] })]
    const week = engine.planWeek({ weekStart: '2026-07-20', tasks, profile })
    const ids = week.days.flatMap((day) => day.blocks.flatMap((block) => block.taskId ?? []))
    expect(new Set(ids).size).toBe(ids.length)
    expect(typeof engine.planDay).toBe('function'); expect(typeof engine.recalculate).toBe('function'); expect(typeof engine.rankTasks).toBe('function'); expect(typeof engine.optimize).toBe('function'); expect(typeof engine.splitTask).toBe('function'); expect(typeof engine.buildFocusBlocks).toBe('function'); expect(typeof engine.learn).toBe('function')
  })

  it('procesa 500 tareas por debajo de 150 ms', () => {
    const tasks = Array.from({ length: 500 }, (_, index) => task(String(index + 1), { estimatedMinutes: 15 + index % 8 * 5, urgency: (index % 10) / 10, importance: ((index * 3) % 10) / 10 }))
    const start = performance.now(); const result = new DayScheduler().schedule({ date: '2026-07-22', tasks, profile }); const elapsed = performance.now() - start
    expect(result.blocks.length).toBeGreaterThan(0)
    expect(result.blocks.length + result.unscheduledTasks.length).toBe(501) // Incluye el bloque protegido de almuerzo.
    console.info(`[Planner benchmark] 500 tareas: ${elapsed.toFixed(2)} ms`)
    expect(elapsed).toBeLessThan(150)
  })
})
