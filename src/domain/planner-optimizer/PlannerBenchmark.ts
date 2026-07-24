import type { DailyPlan } from '../planner-engine'
import type { OptimizerPreferences } from './ConstraintModel'
import { FocusBlockOptimizer } from './FocusBlockOptimizer'
import { MetricsEngine } from './MetricsEngine'
import { PlannerOptimizer } from './PlannerOptimizer'

export type PlannerBenchmarkResult = {
  greedy: { latencyMs: number; score: number }
  optimizer: { latencyMs: number; score: number }
  gain: number
  qualityGainPercent: number
}

export class PlannerBenchmark {
  private readonly optimizer: PlannerOptimizer
  private readonly metrics: MetricsEngine
  private readonly focus: FocusBlockOptimizer

  constructor(optimizer = new PlannerOptimizer(), metrics = new MetricsEngine(), focus = new FocusBlockOptimizer()) {
    this.optimizer = optimizer
    this.metrics = metrics
    this.focus = focus
  }

  compare(plan: DailyPlan, preferences: OptimizerPreferences): PlannerBenchmarkResult {
    const greedyStart = performance.now()
    const greedyFocus = this.focus.detect(plan.orderedTasks, preferences.minimumFocusMinutes, preferences.preferredFocusMinutes)
    const greedyMetrics = this.metrics.measure(plan.orderedTasks, greedyFocus, preferences)
    const greedyLatency = performance.now() - greedyStart
    const optimizerStart = performance.now()
    const optimized = this.optimizer.optimize({ plan, preferences })
    const optimizerLatency = performance.now() - optimizerStart
    return {
      greedy: { latencyMs: greedyLatency, score: greedyMetrics.score },
      optimizer: { latencyMs: optimizerLatency, score: optimized.selected.metrics.score },
      gain: optimized.selected.metrics.score - greedyMetrics.score,
      qualityGainPercent: greedyMetrics.score ? (optimized.selected.metrics.score - greedyMetrics.score) / greedyMetrics.score * 100 : 0,
    }
  }
}
