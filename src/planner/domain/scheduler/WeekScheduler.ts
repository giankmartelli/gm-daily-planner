import type { PlanWeekCommand } from '../../application/commands/PlannerCommands'
import type { PlanWeekResult } from '../entities/Planning'
import { DayScheduler } from './DayScheduler'

export class WeekScheduler {
  private readonly dayScheduler: DayScheduler
  constructor(dayScheduler = new DayScheduler()) { this.dayScheduler = dayScheduler }
  schedule(command: PlanWeekCommand): PlanWeekResult {
    const remaining = [...command.tasks]; const days = []
    for (let index = 0; index < 7; index += 1) { const date = new Date(`${command.weekStart}T12:00:00`); date.setDate(date.getDate() + index); if (!command.profile.workDays.includes(date.getDay())) continue; const key = new Intl.DateTimeFormat('sv-SE').format(date); const eligible = remaining.filter((task) => !task.preferredDays.length || task.preferredDays.includes(date.getDay())); const plan = this.dayScheduler.schedule({ ...command, date: key, tasks: eligible }); days.push(plan); const planned = new Set(plan.blocks.flatMap((block) => block.taskId ? [block.taskId] : [])); for (let cursor = remaining.length - 1; cursor >= 0; cursor -= 1) if (planned.has(remaining[cursor].id)) remaining.splice(cursor, 1) }
    return { days, unscheduledTasks: remaining.filter((task) => !task.completed) }
  }
}
