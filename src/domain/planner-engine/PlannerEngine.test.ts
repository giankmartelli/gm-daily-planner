import { describe, expect, it } from 'vitest'
import { PlannerEngine } from './PlannerEngine'
import type { PlannerInput, PlannerTaskV3 } from './PlannerTypes'

const task = (id: string, extra: Partial<PlannerTaskV3> = {}): PlannerTaskV3 => ({
  id, title: `Tarea ${id}`, priority: 'media', estimatedMinutes: 30, energyMinimum: 'media', ...extra,
})
const input = (tasks: PlannerTaskV3[], extra: Partial<PlannerInput> = {}): PlannerInput => ({
  date: '2026-07-23',
  now: '2026-07-23T08:00:00',
  tasks,
  workingHours: { start: '08:00', end: '18:00' },
  energyForecast: [{ start: '2026-07-23T08:00:00', end: '2026-07-23T18:00:00', level: 'alta' }],
  preferences: { bufferMinutes: 0 },
  ...extra,
})

describe('PlannerEngine V3', () => {
  it('produce un plan puro, ordenado y explicable sin modificar la entrada', () => {
    const tasks = [task('b', { priority: 'baja' }), task('a', { priority: 'critica', dueAt: '2026-07-23T09:00:00' })]
    const original = structuredClone(tasks)
    const plan = new PlannerEngine().createPlan(input(tasks))
    expect(plan.orderedTasks.map((item) => item.taskId)).toEqual(['a', 'b'])
    expect(plan.orderedTasks[0].reason).toContain('Score')
    expect(plan.orderedTasks[0].factors).toHaveLength(12)
    expect(plan.orderedTasks[0].confidence).toBeGreaterThan(0)
    expect(plan.totalPlannedMinutes).toBe(60)
    expect(tasks).toEqual(original)
  })

  it('respeta calendarios, eventos externos, bloques fijos, almuerzo y buffers', () => {
    const plan = new PlannerEngine().createPlan(input([task('a', { estimatedMinutes: 45 })], {
      calendarEvents: [{ id: 'g', title: 'Google', start: '08:00', end: '09:00', source: 'google' }],
      externalEvents: [{ id: 'o', title: 'Outlook', start: '09:00', end: '10:00', source: 'outlook' }],
      timeBlocks: [{ id: 'fixed', title: 'Traslado', start: '10:00', end: '11:00', source: 'travel' }],
      preferences: { bufferMinutes: 10, lunch: { start: '12:00', end: '13:00' } },
    }))
    expect(plan.orderedTasks[0].suggestedStart).toBe('2026-07-23T13:10:00')
  })

  it('no asigna una tarea compleja con energía baja', () => {
    const plan = new PlannerEngine().createPlan(input([task('deep', { complexity: 0.95, energyMinimum: 'alta' })], {
      energyForecast: [{ start: '2026-07-23T08:00:00', end: '2026-07-23T18:00:00', level: 'baja' }],
    }))
    expect(plan.orderedTasks).toHaveLength(0)
    expect(plan.unscheduledTaskIds).toContain('deep')
    expect(plan.conflicts.some((item) => item.type === 'energy')).toBe(true)
  })

  it('incluye hábitos y subtareas, pero excluye completadas', () => {
    const plan = new PlannerEngine().createPlan(input([task('done', { completed: true })], {
      subtasks: [task('sub')],
      habits: [{ id: 'water', title: 'Agua', durationMinutes: 10, preferredTime: '09:00' }],
    }))
    expect(plan.orderedTasks.map((item) => item.taskId).sort()).toEqual(['habit:water', 'sub'])
  })

  it('detecta ciclos y dependencias inexistentes', () => {
    const plan = new PlannerEngine().createPlan(input([
      task('a', { dependencies: ['b'] }),
      task('b', { dependencies: ['a'] }),
      task('c', { dependencies: ['missing'] }),
    ]))
    expect(plan.conflicts.some((item) => item.type === 'cycle')).toBe(true)
    expect(plan.conflicts.some((item) => item.type === 'dependency')).toBe(true)
    expect(plan.unscheduledTaskIds.sort()).toEqual(['a', 'b', 'c'])
  })

  it('recalcula únicamente tareas afectadas y conserva las demás', () => {
    const engine = new PlannerEngine()
    const base = input([task('a'), task('b'), task('c')])
    const previousPlan = engine.createPlan(base)
    const preserved = previousPlan.orderedTasks[2]
    const next = engine.replanAffected({
      ...base,
      previousPlan,
      newEvent: { id: 'meeting', title: 'Reunión', start: '08:00', end: '09:00', source: 'google' },
    })
    expect(next.orderedTasks.find((item) => item.taskId === preserved.taskId)).toEqual(preserved)
    expect(next.orderedTasks.find((item) => item.taskId === previousPlan.orderedTasks[0].taskId)?.suggestedStart).not.toBe('2026-07-23T08:00:00')
  })

  it('no reconstruye el día si el evento nuevo no afecta tareas', () => {
    const engine = new PlannerEngine()
    const base = input([task('a')])
    const previousPlan = engine.createPlan(base)
    const next = engine.replanAffected({
      ...base, now: '2026-07-23T08:05:00', previousPlan,
      newEvent: { id: 'late', title: 'Tarde', start: '19:00', end: '20:00', source: 'outlook' },
    })
    expect(next.orderedTasks).toEqual(previousPlan.orderedTasks)
    expect(next.generatedAt).toBe('2026-07-23T08:05:00')
  })

})
