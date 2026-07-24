export type EnergyLevelV3 = 'muy_baja' | 'baja' | 'media' | 'alta' | 'muy_alta'
export type TaskAction = 'hacer_ahora' | 'posponer' | 'dividir' | 'eliminar' | 'delegar' | 'mover'
export type BlockSource = 'local' | 'google' | 'outlook' | 'fixed' | 'break' | 'lunch' | 'travel'

export type PlannerTaskV3 = {
  id: string
  title: string
  completed?: boolean
  priority?: 'baja' | 'media' | 'alta' | 'critica'
  importance?: number
  urgency?: number
  estimatedMinutes?: number
  dueAt?: string | null
  energyMinimum?: EnergyLevelV3
  energyIdeal?: EnergyLevelV3
  dependencies?: string[]
  context?: string
  frequency?: number
  postponementCount?: number
  complexity?: number
  preferredPeriods?: Array<'mañana' | 'tarde' | 'noche'>
  earliestStartAt?: string | null
  fixedStartAt?: string | null
  delegable?: boolean
  removable?: boolean
  parentTaskId?: string | null
}

export type PlannerHabitV3 = {
  id: string
  title: string
  durationMinutes: number
  preferredTime?: string
  energyMinimum?: EnergyLevelV3
  completed?: boolean
}

export type BusyBlock = {
  id: string
  title: string
  start: string
  end: string
  source: BlockSource
  immutable?: boolean
  recurrenceId?: string
}

export type EnergyForecastPoint = { start: string; end: string; level: EnergyLevelV3 }
export type WorkingHours = { start: string; end: string }
export type PlannerPreferences = {
  bufferMinutes: number
  minimumBreakMinutes: number
  lunch?: { start: string; end: string }
  travelBufferMinutes?: number
  preferredContextBatching?: boolean
}

export type ScoreWeights = {
  urgency: number
  deadline: number
  importance: number
  timeFit: number
  energy: number
  dependencies: number
  context: number
  frequency: number
  history: number
  postponements: number
  complexity: number
  remainingDay: number
}

export type TaskHistory = {
  taskId?: string
  context?: string
  plannedMinutes: number
  actualMinutes: number
  plannedStart?: string
  actualStart?: string
  completed: boolean
  cancelled?: boolean
  rescheduled?: boolean
  productivity?: number
}

export type StatisticalProfile = {
  sampleSize: number
  completionRate: number
  cancellationRate: number
  rescheduleRate: number
  averageProductivity: number
  durationByTask: Record<string, DurationEstimate>
  durationByContext: Record<string, DurationEstimate>
  preferredStartHour?: number
}

export type DurationEstimate = {
  predictedMinutes: number
  averageMinutes: number
  standardDeviation: number
  averageError: number
  sampleSize: number
  confidence: number
}

export type ScoreFactor = { key: keyof ScoreWeights; value: number; contribution: number; explanation: string }
export type TaskScore = { taskId: string; score: number; confidence: number; factors: ScoreFactor[] }

export type PlannedTask = {
  taskId: string
  title: string
  priority: number
  suggestedStart: string
  suggestedEnd: string
  reason: string
  confidence: number
  estimatedMinutes: number
  energyRequired: EnergyLevelV3
  alerts: string[]
  dependencies: string[]
  score: number
  factors: ScoreFactor[]
}

export type PlannerConflict = {
  type: 'overlap' | 'dependency' | 'energy' | 'capacity' | 'cycle'
  taskId?: string
  blockIds?: string[]
  explanation: string
}

export type PlannerSuggestion = {
  taskId: string
  action: TaskAction
  explanation: string
  score: number
  confidence: number
  factors: ScoreFactor[]
}

export type DailyPlan = {
  date: string
  orderedTasks: PlannedTask[]
  unscheduledTaskIds: string[]
  conflicts: PlannerConflict[]
  suggestions: PlannerSuggestion[]
  totalPlannedMinutes: number
  generatedAt: string
}

export type PlannerInput = {
  date: string
  now: string
  tasks: PlannerTaskV3[]
  subtasks?: PlannerTaskV3[]
  habits?: PlannerHabitV3[]
  timeBlocks?: BusyBlock[]
  calendarEvents?: BusyBlock[]
  externalEvents?: BusyBlock[]
  energyForecast?: EnergyForecastPoint[]
  workingHours: WorkingHours
  preferences?: Partial<PlannerPreferences>
  history?: TaskHistory[]
  weights?: Partial<ScoreWeights>
}

export type ReplanInput = PlannerInput & {
  previousPlan: DailyPlan
  newEvent: BusyBlock
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  urgency: 13, deadline: 14, importance: 13, timeFit: 8, energy: 11, dependencies: 10,
  context: 6, frequency: 4, history: 6, postponements: 5, complexity: 4, remainingDay: 6,
}

export const DEFAULT_PREFERENCES: PlannerPreferences = {
  bufferMinutes: 10,
  minimumBreakMinutes: 10,
  travelBufferMinutes: 0,
  preferredContextBatching: true,
}
