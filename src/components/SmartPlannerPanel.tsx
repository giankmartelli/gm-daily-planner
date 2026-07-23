import { CalendarClock, GripVertical, Lock, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { EnergyLevel, Task } from '../domain/models'
import type { PlannedBlock, SmartPlan } from '../domain/smartPlanner'
import { defaultPlanningProfile, fromLegacyTask, planner, type PlanResult } from '../planner'
import { adjustBlock, freeMinutes, reorderBlocks } from '../ai-planning/adjustments'
import { PlanRiskIndicator } from './PlanRiskIndicator'
import { PlanExplanation } from './PlanExplanation'

type Props = {
  tasks: Task[]
  schedule: Record<string, string>
  date: string
  onApply: (blocks: PlannedBlock[]) => void
}

const selectedEnergyLabel = (energy: EnergyLevel) => ({ baja: 'Low', media: 'Medium', alta: 'High' })[energy]

export function SmartPlannerPanel({ tasks, schedule, date, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [availableFrom, setAvailableFrom] = useState('08:00')
  const [availableUntil, setAvailableUntil] = useState('18:00')
  const [energyPreference, setEnergyPreference] = useState<EnergyLevel>('media')
  const [proposal, setProposal] = useState<SmartPlan | null>(null)
  const [intelligence, setIntelligence] = useState<PlanResult | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [adjustmentMessage, setAdjustmentMessage] = useState('')
  const [lockedEvents, setLockedEvents] = useState(() => new Set(Object.entries(schedule).filter(([, title]) => title.trim()).map(([time]) => time)))
  useEffect(() => {
    const openPlanner = () => setOpen(true)
    window.addEventListener('gm:open-planner', openPlanner)
    return () => window.removeEventListener('gm:open-planner', openPlanner)
  }, [])

  const close = () => { setOpen(false); setProposal(null); setIntelligence(null) }
  const generate = () => {
    const profile = defaultPlanningProfile()
    profile.workingHours = { from: availableFrom, until: availableUntil }
    const selectedEnergy = { baja: 'Low', media: 'Medium', alta: 'High' }[energyPreference] as 'Low' | 'Medium' | 'High'
    profile.energyCurve = [{ from: availableFrom, until: availableUntil, energy: selectedEnergy }]
    const events = Object.entries(schedule).flatMap(([start, title]) => {
      if (!title.trim()) return []
      const [hours, minutes] = start.split(':').map(Number), endMinutes = Math.min(1439, hours * 60 + minutes + 60)
      return [{ id: `schedule:${start}`, title, start, end: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`, locked: true, kind: 'event' as const }]
    })
    const result = planner.planDay({ date, tasks: tasks.map(fromLegacyTask), events, profile })
    const legacy = new Map(tasks.map((task) => [task.id, task]))
    setIntelligence(result)
    setProposal({ blocks: result.blocks.flatMap((block) => block.taskId ? [{ taskId: block.taskId, title: block.title, startTime: block.start, endTime: block.end, durationMinutes: block.durationMinutes, reason: block.reason.join(' · ') }] : []), unscheduledTasks: result.unscheduledTasks.flatMap((task) => legacy.get(task.id) ?? []), totalPlannedMinutes: result.totalPlannedMinutes, explanation: result.explanation })
  }
  const apply = () => {
    if (!proposal?.blocks.length) return
    onApply(proposal.blocks)
    close()
  }
  const removeBlock = (taskId: string) => setProposal((current) => current ? {
    ...current,
    blocks: current.blocks.filter((item) => item.taskId !== taskId),
    totalPlannedMinutes: current.blocks.filter((item) => item.taskId !== taskId).reduce((sum, item) => sum + item.durationMinutes, 0),
  } : current)
  const editBlock = (taskId: string, startTime: string, durationMinutes: number) => setProposal((current) => {
    if (!current) return current
    const result = adjustBlock({ blocks: current.blocks, taskId, startTime, durationMinutes, schedule, availableFrom, availableUntil })
    setAdjustmentMessage(result.message)
    return result.valid ? { ...current, blocks: result.blocks, totalPlannedMinutes: result.blocks.reduce((sum, block) => sum + block.durationMinutes, 0) } : current
  })
  const moveWithKeyboard = (taskId: string, direction: -1 | 1) => setProposal((current) => {
    if (!current) return current
    const index = current.blocks.findIndex((block) => block.taskId === taskId), target = current.blocks[index + direction]
    return target ? { ...current, blocks: reorderBlocks(current.blocks, taskId, target.taskId) } : current
  })

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
          {intelligence && <section className="planner-intelligence"><header><div><span>PROPUESTA DETERMINÍSTICA · SUGERENCIA</span><strong>GM AI Planner · Reglas locales explicables</strong></div><em>{Math.round(intelligence.confidence * 100)}% confianza estimada</em></header><div><p><span>Energía utilizada · Declarada</span><strong>{intelligence.blocks.filter((block) => block.kind === 'task').map((block) => block.energy).filter((value, index, values) => values.indexOf(value) === index).join(' · ') || selectedEnergyLabel(energyPreference)}</strong></p><p><span>Tiempo libre · Estimación</span><strong>{Math.floor(intelligence.freeMinutes / 60)}h {intelligence.freeMinutes % 60}m</strong></p><PlanRiskIndicator risk={intelligence.risk} confidence={intelligence.confidence}/></div><p>Clima y sueño: no disponibles. No se utilizaron para esta propuesta.</p></section>}
          <div className="planned-blocks">
            <div className="plan-comparison"><div><strong>Antes · Confirmado</strong>{Object.entries(schedule).filter(([, title]) => title.trim()).map(([time, title]) => <button key={time} type="button" onClick={() => setLockedEvents((current) => { const next = new Set(current); if (next.has(time)) next.delete(time); else next.add(time); return next })}><Lock size={12}/>{time} · {title}<small>{lockedEvents.has(time) ? 'Bloqueado' : 'Desbloqueado'}</small></button>)}</div><div><strong>Después · Propuesta</strong><span>{freeMinutes(proposal.blocks, availableFrom, availableUntil)} min sin planificar</span></div></div>
            {proposal.blocks.map((block) => <article key={block.taskId} draggable onDragStart={() => setDraggedId(block.taskId)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) setProposal((current) => current ? { ...current, blocks: reorderBlocks(current.blocks, draggedId, block.taskId) } : current); setDraggedId(null) }}>
              <button className="drag-handle" aria-label={`Reordenar ${block.title}`} onKeyDown={(event) => { if (event.key === 'ArrowUp') moveWithKeyboard(block.taskId, -1); if (event.key === 'ArrowDown') moveWithKeyboard(block.taskId, 1) }}><GripVertical size={14}/></button>
              <div className="block-edit-fields"><label>Inicio<input aria-label={`Inicio de ${block.title}`} type="time" value={block.startTime} onChange={(event) => editBlock(block.taskId, event.target.value, block.durationMinutes)}/></label><label>Duración<input aria-label={`Duración de ${block.title}`} type="number" min="5" max="240" step="5" value={block.durationMinutes} onChange={(event) => editBlock(block.taskId, block.startTime, Number(event.target.value))}/></label></div>
              <div><strong>{block.title}</strong><p>{block.reason}</p><small>{block.startTime}—{block.endTime}</small></div>
              <div className="block-actions"><button aria-label={`Regenerar bloque ${block.title}`} onClick={() => editBlock(block.taskId, block.startTime, block.durationMinutes)}><RefreshCw size={13}/></button><button aria-label={`Rechazar cambio ${block.title}`} onClick={() => removeBlock(block.taskId)}><Trash2 size={14}/></button></div>
            </article>)}
            {!proposal.blocks.length && <p className="planner-empty">No hay tareas que encajen en ese horario.</p>}
          </div>
          {adjustmentMessage && <p className="adjustment-message" role="status">{adjustmentMessage}</p>}
          {!!proposal.unscheduledTasks.length && <div className="unscheduled"><strong>No pudieron programarse</strong><ul>{proposal.unscheduledTasks.map((task) => <li key={task.id}>{task.title}</li>)}</ul></div>}
          {!!proposal.explanation.length && <PlanExplanation items={proposal.explanation}/>}
        </div>}
        <footer><button onClick={close}>Cancelar</button><button className="apply-plan" disabled={!proposal?.blocks.length} onClick={apply}>Aplicar a mi agenda</button></footer>
      </section>
    </div>}
  </>
}
