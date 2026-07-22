import { describe, expect, it } from 'vitest'
import { normalizeTask, type Task } from './models'
import { applySmartPlan, createSmartPlan } from './smartPlanner'

const task = (id: string, patch: Partial<Task> = {}) => normalizeTask({ id, title: `Tarea ${id}`, createdAt: `2026-07-21T0${id}:00:00.000Z`, ...patch })
const plan = (tasks: Task[], schedule: Record<string, string> = {}, until = '12:00') => createSmartPlan({ tasks, schedule, date: '2026-07-21', availableFrom: '08:00', availableUntil: until, energyPreference: 'media' })

describe('createSmartPlan', () => {
  it('no programa tareas completadas', () => expect(plan([task('1', { completed: true })]).blocks).toHaveLength(0))

  it('prioriza una tarea vencida', () => {
    const result = plan([task('1', { priority: 'alta' }), task('2', { dueDate: '2026-07-20', priority: 'baja' })])
    expect(result.blocks[0].taskId).toBe('2')
  })

  it('no crea solapamientos y respeta horas ocupadas', () => {
    const result = plan([task('1', { estimatedMinutes: 45 }), task('2', { estimatedMinutes: 30 })], { '08:00': 'Reunión' })
    expect(result.blocks[0].startTime).toBe('09:00')
    expect(result.blocks[0].endTime <= result.blocks[1].startTime).toBe(true)
  })

  it('no supera el horario y deja fuera una tarea demasiado larga', () => {
    const tooLong = task('1', { estimatedMinutes: 181 })
    const result = plan([tooLong], {}, '11:00')
    expect(result.blocks).toHaveLength(0)
    expect(result.unscheduledTasks).toEqual([tooLong])
    expect(result.totalPlannedMinutes).toBe(0)
  })

  it('admite tareas antiguas sin campos premium', () => {
    const legacy = normalizeTask({ id: 'legacy', title: 'Tarea antigua' })
    const result = plan([legacy])
    expect(legacy).toMatchObject({ estimatedMinutes: 30, energyLevel: 'media', flexibility: 'flexible', preferredPeriod: 'cualquiera' })
    expect(result.blocks[0].durationMinutes).toBe(30)
  })

  it('no modifica la agenda al proponer y conserva ocupaciones al aplicar', () => {
    const schedule = { '08:00': 'Bloque existente' }
    const result = plan([task('1')], schedule)
    expect(schedule).toEqual({ '08:00': 'Bloque existente' })
    expect(applySmartPlan(schedule, [{ ...result.blocks[0], startTime: '08:00' }])).toEqual(schedule)
  })
})
