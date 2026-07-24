import type { DailyPlan, PlannedTask } from '../planner-engine'
import type { OptimizedPlan } from './ConstraintModel'
import { PlannerOptimizer } from './PlannerOptimizer'

export type RescheduleChange =
  | { type: 'meeting'; id: string; start: string; end: string }
  | { type: 'duration'; taskId: string; actualMinutes: number }
  | { type: 'cancelled'; taskId: string }

export type PartialRescheduleResult = {
  plan: OptimizedPlan
  affectedTaskIds: string[]
  preservedTaskIds: string[]
  explanation: string
}

const overlaps = (task: PlannedTask, start: string, end: string) => task.suggestedStart < end && start < task.suggestedEnd
const addMinutes = (iso: string, minutes: number) => new Date(Date.parse(iso.endsWith('Z') ? iso : `${iso}Z`) + minutes * 60_000).toISOString().slice(0, 19)

export class RescheduleEngine {
  private readonly optimizer: PlannerOptimizer

  constructor(optimizer = new PlannerOptimizer()) {
    this.optimizer = optimizer
  }

  replan(current: OptimizedPlan, change: RescheduleChange): PartialRescheduleResult {
    const tasks = current.selected.tasks
    const firstAffected = this.firstAffectedIndex(tasks, change)
    if (firstAffected < 0) {
      return { plan: current, affectedTaskIds: [], preservedTaskIds: tasks.map((task) => task.taskId), explanation: 'El cambio no afecta el plan actual.' }
    }
    const preserved = tasks.slice(0, firstAffected)
    let affected = tasks.slice(firstAffected)
    if (change.type === 'cancelled') affected = affected.filter((task) => task.taskId !== change.taskId)
    if (change.type === 'duration') {
      affected = affected.map((task) => task.taskId === change.taskId ? { ...task, estimatedMinutes: Math.max(1, change.actualMinutes) } : task)
    }
    const start = change.type === 'meeting' ? change.end : affected[0]?.suggestedStart
    affected = this.place(affected, start)
    const partialSource: DailyPlan = {
      ...current.sourcePlan,
      orderedTasks: affected,
      totalPlannedMinutes: affected.reduce((sum, task) => sum + task.estimatedMinutes, 0),
    }
    const partial = this.optimizer.optimize({ plan: partialSource })
    const mergedTasks = [...preserved, ...partial.selected.tasks]
    const merged: OptimizedPlan = {
      ...partial,
      sourcePlan: current.sourcePlan,
      selected: { ...partial.selected, tasks: mergedTasks },
    }
    return {
      plan: merged,
      affectedTaskIds: tasks.slice(firstAffected).map((task) => task.taskId),
      preservedTaskIds: preserved.map((task) => task.taskId),
      explanation: `Se recalcularon ${tasks.length - firstAffected} tarea(s); ${preserved.length} quedaron intactas.`,
    }
  }

  private firstAffectedIndex(tasks: PlannedTask[], change: RescheduleChange) {
    if (change.type === 'meeting') return tasks.findIndex((task) => overlaps(task, change.start, change.end))
    return tasks.findIndex((task) => task.taskId === change.taskId)
  }

  private place(tasks: PlannedTask[], start?: string) {
    if (!start) return []
    let cursor = start
    return tasks.map((task) => {
      const suggestedStart = cursor
      const suggestedEnd = addMinutes(cursor, task.estimatedMinutes)
      cursor = suggestedEnd
      return { ...task, suggestedStart, suggestedEnd }
    })
  }
}
