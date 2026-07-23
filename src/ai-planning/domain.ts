import type { DayData, EnergyLevel, Goal, Task, TimeSession } from '../domain/models'

export type DataProvenance = 'CONFIRMED' | 'ESTIMATED' | 'AI_SUGGESTION' | 'UNAVAILABLE'
export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type ChangeStatus = 'proposed' | 'accepted' | 'modified' | 'rejected' | 'applied' | 'failed' | 'reverted'
export type RiskLevel = 'low' | 'medium' | 'high'

export type ContextValue<T> = {
  status: Exclude<DataProvenance, 'AI_SUGGESTION'>
  value?: T
  source: string
  observedAt?: string
  explanation?: string
}

export type PlanningConstraint = {
  id: string
  type: 'availability' | 'busy' | 'locked' | 'preference'
  start?: string
  end?: string
  title: string
}

export type TaskCandidate = Task & { normalizedDuration: number }
export type CalendarBlock = { id: string; title: string; start: string; end: string; locked: boolean; source: DataProvenance }
export type EnergyProfile = { level: EnergyLevel; source: DataProvenance }
export type PlanningInsight = { id: string; title: string; explanation: string; provenance: DataProvenance; confidence: ConfidenceLevel }

export type PlanningContext = {
  userId?: string
  date: string
  generatedAt: string
  tasks: ContextValue<TaskCandidate[]>
  calendar: ContextValue<CalendarBlock[]>
  goals: ContextValue<Goal[]>
  focusHistory: ContextValue<TimeSession[]>
  energy: ContextValue<EnergyProfile>
  weather: ContextValue<unknown>
  sleep: ContextValue<unknown>
  constraints: PlanningConstraint[]
}

export type ProposedChange = {
  id: string
  type: 'create_block' | 'move_task' | 'postpone_task' | 'add_break'
  title: string
  explanation: string
  expectedBenefit: string
  confidence: ConfidenceLevel
  dataSources: DataProvenance[]
  affectedEntityIds: string[]
  beforeState: unknown
  proposedState: { start: string; end: string; title: string; taskId?: string }
  reversible: boolean
  riskLevel: RiskLevel
  status: ChangeStatus
}

export type PlanProposal = {
  id: string
  date: string
  createdAt: string
  changes: ProposedChange[]
  insights: PlanningInsight[]
  completionProbability: number
  probabilityExplanation: string[]
  status: 'draft' | 'reviewed' | 'accepted' | 'rejected' | 'applied'
  context: PlanningContext
}

export type PlanningDecision = { id: string; proposalId: string; changeId: string; decision: 'accepted' | 'modified' | 'rejected'; decidedAt: string }
export type AppliedPlan = { id: string; proposalId: string; date: string; appliedAt: string; idempotencyKey: string; before: DayData; after: DayData; status: 'applied' | 'reverted' }
export type PlanOutcome = { id: string; appliedPlanId: string; completedTaskIds: string[]; postponedTaskIds: string[]; energy?: EnergyLevel; realistic?: boolean; notes?: string; recordedAt: string }

export interface ContextProvider<T> {
  isAvailable(): Promise<boolean>
  getContext(userId: string | undefined, date: Date): Promise<ContextValue<T>>
}
