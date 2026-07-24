import type { PlannedTask } from '../planner-engine'
import type { OptimizerPreferences } from './ConstraintModel'
import { WorkloadBalancer } from './WorkloadBalancer'

export type PlanningScenario = { id: string; label: string; sequence: PlannedTask[]; rationale: string }

const unique = (scenarios: PlanningScenario[]) => {
  const seen = new Set<string>()
  return scenarios.filter((scenario) => {
    const key = scenario.sequence.map((task) => task.taskId).join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export class ScenarioGenerator {
  private readonly workload: WorkloadBalancer

  constructor(workload = new WorkloadBalancer()) {
    this.workload = workload
  }

  generate(tasks: PlannedTask[], preferences: OptimizerPreferences): PlanningScenario[] {
    const byPriority = [...tasks].sort((a, b) => b.priority - a.priority || a.suggestedStart.localeCompare(b.suggestedStart))
    const byContext = [...tasks].sort((a, b) =>
      (preferences.taskContexts[a.taskId] ?? a.taskId).localeCompare(preferences.taskContexts[b.taskId] ?? b.taskId) || b.priority - a.priority,
    )
    const byEnergy = [...tasks].sort((a, b) => b.energyRequired.localeCompare(a.energyRequired) || b.priority - a.priority)
    const balanced = this.workload.balance(byPriority, preferences.maximumConsecutiveHighEnergy)
    const scenarios: PlanningScenario[] = [
      { id: 'baseline', label: 'Plan original', sequence: [...tasks], rationale: 'Conserva el resultado greedy.' },
      { id: 'priority', label: 'Prioridades primero', sequence: byPriority, rationale: 'Maximiza valor temprano.' },
      { id: 'context', label: 'Flujo por contexto', sequence: byContext, rationale: 'Reduce cambios de contexto.' },
      { id: 'energy', label: 'Energía y foco', sequence: byEnergy, rationale: 'Agrupa trabajo profundo.' },
      { id: 'balanced', label: 'Carga equilibrada', sequence: balanced, rationale: 'Evita fatiga consecutiva.' },
    ]
    const limit = Math.min(tasks.length - 1, preferences.backtrackingDepth * 2)
    for (let index = 0; index < limit; index += 1) {
      const swapped = [...byPriority]
      ;[swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]]
      scenarios.push({ id: `backtrack:${index}`, label: `Alternativa ${index + 1}`, sequence: swapped, rationale: 'Retroceso local para escapar de un conflicto o mínimo local.' })
    }
    return unique(scenarios).slice(0, Math.max(3, preferences.beamWidth))
  }
}
