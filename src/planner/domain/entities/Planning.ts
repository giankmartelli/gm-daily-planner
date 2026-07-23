import type { EnergyRequired, PlannerTask } from './PlannerTask'

export type BusyBlock = { id: string; taskId?: string; title: string; start: string; end: string; locked?: boolean; kind?: 'event' | 'focus' | 'task' | 'break' }
export type PlannedBlock = BusyBlock & { taskId?: string; durationMinutes: number; energy: EnergyRequired; score: number; confidence: number; reason: string[]; risk: number }
export type PlanningConflict = { type: 'overlap' | 'outside_hours' | 'dependency' | 'capacity'; taskId?: string; message: string }
export type PlanResult = {
  proposalId?: string
  date: string
  blocks: PlannedBlock[]
  unscheduledTasks: PlannerTask[]
  totalAvailableMinutes?: number
  totalPlannedMinutes: number
  freeMinutes: number
  remainingFreeMinutes?: number
  conflicts?: PlanningConflict[]
  confidence: number
  risk: number
  riskScore?: number
  explanation: string[]
  generatedAt: string
}
export type PlanWeekResult = { days: PlanResult[]; unscheduledTasks: PlannerTask[] }
export type LearningEvent = { id: string; taskId?: string; plannedStart?: string; actualStart?: string; plannedEnd?: string; actualEnd?: string; delayedMinutes: number; cancelled: boolean; completed: boolean; productivity: number; context?: string; recordedAt: string }
export type LearningPattern = { sampleSize: number; completionRate: number; averageDelayMinutes: number; effectiveHours: number[]; contextPerformance: Record<string, number>; updatedAt: string }
export type PlanningObservation = LearningEvent & {
  estimatedMinutes: number
  actualMinutes?: number
  energyLevel?: 'baja' | 'media' | 'alta'
  interruptions: number
  contextSwitches: number
}
export type UserProductivityPattern = {
  id: string
  statement: string
  confidence: number
  sampleSize: number
  enabled: boolean
  evidence: string[]
}
export type PlanningPreferenceAdjustment = {
  id: string
  field: string
  previousValue: unknown
  proposedValue: unknown
  explanation: string
  status: 'proposed' | 'accepted' | 'rejected' | 'disabled'
}
