import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toDateKey, todayKey } from '../domain/models'

type Props = { selected: string; activeKeys: string[]; onSelect: (key: string) => void }

export function CalendarPanel({ selected, activeKeys, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => new Date(`${selected}T12:00:00`))
  const [view, setView] = useState<'mes' | 'semana'>('mes')
  const days = useMemo(() => {
    if (view === 'semana') {
      const start = new Date(cursor); start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7))
      return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const start = new Date(first); start.setDate(1 - offset)
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
  }, [cursor, view])
  const move = (amount: number) => setCursor((date) => { const next = new Date(date); if (view === 'mes') next.setMonth(next.getMonth() + amount); else next.setDate(next.getDate() + amount * 7); return next })

  return <section className="calendar-pro panel">
    <div className="calendar-toolbar"><div><h2>{new Intl.DateTimeFormat('es-ES', view === 'mes' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(cursor)}</h2><button onClick={() => { const now = new Date(); setCursor(now); onSelect(todayKey()) }}>Hoy</button></div><div className="segmented"><button className={view === 'mes' ? 'active' : ''} onClick={() => setView('mes')}>Mes</button><button className={view === 'semana' ? 'active' : ''} onClick={() => setView('semana')}>Semana</button></div><div className="calendar-nav"><button onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft size={16}/></button><button onClick={() => move(1)} aria-label="Siguiente"><ChevronRight size={16}/></button></div></div>
    <div className="weekday-row">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day) => <span key={day}>{day}</span>)}</div>
    <div className={`calendar-days ${view}`}>{days.map((date) => { const key = toDateKey(date); const other = view === 'mes' && date.getMonth() !== cursor.getMonth(); return <button key={key} className={`${key === selected ? 'selected' : ''} ${key === todayKey() ? 'today' : ''} ${other ? 'other' : ''}`} onClick={() => onSelect(key)}><span>{date.getDate()}</span>{activeKeys.includes(key) && <i />}</button> })}</div>
  </section>
}
