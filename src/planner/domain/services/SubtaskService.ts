import { normalizePlannerTask, type PlannerTask } from '../entities/PlannerTask'
import { DEFAULT_PLANNER_CONFIG, type PlannerConfig } from '../rules/PlannerConfig'

const genericPhases = ['Definir alcance', 'Preparar estructura', 'Ejecutar trabajo principal', 'Revisar resultado', 'Cerrar y documentar']
export class SubtaskService {
  private readonly config: PlannerConfig
  constructor(config: PlannerConfig = DEFAULT_PLANNER_CONFIG) { this.config = config }
  split(task: PlannerTask): PlannerTask[] {
    if (task.estimatedMinutes <= this.config.splitThresholdMinutes) return [task]
    const count = Math.max(2, Math.ceil(task.estimatedMinutes / this.config.splitThresholdMinutes))
    const minutes = Math.ceil(task.estimatedMinutes / count / 5) * 5
    return Array.from({ length: count }, (_, index) => normalizePlannerTask({ ...task, id: `${task.id}:part:${index + 1}`, title: `${task.title} · ${genericPhases[index] ?? `Parte ${index + 1}`}`, estimatedMinutes: index === count - 1 ? task.estimatedMinutes - minutes * (count - 1) : minutes, dependencies: index ? [`${task.id}:part:${index}`] : task.dependencies, createdAutomatically: true, aiGenerated: false }))
  }
}
