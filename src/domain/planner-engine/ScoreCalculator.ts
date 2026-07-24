import { energyCompatibility, taskEnergyMinimum } from './EnergyModel'
import { DEFAULT_WEIGHTS, type EnergyLevelV3, type PlannerTaskV3, type ScoreFactor, type ScoreWeights, type StatisticalProfile, type TaskScore } from './PlannerTypes'

export type ScoreContext = {
  now: string
  endOfDay: string
  availableMinutes: number
  energy: EnergyLevelV3
  completedTaskIds: Set<string>
  previousContext?: string
  profile?: StatisticalProfile
  weights?: Partial<ScoreWeights>
}

const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
const priorityValue = { baja: 0.2, media: 0.5, alta: 0.8, critica: 1 }
const factorExplanations: Record<keyof ScoreWeights, string> = {
  urgency: 'Urgencia declarada', deadline: 'Proximidad de la fecha límite', importance: 'Importancia',
  timeFit: 'Ajuste al tiempo disponible', energy: 'Compatibilidad energética', dependencies: 'Dependencias listas',
  context: 'Continuidad de contexto', frequency: 'Frecuencia', history: 'Historial de cumplimiento',
  postponements: 'Reprogramaciones anteriores', complexity: 'Complejidad manejable', remainingDay: 'Capacidad restante del día',
}

function deadlineValue(task: PlannerTaskV3, now: string) {
  if (!task.dueAt) return 0.25
  const hours = (Date.parse(task.dueAt) - Date.parse(now)) / 3_600_000
  if (hours <= 0) return 1
  return clamp(1 - hours / (14 * 24))
}

export class ScoreCalculator {
  calculate(task: PlannerTaskV3, context: ScoreContext): TaskScore {
    const duration = Math.max(5, task.estimatedMinutes ?? 30)
    const remainingMinutes = Math.max(0, (Date.parse(context.endOfDay) - Date.parse(context.now)) / 60_000)
    const dependenciesReady = (task.dependencies ?? []).every((id) => context.completedTaskIds.has(id))
    const history = context.profile?.durationByTask[task.id]
    const values: Record<keyof ScoreWeights, number> = {
      urgency: clamp(Math.max(task.urgency ?? 0.5, (task.postponementCount ?? 0) * 0.15)),
      deadline: deadlineValue(task, context.now),
      importance: clamp(Math.max(task.importance ?? priorityValue[task.priority ?? 'media'], priorityValue[task.priority ?? 'media'])),
      timeFit: duration <= context.availableMinutes ? clamp(1 - duration / Math.max(context.availableMinutes * 2, 1)) : 0,
      energy: energyCompatibility(task, context.energy),
      dependencies: dependenciesReady ? 1 : 0,
      context: context.previousContext && task.context === context.previousContext ? 1 : 0.55,
      frequency: clamp(task.frequency ?? 0.5),
      history: history ? history.confidence : (context.profile?.completionRate ?? 0.5),
      postponements: clamp((task.postponementCount ?? 0) / 4),
      complexity: 1 - clamp(task.complexity ?? 0.5) * 0.35,
      remainingDay: duration <= remainingMinutes ? clamp(remainingMinutes / Math.max(duration * 3, 1)) : 0,
    }
    const weights = { ...DEFAULT_WEIGHTS, ...context.weights }
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + Math.max(0, value), 0) || 1
    const factors = (Object.keys(weights) as Array<keyof ScoreWeights>).map((key): ScoreFactor => ({
      key,
      value: values[key],
      contribution: values[key] * Math.max(0, weights[key]) / totalWeight * 100,
      explanation: factorExplanations[key],
    }))
    const score = dependenciesReady ? Math.round(factors.reduce((sum, factor) => sum + factor.contribution, 0)) : 0
    const known = [task.dueAt, task.importance, task.urgency, task.energyMinimum, history].filter((value) => value !== undefined && value !== null).length
    const confidence = Math.min(0.97, 0.55 + known * 0.07)
    if (taskEnergyMinimum(task) === 'alta' && context.energy === 'baja') return { taskId: task.id, score: 0, confidence, factors }
    return { taskId: task.id, score: Math.min(100, Math.max(0, score)), confidence, factors }
  }
}
