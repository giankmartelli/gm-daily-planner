export type Priority = 'alta' | 'media' | 'baja'
export type Category = 'Trabajo' | 'Personal' | 'Estudio' | 'Salud' | 'Otras'
export type Recurrence = 'ninguna' | 'diaria' | 'semanal' | 'mensual'
export type EnergyLevel = 'baja' | 'media' | 'alta'
export type Flexibility = 'fija' | 'flexible'
export type PreferredPeriod = 'mañana' | 'tarde' | 'noche' | 'cualquiera'
export type ViewMode = 'dashboard' | 'tasks' | 'calendar' | 'focus' | 'reports'

export type Subtask = { id: string; title: string; completed: boolean }
export type Task = {
  id: string
  title: string
  completed: boolean
  priority: Priority
  category: Category
  tags: string[]
  subtasks: Subtask[]
  recurrence: Recurrence
  reminder?: string
  estimatedMinutes?: number
  dueDate?: string
  energyLevel?: EnergyLevel
  flexibility?: Flexibility
  preferredPeriod?: PreferredPeriod
  trackedMinutes: number
  createdAt: string
  importance?: number
  urgency?: number
  focusRequired?: number
  context?: string
  dependencies?: string[]
  repeatType?: Recurrence
  preferredDays?: number[]
  calendarLocked?: boolean
  movable?: boolean
  createdAutomatically?: boolean
  aiGenerated?: boolean
  completionScore?: number
  difficulty?: number
  interruptible?: boolean
  deepWork?: boolean
}
export type Habit = { id: string; name: string; completed: boolean }
export type Goal = { id: string; title: string; target: number; progress: number; unit: string }
export type TimeSession = { id: string; taskId?: string; minutes: number; date: string }
export type DayData = { tasks: Task[]; schedule: Record<string, string>; habits: Habit[]; notes: string }
export type WorkspaceData = { goals: Goal[]; sessions: TimeSession[] }

export const HOURS = Array.from({ length: 15 }, (_, index) => `${String(index + 7).padStart(2, '0')}:00`)
export const CATEGORIES: Category[] = ['Trabajo', 'Personal', 'Estudio', 'Salud', 'Otras']
export const emptyDay = (): DayData => ({ tasks: [], schedule: Object.fromEntries(HOURS.map((hour) => [hour, ''])), habits: [], notes: '' })
export const emptyWorkspace = (): WorkspaceData => ({ goals: [], sessions: [] })
export const toDateKey = (date: Date) => new Intl.DateTimeFormat('sv-SE').format(date)
export const todayKey = () => toDateKey(new Date())

export function normalizeTask(raw: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    id: raw.id,
    title: raw.title,
    completed: raw.completed ?? false,
    priority: raw.priority ?? 'media',
    category: raw.category ?? 'Otras',
    tags: raw.tags ?? [],
    subtasks: raw.subtasks ?? [],
    recurrence: raw.recurrence ?? 'ninguna',
    reminder: raw.reminder,
    estimatedMinutes: raw.estimatedMinutes ?? 30,
    dueDate: raw.dueDate,
    energyLevel: raw.energyLevel ?? 'media',
    flexibility: raw.flexibility ?? 'flexible',
    preferredPeriod: raw.preferredPeriod ?? 'cualquiera',
    trackedMinutes: raw.trackedMinutes ?? 0,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    importance: raw.importance ?? 0.5,
    urgency: raw.urgency ?? 0.5,
    focusRequired: raw.focusRequired ?? 0.5,
    context: raw.context ?? raw.category ?? 'Otras',
    dependencies: raw.dependencies ?? [],
    repeatType: raw.repeatType ?? raw.recurrence ?? 'ninguna',
    preferredDays: raw.preferredDays ?? [],
    calendarLocked: raw.calendarLocked ?? false,
    movable: raw.movable ?? true,
    createdAutomatically: raw.createdAutomatically ?? false,
    aiGenerated: raw.aiGenerated ?? false,
    completionScore: raw.completionScore ?? 0,
    difficulty: raw.difficulty ?? 0.5,
    interruptible: raw.interruptible ?? true,
    deepWork: raw.deepWork ?? false,
  }
}
