export type PlanningEvent =
  | 'planning_requested' | 'proposal_generated' | 'proposal_viewed' | 'proposal_modified'
  | 'proposal_accepted' | 'proposal_rejected' | 'plan_applied' | 'plan_reverted'
  | 'planning_failed' | 'day_review_completed'

type SafeProperties = { changeCount?: number; durationMs?: number; acceptedCount?: number; rejectedCount?: number }

export function trackPlanningEvent(event: PlanningEvent, properties: SafeProperties = {}) {
  window.dispatchEvent(new CustomEvent('gm:planning-telemetry', { detail: { event, properties, timestamp: new Date().toISOString() } }))
}
