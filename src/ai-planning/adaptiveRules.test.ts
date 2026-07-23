import { expect, it } from 'vitest'
import { normalizeTask } from '../domain/models'
import type { PlanOutcome } from './domain'
import { adaptFromOutcome } from './adaptiveRules'

it('ajusta con reglas transparentes sin aprendizaje opaco', () => {
  const task = normalizeTask({ id: 'a', title: 'A', estimatedMinutes: 30 })
  const outcome: PlanOutcome = { id: 'o', appliedPlanId: 'p', completedTaskIds: [], postponedTaskIds: ['a'], actualMinutes: { a: 60 }, energy: 'baja', realistic: false, usefulRecommendationIds: [], rejectedRecommendationIds: [], rating: 2, recordedAt: new Date().toISOString() }
  const result = adaptFromOutcome([task], outcome)
  expect(result.tasks[0].estimatedMinutes).toBe(40)
  expect(result.dailyLoadFactor).toBe(.85)
  expect(result.breakMinutes).toBe(15)
})
