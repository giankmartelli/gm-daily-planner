import type { PlannedTask } from '../planner-engine'
import type { FocusBlock } from './ConstraintModel'

const minutes = (start: string, end: string) => Math.max(0, (Date.parse(end) - Date.parse(start)) / 60_000)
const highEnergy = (task: PlannedTask) => task.energyRequired === 'alta' || task.energyRequired === 'muy_alta'

export class FocusBlockOptimizer {
  detect(tasks: PlannedTask[], minimumMinutes = 60, preferredMinutes: 90 | 120 = 90): FocusBlock[] {
    const sorted = [...tasks].sort((a, b) => a.suggestedStart.localeCompare(b.suggestedStart))
    const blocks: FocusBlock[] = []
    let group: PlannedTask[] = []
    const flush = () => {
      if (!group.length) return
      let segment: PlannedTask[] = []
      let total = 0
      for (const task of group) {
        const taskMinutes = minutes(task.suggestedStart, task.suggestedEnd)
        if (segment.length && total + taskMinutes > 120) {
          if (total >= minimumMinutes) blocks.push(this.toBlock(segment))
          segment = []; total = 0
        }
        segment.push(task); total += taskMinutes
        if (total >= preferredMinutes) {
          blocks.push(this.toBlock(segment)); segment = []; total = 0
        }
      }
      if (total >= minimumMinutes) blocks.push(this.toBlock(segment))
      group = []
    }
    for (const task of sorted) {
      const previous = group.at(-1)
      if (!highEnergy(task) || (previous && previous.suggestedEnd !== task.suggestedStart)) {
        flush()
        if (!highEnergy(task)) continue
      }
      group.push(task)
    }
    flush()
    return blocks
  }

  private toBlock(tasks: PlannedTask[]): FocusBlock {
    const first = tasks[0], last = tasks.at(-1)!
    return {
      id: `focus:${tasks.map((task) => task.taskId).join(':')}`,
      start: first.suggestedStart,
      end: last.suggestedEnd,
      durationMinutes: minutes(first.suggestedStart, last.suggestedEnd),
      taskIds: tasks.map((task) => task.taskId),
      protected: true,
    }
  }
}
