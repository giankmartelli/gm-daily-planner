import type { DayData, TimeSession } from './models'

export type AnalyticsPoint = {
  date: string
  score: number
  completed: number
  pending: number
  overdue: number
  deepMinutes: number
  shallowMinutes: number
  lostMinutes: number
}

export type ProductivityAnalytics = {
  points: AnalyticsPoint[]
  today: AnalyticsPoint
  weeklyAverage: number
  monthlyAverage: number
  annualAverage: number
  completed: number
  pending: number
  overdue: number
  focusedMinutes: number
  deepMinutes: number
  shallowMinutes: number
  lostMinutes: number
  bestDay: AnalyticsPoint
  worstDay: AnalyticsPoint
  activeDays: number
}

type Input = {
  selectedDate: string
  getDay: (date: string) => DayData
  sessions: TimeSession[]
  days?: number
}

const dateKey = (date: Date) => new Intl.DateTimeFormat('sv-SE').format(date)
const average = (points: AnalyticsPoint[]) => Math.round(points.reduce((sum, point) => sum + point.score, 0) / Math.max(1, points.length))

export function buildProductivityAnalytics({ selectedDate, getDay, sessions, days = 365 }: Input): ProductivityAnalytics {
  const points = Array.from({ length: days }, (_, index): AnalyticsPoint => {
    const cursor = new Date(`${selectedDate}T12:00:00`)
    cursor.setDate(cursor.getDate() - (days - 1 - index))
    const date = dateKey(cursor)
    const day = getDay(date)
    const completed = day.tasks.filter((task) => task.completed).length
    const pending = day.tasks.length - completed
    const overdue = day.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < selectedDate).length
    const habitCompleted = day.habits.filter((habit) => habit.completed).length
    const total = day.tasks.length + day.habits.length
    const score = total ? Math.round((completed + habitCompleted) / total * 100) : 0
    const taskMinutes = day.tasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
    const sessionMinutes = sessions.filter((session) => session.date === date).reduce((sum, session) => sum + session.minutes, 0)
    const focusedMinutes = taskMinutes + sessionMinutes
    const deepMinutes = day.tasks.filter((task) => task.deepWork || (task.focusRequired ?? 0) >= .75).reduce((sum, task) => sum + task.trackedMinutes, 0)
    const lostMinutes = day.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate <= date).reduce((sum, task) => sum + (task.estimatedMinutes ?? 30), 0)
    return { date, score, completed, pending, overdue, deepMinutes, shallowMinutes: Math.max(0, focusedMinutes - deepMinutes), lostMinutes }
  })
  const active = points.filter((point) => point.completed + point.pending > 0)
  const today = points.at(-1)!
  const bestDay = active.reduce((best, point) => point.score > best.score ? point : best, active[0] ?? today)
  const worstDay = active.reduce((worst, point) => point.score < worst.score ? point : worst, active[0] ?? today)
  const sum = (key: 'completed' | 'pending' | 'overdue' | 'deepMinutes' | 'shallowMinutes' | 'lostMinutes') => points.reduce((total, point) => total + point[key], 0)
  const deepMinutes = sum('deepMinutes')
  const shallowMinutes = sum('shallowMinutes')
  return {
    points,
    today,
    weeklyAverage: average(points.slice(-7)),
    monthlyAverage: average(points.slice(-30)),
    annualAverage: average(points),
    completed: sum('completed'),
    pending: today.pending,
    overdue: today.overdue,
    focusedMinutes: deepMinutes + shallowMinutes,
    deepMinutes,
    shallowMinutes,
    lostMinutes: sum('lostMinutes'),
    bestDay,
    worstDay,
    activeDays: active.length,
  }
}

export function analyticsToCsv(analytics: ProductivityAnalytics) {
  const header = 'fecha,cumplimiento,tareas_completadas,pendientes,retrasadas,minutos_profundos,minutos_superficiales,minutos_perdidos'
  const rows = analytics.points.map((point) => [point.date, point.score, point.completed, point.pending, point.overdue, point.deepMinutes, point.shallowMinutes, point.lostMinutes].join(','))
  return [header, ...rows].join('\n')
}
