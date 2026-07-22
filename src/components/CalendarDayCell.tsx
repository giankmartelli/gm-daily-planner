import { Flame } from 'lucide-react'
import { toDateKey, todayKey, type DayData } from '../domain/models'
import { CalendarEventPill } from './CalendarEventPill'
import { calendarItems } from './calendarTypes'

type Props = { date: Date; cursor: Date; selected: string; day: DayData; onSelect: (key: string) => void }

export function CalendarDayCell({ date, cursor, selected, day, onSelect }: Props) {
  const key = toDateKey(date)
  const isToday = key === todayKey()
  const isSelected = key === selected
  const outside = date.getMonth() !== cursor.getMonth()
  const weekend = date.getDay() === 0 || date.getDay() === 6
  const items = calendarItems(day)
  const completed = day.tasks.length ? Math.round(day.tasks.filter((task) => task.completed).length / day.tasks.length * 100) : 0
  const label = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  return <button className={`calendar-day-cell ${outside ? 'outside' : ''} ${weekend ? 'weekend' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => onSelect(key)} aria-label={`${label}${items.length ? `, ${items.length} elementos` : ', sin elementos'}`} aria-current={isToday ? 'date' : undefined}>
    <span className="calendar-day-number"><b>{date.getDate()}</b>{isToday && <small>Hoy</small>}</span>
    <span className="calendar-cell-events">{items.slice(0, 3).map((item) => <CalendarEventPill key={item.id} item={item} compact/>)}{items.length > 3 && <em>+{items.length - 3} más</em>}</span>
    <span className="calendar-cell-status">{completed > 0 && <span title={`${completed}% de tareas completadas`}><i style={{ '--progress': `${completed}%` } as React.CSSProperties}/>{completed}%</span>}{day.habits.some((habit) => habit.completed) && <span title="Hábitos completados"><Flame size={10}/>{day.habits.filter((habit) => habit.completed).length}</span>}</span>
  </button>
}
