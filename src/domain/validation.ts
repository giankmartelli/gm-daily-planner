import { CATEGORIES, HOURS, emptyDay, normalizeTask, type DayData, type Habit, type WorkspaceData } from './models'

export const LIMITS = { task: 160, subtask: 120, habit: 80, goal: 120, note: 5000, schedule: 160, tag: 24, tags: 8 } as const
export const cleanText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export function sanitizeDay(value: unknown): DayData {
  if (!value || typeof value !== 'object') return emptyDay()
  const raw = value as Partial<DayData>
  const tasks = Array.isArray(raw.tasks) ? raw.tasks.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as Record<string, unknown>
    const title = cleanText(candidate.title, LIMITS.task)
    if (!title) return []
    const normalized = normalizeTask({ ...candidate, id: cleanText(candidate.id, 120) || crypto.randomUUID(), title } as Parameters<typeof normalizeTask>[0])
    return [{ ...normalized, category: CATEGORIES.includes(normalized.category) ? normalized.category : 'Otras', tags: normalized.tags.map((tag) => cleanText(tag, LIMITS.tag)).filter(Boolean).slice(0, LIMITS.tags), subtasks: normalized.subtasks.flatMap((subtask) => { const subTitle = cleanText(subtask.title, LIMITS.subtask); return subTitle ? [{ ...subtask, id: cleanText(subtask.id, 120) || crypto.randomUUID(), title: subTitle, completed: Boolean(subtask.completed) }] : [] }), estimatedMinutes: Math.min(1440, Math.max(5, Number(normalized.estimatedMinutes) || 25)), trackedMinutes: Math.min(100000, Math.max(0, Number(normalized.trackedMinutes) || 0)) }]
  }) : []
  const schedule = { ...emptyDay().schedule }
  if (raw.schedule && typeof raw.schedule === 'object') HOURS.forEach((hour) => { schedule[hour] = cleanText(raw.schedule?.[hour], LIMITS.schedule) })
  const habits: Habit[] = Array.isArray(raw.habits) ? raw.habits.flatMap((item) => { const name = cleanText(item?.name, LIMITS.habit); return name ? [{ id: cleanText(item.id, 120) || crypto.randomUUID(), name, completed: Boolean(item.completed) }] : [] }).slice(0, 50) : []
  return { tasks: tasks.slice(0, 1000), schedule, habits, notes: typeof raw.notes === 'string' ? raw.notes.slice(0, LIMITS.note) : '' }
}

export function sanitizeWorkspace(value: unknown): WorkspaceData {
  if (!value || typeof value !== 'object') return { goals: [], sessions: [] }
  const raw = value as Partial<WorkspaceData>
  return {
    goals: Array.isArray(raw.goals) ? raw.goals.flatMap((goal) => { const title = cleanText(goal?.title, LIMITS.goal); return title ? [{ id: cleanText(goal.id, 120) || crypto.randomUUID(), title, target: Math.max(1, Number(goal.target) || 1), progress: Math.max(0, Number(goal.progress) || 0), unit: cleanText(goal.unit, 30) || 'sesiones' }] : [] }).slice(0, 100) : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions.filter((session) => session && typeof session.date === 'string').map((session) => ({ id: cleanText(session.id, 120) || crypto.randomUUID(), taskId: session.taskId ? cleanText(session.taskId, 120) : undefined, minutes: Math.min(1440, Math.max(1, Number(session.minutes) || 1)), date: cleanText(session.date, 10) })).slice(-5000) : [],
  }
}
