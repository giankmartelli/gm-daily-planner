import { describe, expect, it } from 'vitest'
import { analyticsToCsv, buildProductivityAnalytics } from './analytics'
import { emptyDay, type DayData } from './models'

const completeDay: DayData = {
  ...emptyDay(),
  tasks: [{ id: '1', title: 'Profunda', completed: true, priority: 'alta', category: 'Trabajo', tags: [], subtasks: [], recurrence: 'ninguna', trackedMinutes: 90, deepWork: true, createdAt: '2026-07-23T08:00:00.000Z' }],
  habits: [{ id: 'h1', name: 'Leer', completed: true }],
}

describe('productivity analytics', () => {
  it('calcula KPIs, foco profundo y extremos sin mutar los días', () => {
    const analytics = buildProductivityAnalytics({
      selectedDate: '2026-07-23',
      days: 7,
      getDay: (date) => date === '2026-07-23' ? completeDay : emptyDay(),
      sessions: [{ id: 's1', date: '2026-07-23', minutes: 30 }],
    })
    expect(analytics.today.score).toBe(100)
    expect(analytics.completed).toBe(1)
    expect(analytics.deepMinutes).toBe(90)
    expect(analytics.shallowMinutes).toBe(30)
    expect(analytics.bestDay.date).toBe('2026-07-23')
    expect(completeDay.tasks[0].trackedMinutes).toBe(90)
  })

  it('exporta un CSV estable y legible', () => {
    const analytics = buildProductivityAnalytics({ selectedDate: '2026-07-23', days: 1, getDay: () => completeDay, sessions: [] })
    const csv = analyticsToCsv(analytics)
    expect(csv).toContain('fecha,cumplimiento')
    expect(csv).toContain('2026-07-23,100,1,0,0,90,0,0')
  })
})
