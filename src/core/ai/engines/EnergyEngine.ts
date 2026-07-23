import type { Task } from '../../../domain/models'
import type { AIEngine } from '../interfaces'
import type { EnergyAssessment, EngineResult, WorkloadClass } from '../models'

export class EnergyEngine implements AIEngine<{ tasks: Task[]; interruptions?: number }, EnergyAssessment[]> {
  readonly name = 'EnergyEngine'
  execute({ tasks, interruptions = 0 }: { tasks: Task[]; interruptions?: number }): EngineResult<EnergyAssessment[]> {
    const value = tasks.filter((task) => !task.completed).map((task) => {
      const duration = task.estimatedMinutes ?? 30, focus = task.focusRequired ?? .5
      const classification: WorkloadClass = task.deepWork || focus >= .8 ? 'Deep Work'
        : task.category === 'Estudio' ? 'Creative'
        : task.category === 'Trabajo' && task.calendarLocked ? 'Meetings'
        : duration <= 15 ? 'Quick Tasks'
        : task.category === 'Salud' ? 'Recovery' : 'Administrative'
      const mentalLoad = Math.round(Math.min(100, focus * 65 + Math.min(35, duration / 3)))
      const focusCost = Math.round(Math.min(100, focus * 75 + (task.interruptible === false ? 20 : 0)))
      const contextSwitchCost = Math.min(100, Math.round(interruptions * 8 + (task.context ? 12 : 4)))
      const recommendedPeriod = task.preferredPeriod ?? (mentalLoad >= 70 ? 'mañana' : mentalLoad <= 35 ? 'tarde' : 'cualquiera')
      return { taskId: task.id, classification, mentalLoad, focusCost, contextSwitchCost, recommendedPeriod, explanation: `${classification}: carga mental ${mentalLoad}/100 calculada con duración y enfoque registrados.` }
    })
    return { value, generatedAt: new Date().toISOString(), provenance: 'ESTIMATED', explanations: ['No se usaron datos externos de energía.'] }
  }
}
