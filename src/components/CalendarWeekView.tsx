import { HOURS, toDateKey } from '../domain/models'
import type { CalendarDataSource } from './calendarTypes'

export function CalendarWeekView({ days, getDay, onSelect }: { days: Date[]; getDay: CalendarDataSource; onSelect: (key: string) => void }) {
  const now = new Date()
  const currentHour = now.getHours()
  return <div className="calendar-week" role="grid" aria-label="Calendario semanal">
    <div className="calendar-week-head"><span/><>{days.map((date) => <button key={toDateKey(date)} onClick={() => onSelect(toDateKey(date))}><small>{new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date)}</small><strong>{date.getDate()}</strong></button>)}</></div>
    <div className="calendar-week-body">{HOURS.map((hour) => <div className={`calendar-week-row ${Number(hour.slice(0, 2)) === currentHour ? 'current' : ''}`} key={hour}><time>{hour}</time>{days.map((date) => { const day = getDay(toDateKey(date)); const value = day.schedule[hour]; return <button key={toDateKey(date)} onClick={() => onSelect(toDateKey(date))} aria-label={`${hour}, ${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' }).format(date)}${value ? `, ${value}` : ', libre'}`}>{value && <span className={/foco|pomodoro|concentr/i.test(value) ? 'focus' : ''}>{value}</span>}</button> })}</div>)}</div>
  </div>
}
