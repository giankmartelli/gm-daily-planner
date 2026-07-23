export type EnergyRequired = 'Low' | 'Medium' | 'High'
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'
export type PreferredPeriod = 'morning' | 'afternoon' | 'evening' | 'any'

export type PlannerTask = {
  id: string
  title: string
  completed: boolean
  energyRequired: EnergyRequired
  estimatedMinutes: number
  deadline?: string
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
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export function normalizePlannerTask(task: Partial<PlannerTask> & Pick<PlannerTask, 'id' | 'title'>): PlannerTask {
  return {
    id: task.id,
    title: task.title,
    completed: task.completed ?? false,
    energyRequired: task.energyRequired ?? 'Medium',
    estimatedMinutes: Math.min(1440, Math.max(5, task.estimatedMinutes ?? 30)),
    deadline: task.deadline,
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
  }
}
