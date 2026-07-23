import type { PlannerTask } from '../entities/PlannerTask'
import { ScoringService, type ScoreContext, type TaskScore } from '../services/ScoringService'

export class TaskRanker {
  private readonly scoring: ScoringService
  constructor(scoring = new ScoringService()) { this.scoring = scoring }
  rank(tasks: PlannerTask[], context: ScoreContext): TaskScore[] { return tasks.filter((task) => !task.completed).map((task) => this.scoring.score(task, context)).sort((a, b) => b.total - a.total || a.task.estimatedMinutes - b.task.estimatedMinutes || a.task.createdAt.localeCompare(b.task.createdAt)) }
}
