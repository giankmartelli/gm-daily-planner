import { BrainCircuit, CalendarRange, Check, Circle } from 'lucide-react'
import type { CalendarItem } from './calendarTypes'

export function CalendarEventPill({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
  const label = `${item.time ? `${item.time}, ` : ''}${item.title}${item.category ? `, ${item.category}` : ''}`
  const Icon = item.kind === 'focus' ? BrainCircuit : item.kind === 'event' ? CalendarRange : item.completed ? Check : Circle
  return <span className={`calendar-event ${item.kind} ${item.category?.toLowerCase() ?? ''} ${item.completed ? 'completed' : ''} ${compact ? 'compact' : ''}`} title={label} aria-label={label}>
    <Icon size={compact ? 9 : 11}/><span>{item.time && !compact ? <time>{item.time}</time> : null}{item.title}</span>
  </span>
}
