import type { Category, DayData, Task } from '../domain/models'

export type CalendarView = 'mes' | 'semana' | 'dia'
export type CalendarItemKind = 'task' | 'event' | 'focus' | 'habit'

export type CalendarItem = {
  id: string
  title: string
  kind: CalendarItemKind
  category?: Category
  time?: string
  completed?: boolean
}

export type CalendarDataSource = (key: string) => DayData

export function calendarItems(day: DayData): CalendarItem[] {
  const tasks = day.tasks.map((task: Task) => ({
    id: task.id,
    title: task.title,
    kind: 'task' as const,
    category: task.category,
    time: task.reminder,
    completed: task.completed,
  }))
  const blocks = Object.entries(day.schedule)
    .filter(([, title]) => title.trim())
    .map(([time, title]) => ({
      id: `${time}:${title}`,
      title,
      time,
      kind: /foco|pomodoro|concentr/i.test(title) ? 'focus' as const : 'event' as const,
    }))
  return [...blocks, ...tasks]
}

export const dateLabel = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-ES', options).format(date).replace(/\bde\b/g, '').replace(/\s+/g, ' ').trim()
