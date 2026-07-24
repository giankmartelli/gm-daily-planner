import type { PlannedTask } from '../planner-engine'
import { ConstraintModel, type AlternativePlan, type OptimizerPreferences } from './ConstraintModel'
import { FocusBlockOptimizer } from './FocusBlockOptimizer'
import { MetricsEngine } from './MetricsEngine'
import type { PlanningScenario } from './ScenarioGenerator'

const duration = (task: PlannedTask) => Math.max(1, task.estimatedMinutes)
const addMinutes = (iso: string, minutes: number) => new Date(Date.parse(iso.endsWith('Z') ? iso : `${iso}Z`) + minutes * 60_000).toISOString().slice(0, 19)

export class OptimizationSolver {
  private readonly constraints: ConstraintModel
  private readonly focus: FocusBlockOptimizer
  private readonly metrics: MetricsEngine

  constructor(
    constraints = new ConstraintModel(),
    focus = new FocusBlockOptimizer(),
    metrics = new MetricsEngine(),
  ) {
    this.constraints = constraints
    this.focus = focus
    this.metrics = metrics
  }

  solve(scenarios: PlanningScenario[], original: PlannedTask[], preferences: OptimizerPreferences): AlternativePlan[] {
    if (!original.length) return scenarios.map((scenario) => this.evaluate(scenario, [], original, preferences))
    const alternatives = scenarios.map((scenario) => {
      const tasks = scenario.id === 'baseline' ? [...original] : this.place(scenario.sequence, original[0].suggestedStart)
      return this.evaluate(scenario, tasks, original, preferences)
    })
    return alternatives.sort((a, b) => {
      const aCritical = a.violations.filter((violation) => violation.severity === 'critical').length
      const bCritical = b.violations.filter((violation) => violation.severity === 'critical').length
      return aCritical - bCritical || b.metrics.score - a.metrics.score || a.id.localeCompare(b.id)
    })
  }

  private place(sequence: PlannedTask[], start: string) {
    let cursor = start
    return sequence.map((task) => {
      const suggestedStart = cursor
      const suggestedEnd = addMinutes(suggestedStart, duration(task))
      cursor = suggestedEnd
      return { ...task, suggestedStart, suggestedEnd }
    })
  }

  private evaluate(scenario: PlanningScenario, tasks: PlannedTask[], original: PlannedTask[], preferences: OptimizerPreferences): AlternativePlan {
    const focusBlocks = this.focus.detect(tasks, preferences.minimumFocusMinutes, preferences.preferredFocusMinutes)
    return {
      id: scenario.id,
      label: scenario.label,
      tasks,
      focusBlocks,
      metrics: this.metrics.measure(tasks, focusBlocks, preferences),
      violations: this.constraints.validate(tasks, original, preferences),
    }
  }
}
