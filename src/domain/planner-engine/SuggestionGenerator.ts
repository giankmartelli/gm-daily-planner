import type { PlannerSuggestion, PlannerTaskV3, TaskScore } from './PlannerTypes'

export class SuggestionGenerator {
  generate(tasks: PlannerTaskV3[], scores: Map<string, TaskScore>, unscheduledIds: Set<string>): PlannerSuggestion[] {
    return tasks.map((task) => {
      const scored = scores.get(task.id)
      const score = scored?.score ?? 0
      let action: PlannerSuggestion['action'] = 'hacer_ahora'
      let explanation = 'Es la mejor combinación de urgencia, energía y tiempo disponible.'
      if ((task.estimatedMinutes ?? 30) > 120 || (task.complexity ?? 0) > 0.85) {
        action = 'dividir'; explanation = 'Su duración o complejidad aumenta el riesgo; conviene dividirla.'
      } else if (unscheduledIds.has(task.id)) {
        action = task.delegable ? 'delegar' : 'mover'; explanation = task.delegable ? 'No cabe hoy y puede delegarse.' : 'No cabe de forma segura en el horario de hoy.'
      } else if (score < 35 && task.removable) {
        action = 'eliminar'; explanation = 'Tiene bajo valor relativo y fue marcada como eliminable.'
      } else if (score < 50) {
        action = 'posponer'; explanation = 'Su valor relativo es menor frente a las prioridades actuales.'
      }
      return { taskId: task.id, action, explanation, score, confidence: scored?.confidence ?? 0.5, factors: scored?.factors ?? [] }
    })
  }
}
