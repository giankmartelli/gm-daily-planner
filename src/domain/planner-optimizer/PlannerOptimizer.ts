import type { PlannedTask } from '../planner-engine'
import { AlternativePlanner } from './AlternativePlanner'
import {
  DEFAULT_OPTIMIZER_PREFERENCES,
  type OptimizationDecision,
  type OptimizationInput,
  type OptimizedPlan,
  type OptimizerPreferences,
} from './ConstraintModel'
import { FocusBlockOptimizer } from './FocusBlockOptimizer'
import { MetricsEngine } from './MetricsEngine'
import { OptimizationSolver } from './OptimizationSolver'
import { ScenarioGenerator } from './ScenarioGenerator'

export class PlannerOptimizer {
  private readonly scenarios: ScenarioGenerator
  private readonly solver: OptimizationSolver
  private readonly alternatives: AlternativePlanner
  private readonly metrics: MetricsEngine
  private readonly focus: FocusBlockOptimizer

  constructor(
    scenarios = new ScenarioGenerator(),
    solver = new OptimizationSolver(),
    alternatives = new AlternativePlanner(),
    metrics = new MetricsEngine(),
    focus = new FocusBlockOptimizer(),
  ) {
    this.scenarios = scenarios
    this.solver = solver
    this.alternatives = alternatives
    this.metrics = metrics
    this.focus = focus
  }

  optimize(input: OptimizationInput): OptimizedPlan {
    const preferences = this.preferences(input)
    const original = [...input.plan.orderedTasks].sort((a, b) => a.suggestedStart.localeCompare(b.suggestedStart))
    const baselineMetrics = this.metrics.measure(original, this.focus.detect(original, preferences.minimumFocusMinutes, preferences.preferredFocusMinutes), preferences)
    const generated = this.scenarios.generate(original, preferences)
    const solved = this.solver.solve(generated, original, preferences)
    const selectedAlternatives = this.alternatives.select(solved, 3)
    const selected = selectedAlternatives[0]
    return {
      sourcePlan: input.plan,
      selected,
      alternatives: selectedAlternatives,
      baselineMetrics,
      gain: Math.round((selected.metrics.score - baselineMetrics.score) * 100) / 100,
      decisions: this.explain(original, selected.tasks, baselineMetrics.score, selected.metrics.score),
      generatedAt: input.plan.generatedAt,
    }
  }

  private preferences(input: OptimizationInput): OptimizerPreferences {
    return {
      ...DEFAULT_OPTIMIZER_PREFERENCES,
      ...input.preferences,
      weights: { ...DEFAULT_OPTIMIZER_PREFERENCES.weights, ...input.preferences?.weights },
      taskContexts: { ...input.preferences?.taskContexts },
      protectedTaskIds: new Set(input.preferences?.protectedTaskIds ?? []),
      energyForecast: [...(input.preferences?.energyForecast ?? [])],
      streakTaskIds: new Set(input.preferences?.streakTaskIds ?? []),
    }
  }

  private explain(before: PlannedTask[], after: PlannedTask[], previousScore: number, newScore: number): OptimizationDecision[] {
    const beforePosition = new Map(before.map((task, index) => [task.taskId, index]))
    return after.map((task, index) => {
      const oldIndex = beforePosition.get(task.taskId) ?? index
      const changed = oldIndex === index ? 'Se conservó su posición.' : `Se movió de la posición ${oldIndex + 1} a la ${index + 1}.`
      const improved = newScore > previousScore ? ['Mejoró el score global del día.', 'La alternativa reduce costes ponderados.'] : ['Conservó restricciones críticas.']
      const worsened = newScore < previousScore ? ['Disminuyó el score global.'] : oldIndex !== index ? ['Cambió el orden original.'] : []
      return {
        taskId: task.taskId,
        why: oldIndex === index ? 'La posición ya era competitiva.' : 'La búsqueda híbrida encontró una posición con mejor coste global.',
        changed,
        improved,
        worsened,
        previousScore,
        newScore,
      }
    })
  }
}
