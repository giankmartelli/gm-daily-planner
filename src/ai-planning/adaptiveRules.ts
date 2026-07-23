import type { Task } from '../domain/models'
import type { PlanOutcome } from './domain'

export type AdaptiveRecommendation = {
  tasks: Task[]
  dailyLoadFactor: number
  blockMinutes: number
  breakMinutes: number
  explanation: string[]
}

export function adaptFromOutcome(tasks: Task[], outcome: PlanOutcome): AdaptiveRecommendation {
  const explanation: string[] = []
  const nextTasks = tasks.map((task) => {
    const actual = outcome.actualMinutes[task.id]
    if (!actual || actual < 5) return task
    const previous = task.estimatedMinutes ?? 30
    const estimate = Math.round((previous * .7 + actual * .3) / 5) * 5
    explanation.push(`${task.title}: duración estimada ajustada 30% hacia el tiempo real (${actual} min).`)
    return { ...task, estimatedMinutes: Math.max(5, estimate) }
  })
  const completion = outcome.completedTaskIds.length / Math.max(1, outcome.completedTaskIds.length + outcome.postponedTaskIds.length)
  const dailyLoadFactor = outcome.realistic === false || completion < .6 ? .85 : completion > .85 ? 1.05 : 1
  const blockMinutes = outcome.energy === 'baja' ? 35 : outcome.energy === 'alta' ? 75 : 50
  const breakMinutes = outcome.rating <= 2 || outcome.realistic === false ? 15 : 10
  explanation.push(`Carga recomendada: ${Math.round(dailyLoadFactor * 100)}% según cumplimiento y realismo declarados.`)
  explanation.push(`Bloques de ${blockMinutes} min y descansos de ${breakMinutes} min según energía y valoración.`)
  return { tasks: nextTasks, dailyLoadFactor, blockMinutes, breakMinutes, explanation }
}
