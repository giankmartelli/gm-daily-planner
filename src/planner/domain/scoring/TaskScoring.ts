import { PLANNER_SCORE_WEIGHTS, type PlannerScoreFactor } from '../config'
import type { PlannerTask, PlannerPriority } from '../entities/PlannerTask'

export type TaskScoringContext = {
  now: string
  date: string
  availableMinutes: number
  completedTaskIds: Set<string>
  currentEnergy: 'baja' | 'media' | 'alta'
  currentPeriod: 'morning' | 'afternoon' | 'evening'
  previousContext?: string
  historicalCompletion?: number
}
export type TaskScoreResult = {
  totalScore: number
  confidence: number
  factors: Record<PlannerScoreFactor, number>
  explanations: string[]
}

const priorityScore: Record<PlannerPriority, number> = { baja: .2, media: .5, alta: .8, critica: 1 }
const energyRank = { baja: 1, media: 2, alta: 3 }
const clamp = (value:number) => Math.max(0, Math.min(1, value))
const deadlineFactor = (task:PlannerTask, context:TaskScoringContext) => {
  const target = task.dueAt ?? task.deadline
  if (!target) return 0
  const difference = Date.parse(target.length === 10 ? `${target}T23:59:59` : target) - Date.parse(`${context.date}T${context.now}:00`)
  if (difference <= 0) return 1
  return clamp(1 - difference / (14 * 86_400_000))
}

export function calculateTaskScore(task:PlannerTask, context:TaskScoringContext):TaskScoreResult {
  const dependencyReadiness = task.dependencies.every(id=>context.completedTaskIds.has(id)) ? 1 : 0
  const deadline = deadlineFactor(task,context)
  const urgency = clamp(Math.max(task.urgency, deadline, task.postponementCount * .12))
  const energyMatch = clamp(1 - Math.abs(energyRank[task.energyLevel] - energyRank[context.currentEnergy]) * .45)
  const durationFit = task.remainingMinutes <= context.availableMinutes ? clamp(1 - task.remainingMinutes / Math.max(context.availableMinutes * 2, 1)) : 0
  const preferredPeriod = task.preferredPeriod === 'any' || task.preferredPeriod === context.currentPeriod ? 1 : .3
  const continuity = context.previousContext && context.previousContext === task.context ? 1 : .55
  const historicalFit = clamp(context.historicalCompletion ?? .5)
  const factors = { urgency, deadline, priority:priorityScore[task.priority], energyMatch, durationFit, dependencyReadiness, continuity, preferredPeriod, historicalFit }
  const totalScore = dependencyReadiness === 0 ? 0 : Math.round((Object.keys(PLANNER_SCORE_WEIGHTS) as PlannerScoreFactor[]).reduce((total,key)=>total+factors[key]*PLANNER_SCORE_WEIGHTS[key],0))
  const knownSignals = [Boolean(task.dueAt||task.deadline),task.priority!=='media',task.dependencies.length>0,context.historicalCompletion!==undefined].filter(Boolean).length
  const explanations = [
    deadline===1?'La fecha límite está vencida o vence ahora.':deadline>=.7?'La fecha límite está próxima.':'',
    task.priority==='critica'?'Marcada como prioridad crítica.':task.priority==='alta'?'Marcada como prioridad alta.':'',
    energyMatch>=.9?'La energía disponible coincide con la requerida.':'',
    durationFit===0?'No cabe en el espacio disponible.':'',
    dependencyReadiness===0?'Tiene dependencias pendientes.':'',
    continuity===1?'Conserva el contexto de trabajo actual.':'',
    preferredPeriod===1&&task.preferredPeriod!=='any'?'Coincide con el periodo preferido.':'',
  ].filter(Boolean)
  return { totalScore, confidence:Math.round((.55+knownSignals*.1)*100), factors, explanations:explanations.length?explanations:['Ajuste equilibrado con la disponibilidad actual.'] }
}
