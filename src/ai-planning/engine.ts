import type { Task } from '../domain/models'
import { defaultPlanningProfile, fromLegacyTask, planner } from '../planner'
import type { PlanProposal, PlanningContext, ProposedChange } from './domain'

const uid = () => crypto.randomUUID()
const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }

export type ProposalInput = {
  context: PlanningContext
  availableFrom: string
  availableUntil: string
  energy: 'baja' | 'media' | 'alta'
  historicalCompletionRate?: number
}

export function calculateCompletionProbability(input: {
  availableMinutes: number
  plannedMinutes: number
  historicalCompletionRate?: number
  overdueTasks: number
  taskCount: number
  calendarBlocks: number
  contextSwitches: number
  energy: 'baja' | 'media' | 'alta'
}) {
  const capacity = input.availableMinutes ? Math.min(1, input.availableMinutes / Math.max(1, input.plannedMinutes)) : 0
  const history = Math.min(1, Math.max(0, input.historicalCompletionRate ?? 0.65))
  const overduePenalty = Math.min(.2, input.overdueTasks * .04)
  const complexityPenalty = Math.min(.15, Math.max(0, input.taskCount - 4) * .025)
  const fragmentationPenalty = Math.min(.15, input.calendarBlocks * .02)
  const switchingPenalty = Math.min(.12, input.contextSwitches * .02)
  const energyFactor = { baja: -.08, media: 0, alta: .06 }[input.energy]
  const safetyMargin = input.availableMinutes - input.plannedMinutes >= 30 ? .05 : -.05
  const raw = .45 * capacity + .35 * history + energyFactor + safetyMargin - overduePenalty - complexityPenalty - fragmentationPenalty - switchingPenalty
  return Math.round(Math.min(1, Math.max(0, raw)) * 100)
}

export function createPlanProposal({ context, availableFrom, availableUntil, energy, historicalCompletionRate }: ProposalInput): PlanProposal {
  const tasks = context.tasks.value ?? []
  const events = context.calendar.value ?? []
  const profile = defaultPlanningProfile()
  profile.workingHours = { from: availableFrom, until: availableUntil }
  profile.energyCurve = [{ from: availableFrom, until: availableUntil, energy: ({ baja: 'Low', media: 'Medium', alta: 'High' } as const)[energy] }]
  const plan = planner.planDay({
    date: context.date,
    tasks: tasks.map((task) => fromLegacyTask(task as Task)),
    events: events.map((event) => ({ ...event, kind: 'event' as const })),
    profile,
  })
  const changes: ProposedChange[] = plan.blocks.flatMap((block) => {
    if (block.kind === 'event') return []
    return [{
      id: uid(),
      type: block.kind === 'break' ? 'add_break' as const : 'create_block' as const,
      title: block.title,
      explanation: block.reason.join(' · '),
      expectedBenefit: block.kind === 'break' ? 'Conservar energía entre bloques.' : `Reservar ${block.durationMinutes} minutos sin solapamientos.`,
      confidence: block.confidence >= .8 ? 'high' as const : block.confidence >= .55 ? 'medium' as const : 'low' as const,
      dataSources: ['CONFIRMED' as const, 'AI_SUGGESTION' as const],
      affectedEntityIds: block.taskId ? [block.taskId] : [],
      beforeState: null,
      proposedState: { start: block.start, end: block.end, title: block.title, taskId: block.taskId },
      reversible: true,
      riskLevel: block.risk >= .65 ? 'high' as const : block.risk >= .35 ? 'medium' as const : 'low' as const,
      status: 'proposed' as const,
    }]
  })
  const availableMinutes = Math.max(0, minutes(availableUntil) - minutes(availableFrom) - events.reduce((sum, event) => sum + Math.max(0, minutes(event.end) - minutes(event.start)), 0))
  const overdueTasks = tasks.filter((task) => task.dueDate && task.dueDate < context.date && !task.completed).length
  const probability = calculateCompletionProbability({
    availableMinutes, plannedMinutes: plan.totalPlannedMinutes, historicalCompletionRate,
    overdueTasks, taskCount: tasks.filter((task) => !task.completed).length, calendarBlocks: events.length,
    contextSwitches: Math.max(0, changes.filter((change) => change.type === 'create_block').length - 1), energy,
  })
  return {
    id: uid(), date: context.date, createdAt: new Date().toISOString(), changes,
    insights: [
      { id: uid(), title: 'Disponibilidad', explanation: `${availableMinutes} minutos calculados después de bloques confirmados.`, provenance: 'ESTIMATED', confidence: 'high' },
      ...(context.weather.status === 'UNAVAILABLE' ? [{ id: uid(), title: 'Clima no disponible', explanation: context.weather.explanation ?? 'Sin proveedor.', provenance: 'UNAVAILABLE' as const, confidence: 'high' as const }] : []),
      ...(context.sleep.status === 'UNAVAILABLE' ? [{ id: uid(), title: 'Sueño no disponible', explanation: context.sleep.explanation ?? 'Sin datos.', provenance: 'UNAVAILABLE' as const, confidence: 'high' as const }] : []),
    ],
    completionProbability: probability,
    probabilityExplanation: [
      '45% capacidad disponible frente a minutos planificados.',
      '35% historial de cumplimiento (65% neutral si aún no existe historial).',
      'Ajustes explícitos por vencidas, complejidad, fragmentación, energía, cambios de contexto y margen de seguridad.',
    ],
    status: 'draft', context, provider: 'local',
  }
}
