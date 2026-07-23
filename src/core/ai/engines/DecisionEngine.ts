import type { Task } from '../../../domain/models'
import type { AIEngine } from '../interfaces'
import type { DecisionScore, EngineResult } from '../models'
import { clampScore, DECISION_WEIGHTS as weight } from '../domain/DecisionPolicy'

export class DecisionEngine implements AIEngine<{ tasks: Task[]; date: string; availableMinutes: number }, DecisionScore[]> {
  readonly name = 'DecisionEngine'
  execute({ tasks, date, availableMinutes }: { tasks: Task[]; date: string; availableMinutes: number }): EngineResult<DecisionScore[]> {
    const active = tasks.filter((task) => !task.completed)
    const value = active.map((task) => {
      const priority = { alta: 100, media: 62, baja: 30 }[task.priority]
      const days = task.dueDate ? Math.ceil((Date.parse(`${task.dueDate}T12:00:00`) - Date.parse(`${date}T12:00:00`)) / 86400000) : 30
      const urgency = task.dueDate ? days < 0 ? 100 : Math.max(20, 100 - days * 12) : 25
      const impact = Math.round((task.importance ?? .5) * 100)
      const energyFit = Math.round((1 - Math.abs(({ baja: .25, media: .55, alta: .9 }[task.energyLevel ?? 'media']) - (task.focusRequired ?? .5))) * 100)
      const durationFit = Math.round(Math.min(1, availableMinutes / Math.max(5, task.estimatedMinutes ?? 30)) * 100)
      const dependencyReadiness = task.dependencies?.length ? 35 : 100
      const score = clampScore(priority * weight.priority + urgency * weight.urgency + impact * weight.impact + energyFit * weight.energyFit + durationFit * weight.durationFit + dependencyReadiness * weight.dependencyReadiness)
      const explanation = [
        `Prioridad ${task.priority}: ${priority}/100.`,
        task.dueDate ? `${days < 0 ? 'Vencida' : `Vence en ${days} día(s)`}: urgencia ${urgency}/100.` : 'Sin fecha límite confirmada.',
        `Impacto ${impact}/100 y ajuste al tiempo ${durationFit}/100.`,
        task.dependencies?.length ? `${task.dependencies.length} dependencia(s) reducen su preparación.` : 'Sin dependencias registradas.',
      ]
      return { taskId: task.id, score, priority, urgency, impact, energyFit, durationFit, dependencyReadiness, explanation }
    }).sort((a, b) => b.score - a.score)
    return { value, generatedAt: new Date().toISOString(), provenance: 'ESTIMATED', explanations: ['Score ponderado y transparente entre 0 y 100.'] }
  }
}
