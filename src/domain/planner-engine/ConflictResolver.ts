import type { BusyBlock, DailyPlan, PlannerConflict, PlannedTask } from './PlannerTypes'

const overlaps = (task: PlannedTask, block: BusyBlock) => task.suggestedStart < block.end && block.start < task.suggestedEnd

export class ConflictResolver {
  affectedTasks(plan: DailyPlan, newEvent: BusyBlock) {
    return plan.orderedTasks.filter((task) => overlaps(task, newEvent))
  }

  preserveUnaffected(plan: DailyPlan, newEvent: BusyBlock) {
    const affected = new Set(this.affectedTasks(plan, newEvent).map((task) => task.taskId))
    return plan.orderedTasks.filter((task) => !affected.has(task.taskId))
  }

  detectBlockOverlaps(blocks: BusyBlock[]): PlannerConflict[] {
    const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start))
    return sorted.slice(1).flatMap((block, index) => {
      const previous = sorted[index]
      return previous.end > block.start
        ? [{ type: 'overlap' as const, blockIds: [previous.id, block.id], explanation: `“${previous.title}” se solapa con “${block.title}”.` }]
        : []
    })
  }
}
