import type { DailyPlan, EnergyLevelV3, PlannedTask } from '../planner-engine'
import { PlannerOptimizer } from './PlannerOptimizer'

export type SimulationResult = {
  taskCount: number
  latencyMs: number
  estimatedMemoryBytes: number
  baselineScore: number
  optimizedScore: number
  gain: number
}

const energy: EnergyLevelV3[] = ['baja', 'media', 'alta', 'muy_alta']
const addMinutes = (iso: string, minutes: number) => new Date(Date.parse(iso.endsWith('Z') ? iso : `${iso}Z`) + minutes * 60_000).toISOString().slice(0, 19)

export class SimulationEngine {
  private readonly optimizer: PlannerOptimizer

  constructor(optimizer = new PlannerOptimizer()) {
    this.optimizer = optimizer
  }

  simulate(taskCounts = [100, 500, 1000, 5000]): SimulationResult[] {
    return taskCounts.map((taskCount) => {
      const plan = this.plan(taskCount)
      const before = performance.now()
      const optimized = this.optimizer.optimize({
        plan,
        preferences: { taskContexts: Object.fromEntries(plan.orderedTasks.map((task, index) => [task.taskId, `context-${index % 8}`])) },
      })
      const latencyMs = performance.now() - before
      return {
        taskCount,
        latencyMs,
        estimatedMemoryBytes: new TextEncoder().encode(JSON.stringify(optimized)).byteLength,
        baselineScore: optimized.baselineMetrics.score,
        optimizedScore: optimized.selected.metrics.score,
        gain: optimized.gain,
      }
    })
  }

  private plan(taskCount: number): DailyPlan {
    let cursor = '2026-07-23T00:00:00'
    const orderedTasks: PlannedTask[] = Array.from({ length: taskCount }, (_, index) => {
      const duration = 5 + index % 4 * 5
      const suggestedStart = cursor
      const suggestedEnd = addMinutes(cursor, duration)
      cursor = suggestedEnd
      return {
        taskId: `simulation-${index}`, title: `Simulation ${index}`, priority: 40 + index % 60,
        suggestedStart, suggestedEnd, reason: 'Simulación determinista.', confidence: 0.8,
        estimatedMinutes: duration, energyRequired: energy[index % energy.length],
        alerts: [], dependencies: index && index % 20 === 0 ? [`simulation-${index - 1}`] : [],
        score: 40 + index % 60, factors: [],
      }
    })
    return { date: '2026-07-23', orderedTasks, unscheduledTaskIds: [], conflicts: [], suggestions: [], totalPlannedMinutes: orderedTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0), generatedAt: '2026-07-23T00:00:00' }
  }
}
