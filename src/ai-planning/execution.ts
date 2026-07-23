import type { DayData } from '../domain/models'
import type { AppliedPlan, PlanProposal } from './domain'

const applied = new Map<string, AppliedPlan>()
const clone = <T>(value: T): T => structuredClone(value)

export function applyProposal(proposal: PlanProposal, current: DayData): AppliedPlan {
  const accepted = proposal.changes.filter((change) => change.status === 'accepted' || change.status === 'modified' || change.status === 'proposed')
  const idempotencyKey = `${proposal.id}:${proposal.date}`
  const existing = applied.get(idempotencyKey)
  if (existing?.status === 'applied') return clone(existing)
  const schedule = { ...current.schedule }
  for (const change of accepted) {
    if (change.type !== 'create_block' && change.type !== 'add_break') continue
    if (schedule[change.proposedState.start]?.trim()) continue
    schedule[change.proposedState.start] = change.proposedState.title
  }
  const result: AppliedPlan = {
    id: crypto.randomUUID(), proposalId: proposal.id, date: proposal.date,
    appliedAt: new Date().toISOString(), idempotencyKey,
    before: clone(current), after: { ...clone(current), schedule }, status: 'applied',
  }
  applied.set(idempotencyKey, result)
  return clone(result)
}

export function revertAppliedPlan(plan: AppliedPlan): AppliedPlan {
  const reverted = { ...clone(plan), status: 'reverted' as const }
  applied.set(plan.idempotencyKey, reverted)
  return reverted
}

export function clearExecutionMemory() { applied.clear() }
