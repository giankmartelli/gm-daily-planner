import type { Goal } from '../../../domain/models'
import type { LearningPattern } from '../entities/Planning'
import type { PlannerTask } from '../entities/PlannerTask'
import type { UserPlanningProfile } from '../entities/UserPlanningProfile'
import { DEFAULT_PLANNER_CONFIG, type PlannerConfig } from '../rules/PlannerConfig'
import { EnergyService } from './EnergyService'

export type ScoreContext = { date: string; time: string; completedTaskIds: Set<string>; profile: UserPlanningProfile; learning?: LearningPattern; goals?: Goal[]; habitsCompleted?: number }
export type TaskScore = { task: PlannerTask; total: number; factors: Record<string, number>; reasons: string[]; blocked: boolean }
const dayMs = 86_400_000

export class ScoringService {
  private readonly energy: EnergyService
  private readonly config: PlannerConfig
  constructor(energy = new EnergyService(), config: PlannerConfig = DEFAULT_PLANNER_CONFIG) { this.energy = energy; this.config = config }
  score(task: PlannerTask, context: ScoreContext): TaskScore {
    const blocked = task.dependencies.some((id) => !context.completedTaskIds.has(id))
    const daysToDeadline = task.deadline ? (Date.parse(`${task.deadline}T23:59:59`) - Date.parse(`${context.date}T12:00:00`)) / dayMs : this.config.deadlineHorizonDays
    const deadline = task.deadline ? daysToDeadline < 0 ? 1 : Math.max(0, 1 - daysToDeadline / this.config.deadlineHorizonDays) : 0
    const energy = this.energy.compatibility(task, context.time, context.profile)
    const dependencies = blocked ? 0 : task.dependencies.length ? 1 : .7
    const history = context.learning ? Math.max(0, Math.min(1, context.learning.contextPerformance[task.context] ?? context.learning.completionRate)) : .5
    const duration = Math.max(0, 1 - Math.abs(task.estimatedMinutes - context.profile.preferredTaskLength) / Math.max(task.estimatedMinutes, context.profile.preferredTaskLength))
    const contextMatch = context.learning?.contextPerformance[task.context] ?? .5
    const goals = context.goals?.some((goal) => task.tags.some((tag) => goal.title.toLocaleLowerCase().includes(tag.toLocaleLowerCase()))) ? 1 : .4
    const habits = context.habitsCompleted ? Math.min(1, context.habitsCompleted / 3) : .4
    const factors = { urgency: task.urgency, importance: task.importance, deadline, energy, dependencies, history, context: contextMatch, duration, manualPriority: task.manualPriority, goals, habits }
    const total = blocked ? 0 : Object.entries(this.config.weights).reduce((sum, [key, weight]) => sum + factors[key as keyof typeof factors] * weight, 0)
    const reasons = [deadline >= .8 ? task.deadline && daysToDeadline < 0 ? 'Fecha límite vencida' : 'Fecha límite cercana' : '', task.importance >= .75 ? 'Alta importancia' : '', task.urgency >= .75 ? 'Alta urgencia' : '', energy >= .9 ? `Energía ${task.energyRequired.toLowerCase()} compatible` : '', task.deepWork ? 'Protege trabajo profundo' : '', blocked ? 'Dependencias pendientes' : ''].filter(Boolean) as string[]
    return { task, total, factors, reasons: reasons.length ? reasons : ['Buen ajuste con el espacio disponible'], blocked }
  }
}
