import { CheckCircle2, Clock3, Layers3 } from 'lucide-react'
import type { DayData } from '../domain/models'

export function CalendarDaySummary({ day }: { day: DayData }) {
  const blocks = Object.values(day.schedule).filter((value) => value.trim()).length
  const pending = day.tasks.filter((task) => !task.completed).length
  const free = Math.max(0, 15 - blocks)
  return <div className="calendar-day-summary" aria-label="Resumen del día">
    <span><Layers3 size={14}/><strong>{blocks}</strong><small>bloques</small></span>
    <span><Clock3 size={14}/><strong>{free} h</strong><small>disponibles</small></span>
    <span><CheckCircle2 size={14}/><strong>{pending}</strong><small>pendientes</small></span>
  </div>
}
