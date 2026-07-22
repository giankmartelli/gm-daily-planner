import type { DayData } from '../domain/models'
import { CalendarDayCell } from './CalendarDayCell'
import type { CalendarDataSource } from './calendarTypes'

type Props = { days: Date[]; cursor: Date; selected: string; getDay: CalendarDataSource; onSelect: (key: string) => void }

export function CalendarMonthGrid({ days, cursor, selected, getDay, onSelect }: Props) {
  return <div className="calendar-month" role="grid" aria-label="Calendario mensual">
    <div className="calendar-weekdays" role="row">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <span role="columnheader" key={day}>{day}</span>)}</div>
    <div className="calendar-month-days">{days.map((date) => {
      const key = new Intl.DateTimeFormat('sv-SE').format(date)
      return <CalendarDayCell key={key} date={date} cursor={cursor} selected={selected} day={getDay(key) as DayData} onSelect={onSelect}/>
    })}</div>
  </div>
}
