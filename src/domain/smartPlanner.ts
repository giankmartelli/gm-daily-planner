import type { EnergyLevel, PreferredPeriod, Task } from './models'

export type PlannedBlock = {
  taskId: string
  title: string
  startTime: string
  endTime: string
  durationMinutes: number
  reason: string
}

export type SmartPlan = {
  blocks: PlannedBlock[]
  unscheduledTasks: Task[]
  totalPlannedMinutes: number
  explanation: string[]
}

export type SmartPlannerInput = {
  tasks: Task[]
  schedule: Record<string, string>
  date: string
  availableFrom: string
  availableUntil: string
  energyPreference: EnergyLevel
}

type Interval = { start: number; end: number }
const priorityRank = { alta: 0, media: 1, baja: 2 } as const
const periodBounds: Record<Exclude<PreferredPeriod, 'cualquiera'>, Interval> = {
  mañana: { start: 0, end: 12 * 60 },
  tarde: { start: 12 * 60, end: 18 * 60 },
  noche: { start: 18 * 60, end: 24 * 60 },
}

function toMinutes(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return Number.NaN
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? minutes : Number.NaN
}

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function durationOf(task: Task) {
  return Math.min(1440, Math.max(5, Number(task.estimatedMinutes) || 30))
}

function gapsBetween(from: number, until: number, occupied: Interval[]) {
  const sorted = occupied
    .map(({ start, end }) => ({ start: Math.max(from, start), end: Math.min(until, end) }))
    .filter(({ start, end }) => start < end)
    .sort((left, right) => left.start - right.start)
  const gaps: Interval[] = []
  let cursor = from
  for (const interval of sorted) {
    if (interval.start > cursor) gaps.push({ start: cursor, end: interval.start })
    cursor = Math.max(cursor, interval.end)
  }
  if (cursor < until) gaps.push({ start: cursor, end: until })
  return gaps
}

function fitTask(task: Task, gaps: Interval[], duration: number) {
  const preferred = task.preferredPeriod ?? 'cualquiera'
  const ordered = preferred === 'cualquiera'
    ? gaps
    : [...gaps].sort((left, right) => {
        const bounds = periodBounds[preferred]
        const leftMatch = left.start < bounds.end && left.end > bounds.start ? 0 : 1
        const rightMatch = right.start < bounds.end && right.end > bounds.start ? 0 : 1
        return leftMatch - rightMatch || left.start - right.start
      })
  for (const gap of ordered) {
    const bounds = preferred === 'cualquiera' ? gap : periodBounds[preferred]
    const start = Math.max(gap.start, bounds.start)
    const endLimit = Math.min(gap.end, bounds.end)
    if (start + duration <= endLimit) return start
  }
  if ((task.flexibility ?? 'flexible') === 'fija' || preferred === 'cualquiera') return null
  return gaps.find((gap) => gap.end - gap.start >= duration)?.start ?? null
}

export function createSmartPlan({ tasks, schedule, date, availableFrom, availableUntil, energyPreference }: SmartPlannerInput): SmartPlan {
  const from = toMinutes(availableFrom), until = toMinutes(availableUntil)
  if (!Number.isFinite(from) || !Number.isFinite(until) || from >= until) {
    return { blocks: [], unscheduledTasks: tasks.filter((task) => !task.completed), totalPlannedMinutes: 0, explanation: ['El horario disponible no es válido.'] }
  }

  const candidates = tasks.filter((task) => !task.completed)
  const byTitle = new Map(candidates.map((task) => [task.title.trim().toLocaleLowerCase(), task]))
  const occupied: Interval[] = Object.entries(schedule).flatMap(([time, activity]) => {
    if (!activity.trim()) return []
    const start = toMinutes(time)
    if (!Number.isFinite(start)) return []
    const matchingTask = byTitle.get(activity.trim().toLocaleLowerCase())
    return [{ start, end: Math.min(24 * 60, start + (matchingTask ? durationOf(matchingTask) : 60)) }]
  })

  candidates.sort((left, right) => {
    const leftOverdue = left.dueDate && left.dueDate < date ? 0 : 1
    const rightOverdue = right.dueDate && right.dueDate < date ? 0 : 1
    const leftDue = left.dueDate ?? '9999-12-31', rightDue = right.dueDate ?? '9999-12-31'
    const leftEnergy = (left.energyLevel ?? 'media') === energyPreference ? 0 : 1
    const rightEnergy = (right.energyLevel ?? 'media') === energyPreference ? 0 : 1
    return leftOverdue - rightOverdue
      || leftDue.localeCompare(rightDue)
      || priorityRank[left.priority] - priorityRank[right.priority]
      || leftEnergy - rightEnergy
      || durationOf(left) - durationOf(right)
      || left.createdAt.localeCompare(right.createdAt)
  })

  const blocks: PlannedBlock[] = [], unscheduledTasks: Task[] = [], explanation: string[] = []
  for (const task of candidates) {
    const duration = durationOf(task)
    const start = fitTask(task, gapsBetween(from, until, occupied), duration)
    if (start === null) { unscheduledTasks.push(task); continue }
    const overdue = task.dueDate && task.dueDate < date
    const energyMatch = (task.energyLevel ?? 'media') === energyPreference
    const reason = overdue
      ? 'Se priorizó porque está vencida.'
      : task.dueDate ? `Se priorizó por su vencimiento (${task.dueDate}).`
      : task.priority === 'alta' ? 'Se priorizó por su prioridad alta.'
      : energyMatch ? `Coincide con tu energía ${energyPreference}.`
      : 'Encaja en el siguiente espacio disponible.'
    blocks.push({ taskId: task.id, title: task.title, startTime: toTime(start), endTime: toTime(start + duration), durationMinutes: duration, reason })
    occupied.push({ start, end: start + duration })
    explanation.push(`${task.title}: ${reason}`)
  }

  if (unscheduledTasks.length) explanation.push(`${unscheduledTasks.length} tarea(s) quedaron fuera por falta de tiempo compatible.`)
  return { blocks: blocks.sort((a, b) => a.startTime.localeCompare(b.startTime)), unscheduledTasks, totalPlannedMinutes: blocks.reduce((total, block) => total + block.durationMinutes, 0), explanation }
}

export function applySmartPlan(schedule: Record<string, string>, blocks: PlannedBlock[]) {
  const next = { ...schedule }
  for (const block of blocks) if (!next[block.startTime]?.trim()) next[block.startTime] = block.title
  return next
}
