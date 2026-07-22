import type { CalendarView } from './calendarTypes'

export function CalendarViewSwitcher({ view, onChange }: { view: CalendarView; onChange: (view: CalendarView) => void }) {
  return <div className="calendar-view-switcher" role="group" aria-label="Vista del calendario">
    {(['mes', 'semana', 'dia'] as CalendarView[]).map((item) => <button key={item} className={view === item ? 'active' : ''} aria-pressed={view === item} onClick={() => onChange(item)}>{item === 'dia' ? 'Día' : `${item[0].toUpperCase()}${item.slice(1)}`}</button>)}
  </div>
}
