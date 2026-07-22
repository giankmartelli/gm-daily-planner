import { Plus } from 'lucide-react'

export function CalendarEmptySlot({ hour, value, onChange }: { hour: string; value: string; onChange: (value: string) => void }) {
  return <span className="calendar-empty-slot"><Plus size={13}/><input aria-label={`Actividad de las ${hour}`} value={value} maxLength={140} onChange={(event) => onChange(event.target.value)} placeholder="Añadir"/></span>
}
