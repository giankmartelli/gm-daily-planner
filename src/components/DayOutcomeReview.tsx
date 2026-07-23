import { useState, type FormEvent } from 'react'
import { ClipboardCheck, X } from 'lucide-react'
import type { EnergyLevel, Task } from '../domain/models'
import type { PlanOutcome } from '../ai-planning/domain'

type Props = { tasks: Task[]; appliedPlanId?: string; onSubmit: (outcome: PlanOutcome) => void }

export function DayOutcomeReview({ tasks, appliedPlanId, onSubmit }: Props) {
  const [open, setOpen] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])
  const [postponed, setPostponed] = useState<string[]>([])
  const [actual, setActual] = useState<Record<string, number>>({})
  const [energy, setEnergy] = useState<EnergyLevel>('media')
  const [realistic, setRealistic] = useState(true)
  const [useful, setUseful] = useState(true)
  const [failureReason, setFailureReason] = useState('')
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4)
  const [notes, setNotes] = useState('')
  const toggle = (values: string[], id: string, set: (value: string[]) => void) => set(values.includes(id) ? values.filter((value) => value !== id) : [...values, id])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ id: crypto.randomUUID(), appliedPlanId: appliedPlanId ?? `day:${new Date().toISOString().slice(0, 10)}`, completedTaskIds: completed, postponedTaskIds: postponed, actualMinutes: actual, energy, realistic, usefulRecommendationIds: useful ? ['plan'] : [], rejectedRecommendationIds: useful ? [] : ['plan'], failureReason: failureReason || undefined, rating, notes: notes.trim() || undefined, recordedAt: new Date().toISOString() })
    setOpen(false)
  }
  return <>
    <button className="outcome-trigger" onClick={() => setOpen(true)}><ClipboardCheck size={16}/>Revisar mi día</button>
    {open && <div className="modal-shade" onMouseDown={() => setOpen(false)}><form className="outcome-modal" role="dialog" aria-modal="true" aria-labelledby="outcome-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="smart-planner-close" aria-label="Cerrar revisión" onClick={() => setOpen(false)}><X size={16}/></button>
      <p>REVISIÓN EN MENOS DE 60 SEGUNDOS</p><h2 id="outcome-title">¿Cómo resultó tu plan?</h2>
      <div className="outcome-tasks">{tasks.map((task) => <fieldset key={task.id}><legend>{task.title}</legend><label><input type="checkbox" checked={completed.includes(task.id)} onChange={() => toggle(completed, task.id, setCompleted)}/>Completada</label><label><input type="checkbox" checked={postponed.includes(task.id)} onChange={() => toggle(postponed, task.id, setPostponed)}/>Pospuesta</label><label>Minutos reales<input type="number" min="0" max="1440" value={actual[task.id] ?? ''} onChange={(event) => setActual((current) => ({ ...current, [task.id]: Number(event.target.value) }))}/></label></fieldset>)}</div>
      <div className="outcome-grid"><label>Energía real<select value={energy} onChange={(event) => setEnergy(event.target.value as EnergyLevel)}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label><label>¿Fue realista?<select value={realistic ? 'si' : 'no'} onChange={(event) => setRealistic(event.target.value === 'si')}><option value="si">Sí</option><option value="no">No</option></select></label><label>¿Fue útil?<select value={useful ? 'si' : 'no'} onChange={(event) => setUseful(event.target.value === 'si')}><option value="si">Sí</option><option value="no">No</option></select></label><label>Calificación<select value={rating} onChange={(event) => setRating(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <label>Motivo de incumplimiento<input maxLength={160} value={failureReason} onChange={(event) => setFailureReason(event.target.value)} placeholder="Opcional"/></label>
      <label>Comentario<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional"/></label>
      <button className="apply-plan" type="submit">Guardar revisión</button>
    </form></div>}
  </>
}
