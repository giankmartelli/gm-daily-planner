import type { Goal, Habit } from '../../../domain/models'
import type { BusyBlock, LearningEvent, PlanResult } from '../../domain/entities/Planning'
import type { PlannerTask } from '../../domain/entities/PlannerTask'
import type { UserPlanningProfile } from '../../domain/entities/UserPlanningProfile'

export type PlanDayCommand = { date: string; tasks: PlannerTask[]; events?: BusyBlock[]; habits?: Habit[]; goals?: Goal[]; profile: UserPlanningProfile; now?: string }
export type PlanWeekCommand = Omit<PlanDayCommand, 'date'> & { weekStart: string }
export type RecalculateCommand = PlanDayCommand & { currentPlan: PlanResult; trigger: 'task-delayed' | 'event-created' | 'event-overrun' | 'task-moved' | 'block-deleted' | 'task-completed-early' | 'task-cancelled'; at: string }
export type LearnCommand = { events: LearningEvent[] }
