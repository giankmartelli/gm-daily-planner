export type EnergyRequired = 'Low' | 'Medium' | 'High'
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'
export type PreferredPeriod = 'morning' | 'afternoon' | 'evening' | 'any'
export type PlannerPriority = 'baja' | 'media' | 'alta' | 'critica'
export type PlannerStatus = 'inbox' | 'scheduled' | 'in_progress' | 'delayed' | 'completed' | 'cancelled'
export type EnergyLevel = 'baja' | 'media' | 'alta'
export type FocusLevel = 'bajo' | 'medio' | 'alto'

export type PlannerTask = {
  id: string
  userId: string
  title: string
  description?: string
  completed: boolean
  priority: PlannerPriority
  energyRequired: EnergyRequired
  estimatedMinutes: number
  remainingMinutes: number
  deadline?: string
  dueAt?: string | null
  earliestStartAt?: string | null
  fixedStartAt?: string | null
  energyLevel: EnergyLevel
  focusLevel: FocusLevel
  flexibility: 'fija' | 'flexible'
  importance: number
  urgency: number
  focusRequired: number
  context: string
  tags: string[]
  dependencies: string[]
  repeatType: RepeatType
  preferredPeriod: PreferredPeriod
  preferredDays: number[]
  calendarLocked: boolean
  movable: boolean
  createdAutomatically: boolean
  aiGenerated: boolean
  completionScore: number
  difficulty: number
  interruptible: boolean
  deepWork: boolean
  manualPriority: number
  createdAt: string
  updatedAt: string
  parentTaskId?: string | null
  status: PlannerStatus
  source: 'local' | 'google' | 'outlook'
  externalEventId?: string | null
  calendarAccountId?: string | null
  postponementCount: number
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export function normalizePlannerTask(task: Partial<PlannerTask> & Pick<PlannerTask, 'id' | 'title'>): PlannerTask {
  return {
    id: task.id,
    userId: task.userId ?? '',
    title: task.title,
    description: task.description,
    completed: task.completed ?? false,
    priority: task.priority ?? 'media',
    energyRequired: task.energyRequired ?? 'Medium',
    estimatedMinutes: Math.min(1440, Math.max(5, task.estimatedMinutes ?? 30)),
    remainingMinutes: Math.min(1440, Math.max(5, task.remainingMinutes ?? task.estimatedMinutes ?? 30)),
    deadline: task.deadline,
    dueAt: task.dueAt ?? task.deadline ?? null,
    earliestStartAt: task.earliestStartAt ?? null,
    fixedStartAt: task.fixedStartAt ?? null,
    energyLevel: task.energyLevel ?? 'media',
    focusLevel: task.focusLevel ?? 'medio',
    flexibility: task.flexibility ?? 'flexible',
    importance: clamp01(task.importance ?? .5),
    urgency: clamp01(task.urgency ?? .5),
    focusRequired: clamp01(task.focusRequired ?? .5),
    context: task.context ?? 'general',
    tags: task.tags ?? [],
    dependencies: task.dependencies ?? [],
    repeatType: task.repeatType ?? 'none',
    preferredPeriod: task.preferredPeriod ?? 'any',
    preferredDays: task.preferredDays ?? [],
    calendarLocked: task.calendarLocked ?? false,
    movable: task.movable ?? true,
    createdAutomatically: task.createdAutomatically ?? false,
    aiGenerated: task.aiGenerated ?? false,
    completionScore: clamp01(task.completionScore ?? 0),
    difficulty: clamp01(task.difficulty ?? .5),
    interruptible: task.interruptible ?? true,
    deepWork: task.deepWork ?? false,
    manualPriority: clamp01(task.manualPriority ?? .5),
    createdAt: task.createdAt ?? new Date(0).toISOString(),
    updatedAt: task.updatedAt ?? task.createdAt ?? new Date(0).toISOString(),
    parentTaskId: task.parentTaskId ?? null,
    status: task.status ?? (task.completed ? 'completed' : 'inbox'),
    source: task.source ?? 'local',
    externalEventId: task.externalEventId ?? null,
    calendarAccountId: task.calendarAccountId ?? null,
    postponementCount: Math.max(0, Math.floor(task.postponementCount ?? 0)),
  }
}
