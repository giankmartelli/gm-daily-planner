import { CalendarClock, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { EnergyLevel, Task } from '../domain/models'
import { createSmartPlan, type PlannedBlock, type SmartPlan } from '../domain/smartPlanner'

type Props = {
  tasks: Task[]
  schedule: Record<string, string>
  date: string
  onApply: (blocks: PlannedBlock[]) => void
}

export function SmartPlannerPanel({ tasks, schedule, date, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [availableFrom, setAvailableFrom] = useState('08:00')
  const [availableUntil, setAvailableUntil] = useState('18:00')
  const [energyPreference, setEnergyPreference] = useState<EnergyLevel>('media')
  const [proposal, setProposal] = useState<SmartPlan | null>(null)

  const close = () => { setOpen(false); setProposal(null) }
  const generate = () => setProposal(createSmartPlan({ tasks, schedule, date, availableFrom, availableUntil, energyPreference }))
  const apply = () => {
    if (!proposal?.blocks.length) return
    onApply(proposal.blocks)
    close()
  }

  return <>
    <button className="smart-planner-trigger" onClick={() => setOpen(true)}><Sparkles size={16}/>Planificar mi día</button>
    {open && <div className="modal-shade" onMouseDown={close}>
      <section className="smart-planner-modal" role="dialog" aria-modal="true" aria-labelledby="smart-planner-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="smart-planner-close" onClick={close} aria-label="Cerrar planificador"><X size={17}/></button>
        <div className="smart-planner-heading"><span><CalendarClock size={20}/></span><div><p>PLANIFICADOR INTELIGENTE V1</p><h2 id="smart-planner-title">Diseña un día realista</h2><small>La propuesta no modificará tu agenda hasta que la confirmes.</small></div></div>
        <div className="planner-settings">
          <label>Hora de inicio disponible<input aria-label="Hora de inicio disponible" type="time" value={availableFrom} onChange={(event) => { setAvailableFrom(event.target.value); setProposal(null) }}/></label>
          <label>Hora de finalización<input aria-label="Hora de finalización" type="time" value={availableUntil} onChange={(event) => { setAvailableUntil(event.target.value); setProposal(null) }}/></label>
          <label>Nivel de energía<select aria-label="Nivel de energía" value={energyPreference} onChange={(event) => { setEnergyPreference(event.target.value as EnergyLevel); setProposal(null) }}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label>
        </div>
        <button className="generate-plan" onClick={generate}><Sparkles size={15}/>Generar propuesta</button>

        {proposal && <div className="planner-result" aria-live="polite">
          <div className="planner-summary"><strong>{proposal.totalPlannedMinutes} min planificados</strong><span>{proposal.blocks.length} bloques · {proposal.unscheduledTasks.length} pendientes</span></div>
          <div className="planned-blocks">
            {proposal.blocks.map((block) => <article key={block.taskId}><time>{block.startTime}<span>— {block.endTime}</span></time><div><strong>{block.title}</strong><p>{block.reason}</p></div><button aria-label={`Eliminar bloque ${block.title}`} onClick={() => setProposal((current) => current ? { ...current, blocks: current.blocks.filter((item) => item.taskId !== block.taskId), totalPlannedMinutes: current.totalPlannedMinutes - block.durationMinutes } : current)}><Trash2 size={14}/></button></article>)}
            {!proposal.blocks.length && <p className="planner-empty">No hay tareas que encajen en ese horario.</p>}
          </div>
          {!!proposal.unscheduledTasks.length && <div className="unscheduled"><strong>No pudieron programarse</strong><ul>{proposal.unscheduledTasks.map((task) => <li key={task.id}>{task.title}</li>)}</ul></div>}
          {!!proposal.explanation.length && <details><summary>Ver criterios de la propuesta</summary><ul>{proposal.explanation.map((item) => <li key={item}>{item}</li>)}</ul></details>}
        </div>}
        <footer><button onClick={close}>Cancelar</button><button className="apply-plan" disabled={!proposal?.blocks.length} onClick={apply}>Aplicar a mi agenda</button></footer>
      </section>
    </div>}
  </>
}
