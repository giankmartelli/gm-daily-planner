import type { AIEngine } from '../interfaces'
import type { EngineContext, EngineResult, MorningBrief } from '../models'
import { DecisionEngine } from './DecisionEngine'
import { PredictionEngine } from './PredictionEngine'

export class MorningBriefEngine implements AIEngine<EngineContext, MorningBrief> {
  readonly name = 'MorningBriefEngine'
  private readonly decisions: DecisionEngine
  private readonly prediction: PredictionEngine
  constructor(decisions = new DecisionEngine(), prediction = new PredictionEngine()) { this.decisions = decisions; this.prediction = prediction }
  execute(context: EngineContext): EngineResult<MorningBrief> {
    const ranked = this.decisions.execute({ tasks: context.day.tasks, date: context.date, availableMinutes: context.availableMinutes }).value
    const prediction = this.prediction.execute(context).value
    const byId = new Map(context.day.tasks.map((task) => [task.id, task]))
    const importantTasks = ranked.slice(0, 3).flatMap((decision) => {
      const task = byId.get(decision.taskId)
      return task ? [{ id: task.id, title: task.title, reason: decision.explanation[0] }] : []
    })
    const weekly = context.history.slice(-7).filter(({ day }) => day.tasks.length)
    const weeklyProgress = weekly.length ? Math.round(weekly.reduce((sum, { day }) => sum + day.tasks.filter((task) => task.completed).length / day.tasks.length * 100, 0) / weekly.length) : 0
    const riskLevel = prediction.probability >= 75 ? 'bajo' : prediction.probability >= 50 ? 'medio' : 'alto'
    const value: MorningBrief = {
      date: context.date,
      greeting: 'Resumen del día',
      todayFocus: importantTasks[0]?.title,
      importantTasks,
      availableFocusMinutes: context.availableMinutes,
      suggestedChanges: ranked.filter((item) => item.score < 45).slice(0, 2).map((item) => ({ taskId: item.taskId, suggestion: 'Considerar posponer por menor score relativo.' })),
      riskLevel,
      recommendation: importantTasks.length ? `Protege tiempo para “${importantTasks[0].title}”.` : 'No hay tareas pendientes confirmadas.',
      weeklyProgress,
      missingSources: ['Clima', 'Sueño', 'Calendario externo'],
    }
    return { value, generatedAt: new Date().toISOString(), provenance: 'ESTIMATED', explanations: ['Solo utiliza tareas, agenda interna, sesiones e historial disponibles.'] }
  }
}
