import type { PlanDayCommand, PlanWeekCommand, RecalculateCommand } from '../commands/PlannerCommands'
import type { RankTasksQuery } from '../queries/PlannerQueries'
import type { PlanResult } from '../../domain/entities/Planning'
import type { PlannerTask } from '../../domain/entities/PlannerTask'
import { TaskRanker } from '../../domain/ranking/TaskRanker'
import { DayScheduler } from '../../domain/scheduler/DayScheduler'
import { WeekScheduler } from '../../domain/scheduler/WeekScheduler'

export class PlanDayUseCase { private readonly scheduler: DayScheduler; constructor(scheduler = new DayScheduler()) { this.scheduler = scheduler } execute(command: PlanDayCommand) { return this.scheduler.schedule(command) } }
export class PlanWeekUseCase { private readonly scheduler: WeekScheduler; constructor(scheduler = new WeekScheduler()) { this.scheduler = scheduler } execute(command: PlanWeekCommand) { return this.scheduler.schedule(command) } }
export class RankTasksUseCase { private readonly ranker: TaskRanker; constructor(ranker = new TaskRanker()) { this.ranker = ranker } execute(query: RankTasksQuery) { return this.ranker.rank(query.tasks, { date: query.date, time: query.time, completedTaskIds: new Set(query.completedTaskIds ?? []), profile: query.profile, learning: query.learning, goals: query.goals, habitsCompleted: query.habitsCompleted }) } }
export class RecalculateUseCase {
  private readonly scheduler: DayScheduler
  constructor(scheduler = new DayScheduler()) { this.scheduler = scheduler }
  execute(command: RecalculateCommand): PlanResult {
    const atMinutes = Number(command.at.slice(0, 2)) * 60 + Number(command.at.slice(3, 5))
    const preserved = command.currentPlan.blocks.filter((block) => block.locked || (Number(block.start.slice(0, 2)) * 60 + Number(block.start.slice(3, 5))) < atMinutes)
    const preservedTaskIds = new Set(preserved.flatMap((block) => block.taskId ? [block.taskId] : []))
    const events = [...(command.events ?? []), ...preserved.map((block) => ({ id: block.id, title: block.title, start: block.start, end: block.end, locked: true, kind: block.kind }))]
    return this.scheduler.schedule({ ...command, tasks: command.tasks.filter((task) => !preservedTaskIds.has(task.id)), events, profile: { ...command.profile, workingHours: { ...command.profile.workingHours, from: command.at } }, now: command.at })
  }
}
export class OptimizeUseCase { execute(plan: PlanResult): PlanResult { const blocks = [...plan.blocks].sort((a, b) => a.start.localeCompare(b.start)); return { ...plan, blocks, explanation: [...plan.explanation, 'El plan fue normalizado para reducir fragmentación y conservar los bloques protegidos.'] } } }
export function completionRisk(tasks: PlannerTask[], plan: PlanResult) { return Math.max(plan.risk, plan.unscheduledTasks.length / Math.max(1, tasks.filter((task) => !task.completed).length)) }
