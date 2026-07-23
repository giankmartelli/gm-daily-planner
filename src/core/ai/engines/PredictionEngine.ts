import type { AIEngine } from '../interfaces'
import type { EngineContext, EngineResult, Prediction } from '../models'
import { calculateCompletionProbability } from '../../../ai-planning/engine'

export class PredictionEngine implements AIEngine<EngineContext, Prediction> {
  readonly name = 'PredictionEngine'
  execute(context: EngineContext): EngineResult<Prediction> {
    const pending = context.day.tasks.filter((task) => !task.completed)
    const plannedMinutes = pending.reduce((sum, task) => sum + (task.estimatedMinutes ?? 30), 0)
    const historicalDays = context.history.filter(({ day }) => day.tasks.length)
    const completed = historicalDays.reduce((sum, { day }) => sum + day.tasks.filter((task) => task.completed).length, 0)
    const historicalTasks = historicalDays.reduce((sum, { day }) => sum + day.tasks.length, 0)
    const historicalRate = historicalTasks ? completed / historicalTasks : undefined
    const overdue = pending.filter((task) => task.dueDate && task.dueDate < context.date).length
    const calendarBlocks = Object.values(context.day.schedule).filter((title) => title.trim()).length
    const probability = calculateCompletionProbability({ availableMinutes: context.availableMinutes, plannedMinutes, historicalCompletionRate: historicalRate, overdueTasks: overdue, taskCount: pending.length, calendarBlocks, contextSwitches: new Set(pending.map((task) => task.context ?? task.category)).size, energy: context.declaredEnergy ?? 'media' })
    const factors = [
      { label: 'Capacidad disponible', effect: context.availableMinutes - plannedMinutes, source: 'Agenda y duraciones confirmadas' },
      { label: 'Historial', effect: Math.round((historicalRate ?? .65) * 100), source: historicalRate === undefined ? 'Valor neutral por falta de historial' : `${historicalTasks} tareas registradas` },
      { label: 'Tareas vencidas', effect: -overdue * 4, source: `${overdue} tarea(s)` },
      { label: 'Fragmentación', effect: -calendarBlocks * 2, source: `${calendarBlocks} bloque(s) ocupados` },
    ]
    return { value: { probability, factors }, generatedAt: new Date().toISOString(), provenance: 'ESTIMATED', explanations: factors.map((factor) => `${factor.label}: ${factor.effect}. ${factor.source}.`) }
  }
}
