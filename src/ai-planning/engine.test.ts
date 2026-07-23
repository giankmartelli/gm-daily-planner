import { beforeEach, describe, expect, it } from 'vitest'
import { emptyDay, normalizeTask } from '../domain/models'
import type { PlanProposal, PlanningContext } from './domain'
import { calculateCompletionProbability, createPlanProposal } from './engine'
import { applyProposal, clearExecutionMemory, revertAppliedPlan } from './execution'
import { RemotePlannerAIProvider } from './providers'

const task = (id: string, duration = 30) => ({ ...normalizeTask({ id, title: id }), estimatedMinutes: duration })
const context = (tasks = [task('Uno')]): PlanningContext => ({
  date: '2026-07-23', generatedAt: new Date().toISOString(),
  tasks: { status: 'CONFIRMED', value: tasks.map((item) => ({ ...item, normalizedDuration: item.estimatedMinutes ?? 30 })), source: 'test' },
  calendar: { status: 'CONFIRMED', value: [], source: 'test' },
  goals: { status: 'CONFIRMED', value: [], source: 'test' },
  focusHistory: { status: 'CONFIRMED', value: [], source: 'test' },
  energy: { status: 'CONFIRMED', value: { level: 'media', source: 'CONFIRMED' }, source: 'test' },
  weather: { status: 'UNAVAILABLE', source: 'test' },
  sleep: { status: 'UNAVAILABLE', source: 'test' },
  constraints: [],
})

describe('AI Planning Engine', () => {
  beforeEach(clearExecutionMemory)
  it('calcula una probabilidad acotada y reproducible', () => {
    expect(calculateCompletionProbability({ availableMinutes: 240, plannedMinutes: 180, historicalCompletionRate: .8, overdueTasks: 0, taskCount: 2, calendarBlocks: 1, contextSwitches: 1, energy: 'alta' })).toBe(80)
    expect(calculateCompletionProbability({ availableMinutes: 0, plannedMinutes: 200, overdueTasks: 20, taskCount: 20, calendarBlocks: 20, contextSwitches: 20, energy: 'baja' })).toBe(0)
  })
  it('no inventa clima ni sueño y crea cambios auditables', () => {
    const proposal = createPlanProposal({ context: context(), availableFrom: '08:00', availableUntil: '12:00', energy: 'media' })
    expect(proposal.insights.map((item) => item.provenance)).toContain('UNAVAILABLE')
    expect(proposal.changes[0]).toMatchObject({ reversible: true, status: 'proposed', dataSources: ['CONFIRMED', 'AI_SUGGESTION'] })
  })
  it('no duplica al aplicar y permite deshacer', () => {
    const proposal = createPlanProposal({ context: context(), availableFrom: '08:00', availableUntil: '12:00', energy: 'media' })
    const first = applyProposal(proposal, emptyDay())
    const second = applyProposal(proposal, emptyDay())
    expect(second.id).toBe(first.id)
    expect(second.after.schedule).toEqual(first.after.schedule)
    expect(Object.values(first.after.schedule).filter(Boolean)).toHaveLength(proposal.changes.length)
    expect(revertAppliedPlan(first).before).toEqual(emptyDay())
  })
  it('respeta un bloque ocupado', () => {
    const proposal = createPlanProposal({ context: context(), availableFrom: '08:00', availableUntil: '12:00', energy: 'media' })
    const day = emptyDay(); day.schedule['08:00'] = 'Consulta'
    const changed = { ...proposal, changes: proposal.changes.map((change) => ({ ...change, proposedState: { ...change.proposedState, start: '08:00' } })) } as PlanProposal
    expect(applyProposal(changed, day).after.schedule['08:00']).toBe('Consulta')
  })
  it('usa fallback determinístico sin endpoint remoto', async () => {
    const result = await new RemotePlannerAIProvider().generateBrief({ context: context(), availableFrom: '08:00', availableUntil: '12:00', energy: 'media' })
    expect(result.changes.length).toBeGreaterThan(0)
  })
})
