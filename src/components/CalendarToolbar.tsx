import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarView } from './calendarTypes'
import { CalendarViewSwitcher } from './CalendarViewSwitcher'

type Props = {
  cursor: Date
  selected: string
  view: CalendarView
  onView: (view: CalendarView) => void
  onMove: (amount: number) => void
  onToday: () => void
  onNewTask: () => void
}

export function CalendarToolbar({ cursor, selected, view, onView, onMove, onToday, onNewTask }: Props) {
  const month = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(cursor).replace(' de ', ' ')
  const currentDate = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${selected}T12:00:00`))
  return <header className="calendar-page-toolbar">
    <div className="calendar-title-group"><div><h1>Calendario</h1><span>{currentDate}</span></div><strong>{month}</strong></div>
    <div className="calendar-toolbar-actions">
      <CalendarViewSwitcher view={view} onChange={onView}/>
      <button className="calendar-today" onClick={onToday}>Hoy</button>
      <div className="calendar-nav" role="group" aria-label="Navegar calendario"><button onClick={() => onMove(-1)} aria-label="Periodo anterior"><ChevronLeft size={17}/></button><button onClick={() => onMove(1)} aria-label="Periodo siguiente"><ChevronRight size={17}/></button></div>
      <button className="calendar-new-task" onClick={onNewTask}><Plus size={16}/>Nueva tarea</button>
    </div>
  </header>
}
