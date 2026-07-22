// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { localPlannerRepository as repository } from './plannerRepository'

describe('localPlannerRepository', () => {
  beforeEach(() => { localStorage.clear(); repository.setScope(null) })

  it('migra tareas de versiones anteriores sin perder datos', () => {
    localStorage.setItem('gm-daily-planner:2026-07-21', JSON.stringify({ tasks: [{ id: '1', title: 'Tarea heredada', completed: false, priority: 'alta', category: 'Trabajo' }] }))
    const task = repository.getDay('2026-07-21').tasks[0]
    expect(task.title).toBe('Tarea heredada')
    expect(task.subtasks).toEqual([])
    expect(task.recurrence).toBe('ninguna')
    expect(task.estimatedMinutes).toBe(25)
  })

  it('persiste objetivos y sesiones de enfoque', () => {
    repository.saveWorkspace({ goals: [{ id: 'g1', title: 'Leer', target: 10, progress: 2, unit: 'libros' }], sessions: [{ id: 's1', minutes: 25, date: '2026-07-21' }] })
    expect(repository.getWorkspace().goals[0].progress).toBe(2)
    expect(repository.getWorkspace().sessions[0].minutes).toBe(25)
  })

  it('descarta datos corruptos y limita valores inválidos', () => {
    localStorage.setItem('gm-daily-planner:2026-07-22', JSON.stringify({ tasks: [null, { id: '2', title: '', estimatedMinutes: -5 }, { id: '3', title: 'Válida', estimatedMinutes: 99999 }], notes: 42 }))
    const day = repository.getDay('2026-07-22')
    expect(day.tasks).toHaveLength(1)
    expect(day.tasks[0].estimatedMinutes).toBe(1440)
    expect(day.notes).toBe('')
  })

  it('aísla los datos locales de cada usuario autenticado', () => {
    repository.setScope('usuario-a')
    repository.saveDay('2026-07-21', { tasks: [], schedule: {}, habits: [], notes: 'Privado A' })
    repository.setScope('usuario-b')
    expect(repository.getDay('2026-07-21').notes).toBe('')
    repository.saveDay('2026-07-21', { tasks: [], schedule: {}, habits: [], notes: 'Privado B' })
    repository.setScope('usuario-a')
    expect(repository.getDay('2026-07-21').notes).toBe('Privado A')
  })

  it('mantiene una tarea nueva después de recibir una sincronización remota obsoleta', async () => {
    repository.setScope('usuario-sincronizado')
    const date = '2026-07-21'
    const localUpdatedAt = '2026-07-21T18:00:00.000Z'
    repository.saveDay(date, {
      tasks: [{ id: 'task-local', title: 'No debe desaparecer', completed: false, priority: 'alta', category: 'Trabajo', tags: [], subtasks: [], recurrence: 'ninguna', estimatedMinutes: 25, trackedMinutes: 0, createdAt: localUpdatedAt }],
      schedule: {}, habits: [], notes: '',
    }, localUpdatedAt)

    await Promise.resolve()
    const result = repository.mergeRemoteDay(date, { tasks: [], schedule: {}, habits: [], notes: '' }, '2026-07-21T17:59:00.000Z')

    expect(result).toBe('local')
    expect(repository.getDay(date).tasks).toHaveLength(1)
    expect(repository.getDay(date).tasks[0].title).toBe('No debe desaparecer')
  })
})
