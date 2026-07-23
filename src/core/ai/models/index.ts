import type { DayData, EnergyLevel, Goal, Task, TimeSession } from '../../../domain/models'
import type { PlanOutcome } from '../../../ai-planning/domain'

export type EngineContext = {
  date: string
  day: DayData
  goals: Goal[]
  sessions: TimeSession[]
  outcomes: PlanOutcome[]
  history: Array<{ date: string; day: DayData }>
  declaredEnergy?: EnergyLevel
  availableMinutes: number
}

export type EngineResult<T> = {
  value: T
  generatedAt: string
  provenance: 'CONFIRMED' | 'ESTIMATED' | 'AI_SUGGESTION'
  explanations: string[]
}

export type DecisionScore = {
  taskId: string
  score: number
  priority: number
  urgency: number
  impact: number
  energyFit: number
  durationFit: number
  dependencyReadiness: number
  explanation: string[]
}

export type WorkloadClass = 'Deep Work' | 'Creative' | 'Administrative' | 'Meetings' | 'Quick Tasks' | 'Recovery'
export type EnergyAssessment = {
  taskId: string
  classification: WorkloadClass
  mentalLoad: number
  focusCost: number
  contextSwitchCost: number
  recommendedPeriod: 'mañana' | 'tarde' | 'noche' | 'cualquiera'
  explanation: string
}

export type Prediction = { probability: number; factors: Array<{ label: string; effect: number; source: string }> }

export type MorningBrief = {
  date: string
  greeting: string
  todayFocus?: string
  importantTasks: Array<{ id: string; title: string; reason: string }>
  availableFocusMinutes: number
  suggestedChanges: Array<{ taskId: string; suggestion: string }>
  riskLevel: 'bajo' | 'medio' | 'alto'
  recommendation: string
  weeklyProgress: number
  missingSources: string[]
}

export type ExecutiveAnalytics = {
  todayScore: number
  weeklyScore: number
  productivityTrend: number[]
  focusMinutes: number
  completionRate: number
  energyDistribution: Record<EnergyLevel, number>
  deepWorkMinutes: number
  interruptions: number
  consistency: number
  predictionAccuracy?: number
  learningProgress: number
}

export type LearningProfile = {
  userId: string
  preferredPeriods: Record<string, string>
  idealBlockMinutes: number
  breakMinutes: number
  dailyLoadFactor: number
  fatigueFactor: number
  sampleSize: number
  updatedAt: string
}

export type RankedTask = { task: Task; decision: DecisionScore; energy: EnergyAssessment }
