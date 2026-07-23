import type { Goal } from '../../../domain/models'
import type { LearningPattern } from '../../domain/entities/Planning'
import type { PlannerTask } from '../../domain/entities/PlannerTask'
import type { UserPlanningProfile } from '../../domain/entities/UserPlanningProfile'

export type RankTasksQuery = { tasks: PlannerTask[]; date: string; time: string; profile: UserPlanningProfile; completedTaskIds?: string[]; learning?: LearningPattern; goals?: Goal[]; habitsCompleted?: number }
