import { MoreHorizontal } from 'lucide-react'
import { HOURS, type DayData } from '../domain/models'
import { CalendarDaySummary } from './CalendarDaySummary'
import { CalendarEmptySlot } from './CalendarEmptySlot'
import { CalendarEventPill } from './CalendarEventPill'
import { calendarItems } from './calendarTypes'

type Props = { selected: string; day: DayData; onSchedule: (hour: string, value: string) => void }

export function CalendarAgendaPanel({ selected, day, onSchedule }: Props) {
  const date = new Date(`${selected}T12:00:00`)
  const title = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  const times = [...new Set([...HOURS, ...Object.keys(day.schedule)])].sort()
  const pendingTasks = calendarItems(day).filter((item) => item.kind === 'task' && !item.completed)
  return <aside className="calendar-agenda panel" aria-label={`Agenda del ${title}`}>
    <header><div><p>Agenda del día</p><h2>{title}</h2></div><button aria-label="Más opciones de agenda"><MoreHorizontal size={18}/></button></header>
    <CalendarDaySummary day={day}/>
    {!!pendingTasks.length && <div className="calendar-agenda-tasks"><p>Por completar</p>{pendingTasks.slice(0, 3).map((item) => <CalendarEventPill key={item.id} item={item}/>)}{pendingTasks.length > 3 && <small>+{pendingTasks.length - 3} tareas más</small>}</div>}
    <div className="calendar-timeline">{times.map((hour) => {
      const value = day.schedule[hour] ?? ''
      return <label className={`calendar-time-row ${value ? 'occupied' : 'empty'}`} key={hour}><time>{hour}</time><i/><span className="calendar-time-content">{value ? <><input aria-label={`Actividad de las ${hour}`} value={value} maxLength={140} onChange={(event) => onSchedule(hour, event.target.value)}/><small>Bloque planificado</small></> : <CalendarEmptySlot hour={hour} value={value} onChange={(next) => onSchedule(hour, next)}/>}</span></label>
    })}</div>
  </aside>
}
