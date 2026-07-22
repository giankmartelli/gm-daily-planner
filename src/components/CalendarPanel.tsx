import { useMemo, useState } from 'react'
import { toDateKey, todayKey, type DayData } from '../domain/models'
import { CalendarAgendaPanel } from './CalendarAgendaPanel'
import { CalendarEventPill } from './CalendarEventPill'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { CalendarToolbar } from './CalendarToolbar'
import { CalendarWeekView } from './CalendarWeekView'
import { calendarItems, type CalendarDataSource, type CalendarView } from './calendarTypes'

type Props = { selected: string; day: DayData; getDay: CalendarDataSource; onSelect: (key: string) => void; onSchedule: (hour: string, value: string) => void; onNewTask: () => void }

export function CalendarPanel({ selected, day, getDay, onSelect, onSchedule, onNewTask }: Props) {
  const [cursor, setCursor] = useState(() => new Date(`${selected}T12:00:00`))
  const [view, setView] = useState<CalendarView>('mes')
  const days = useMemo(() => {
    if (view !== 'mes') {
      const start = new Date(cursor); start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7))
      return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const start = new Date(first); start.setDate(1 - offset)
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
  }, [cursor, view])
  const move = (amount: number) => setCursor((date) => { const next = new Date(date); if (view === 'mes') next.setMonth(next.getMonth() + amount); else if (view === 'semana') next.setDate(next.getDate() + amount * 7); else next.setDate(next.getDate() + amount); return next })
  const today = () => { const now = new Date(); setCursor(now); onSelect(todayKey()) }
  const select = (key: string) => { setCursor(new Date(`${key}T12:00:00`)); onSelect(key) }
  const selectedItems = calendarItems(day)

  return <section className="calendar-workspace">
    <CalendarToolbar cursor={cursor} selected={selected} view={view} onView={setView} onMove={move} onToday={today} onNewTask={onNewTask}/>
    <div className="calendar-mobile-strip" aria-label="Seleccionar día">{days.slice(0, 7).map((date) => { const key = toDateKey(date); return <button key={key} className={key === selected ? 'active' : ''} onClick={() => select(key)} aria-current={key === todayKey() ? 'date' : undefined}><small>{new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).slice(0, 2)}</small><strong>{date.getDate()}</strong></button> })}</div>
    <div className="calendar-layout-premium">
      <div className="calendar-main panel">
        {view === 'mes' && <CalendarMonthGrid days={days} cursor={cursor} selected={selected} getDay={getDay} onSelect={select}/>}
        {view === 'semana' && <CalendarWeekView days={days} getDay={getDay} onSelect={select}/>}
        {view === 'dia' && <div className="calendar-day-view"><div><p>Plan del día</p><h2>{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selected}T12:00:00`))}</h2></div><div className="calendar-day-items">{selectedItems.map((item) => <CalendarEventPill key={item.id} item={item}/>)}{!selectedItems.length && <p>Un día abierto para planificar con intención.</p>}</div></div>}
      </div>
      <CalendarAgendaPanel selected={selected} day={day} onSchedule={onSchedule}/>
    </div>
  </section>
}
