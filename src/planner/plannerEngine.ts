import type { LearnCommand, PlanDayCommand, PlanWeekCommand, RecalculateCommand } from './application/commands/PlannerCommands'
import type { RankTasksQuery } from './application/queries/PlannerQueries'
import { OptimizeUseCase, PlanDayUseCase, PlanWeekUseCase, RankTasksUseCase, RecalculateUseCase } from './application/useCases/PlannerUseCases'
import type { LearningEvent, PlanResult } from './domain/entities/Planning'
import type { PlannerTask } from './domain/entities/PlannerTask'
import type { UserPlanningProfile } from './domain/entities/UserPlanningProfile'
import { FocusService } from './domain/services/FocusService'
import { SubtaskService } from './domain/services/SubtaskService'
import { LearningEngine } from './domain/learning/LearningEngine'
import { LocalLearningRepository, MemoryLearningRepository } from './infrastructure/storage/LocalLearningRepository'
import { DayRescheduler } from './domain/rescheduling/DayRescheduler'
import { DeterministicTaskBreakdownProvider } from './domain/services/TaskBreakdownService'

export class PlannerEngine {
  private readonly day = new PlanDayUseCase()
  private readonly week = new PlanWeekUseCase()
  private readonly recalculateDay = new RecalculateUseCase()
  private readonly ranking = new RankTasksUseCase()
  private readonly optimizer = new OptimizeUseCase()
  private readonly subtasks = new SubtaskService()
  private readonly focus = new FocusService()
  private readonly learning = new LearningEngine(typeof localStorage === 'undefined' ? new MemoryLearningRepository() : new LocalLearningRepository())
  private readonly rescheduler = new DayRescheduler()
  private readonly breakdown = new DeterministicTaskBreakdownProvider()

  planDay(command: PlanDayCommand) { return this.day.execute(command) }
  planWeek(command: PlanWeekCommand) { return this.week.execute(command) }
  recalculate(command: RecalculateCommand) { return this.recalculateDay.execute(command) }
  compareReschedule(command: RecalculateCommand) { return this.rescheduler.compare(command) }
  rankTasks(query: RankTasksQuery) { return this.ranking.execute(query) }
  optimize(plan: PlanResult) { return this.optimizer.execute(plan) }
  splitTask(task: PlannerTask) { return this.subtasks.split(task) }
  proposeTaskBreakdown(task:PlannerTask,reason?:string){return this.breakdown.createBreakdown({task,reason})}
  buildFocusBlocks(input: { date: string; events: Parameters<FocusService['build']>[1]; profile: UserPlanningProfile }) { return this.focus.build(input.date, input.events, input.profile) }
  learn(command: LearnCommand | LearningEvent[]) { return this.learning.learn(Array.isArray(command) ? command : command.events) }
}

export const planner = new PlannerEngine()
