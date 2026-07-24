import type { StatisticalProfile, TaskHistory } from './PlannerTypes'
import { TimeEstimator } from './TimeEstimator'

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

export class LearningEngine {
  private readonly estimator: TimeEstimator

  constructor(estimator = new TimeEstimator()) {
    this.estimator = estimator
  }

  buildProfile(history: TaskHistory[]): StatisticalProfile {
    const taskIds = [...new Set(history.flatMap((sample) => sample.taskId ? [sample.taskId] : []))]
    const contexts = [...new Set(history.flatMap((sample) => sample.context ? [sample.context] : []))]
    const starts = history.flatMap((sample) => sample.actualStart ? [new Date(sample.actualStart).getHours()] : [])
    return {
      sampleSize: history.length,
      completionRate: average(history.map((sample) => sample.completed ? 1 : 0)),
      cancellationRate: average(history.map((sample) => sample.cancelled ? 1 : 0)),
      rescheduleRate: average(history.map((sample) => sample.rescheduled ? 1 : 0)),
      averageProductivity: average(history.map((sample) => sample.productivity ?? (sample.completed ? 1 : 0))),
      durationByTask: Object.fromEntries(taskIds.map((id) => [id, this.estimator.estimate({ id, title: id }, history)])),
      durationByContext: Object.fromEntries(contexts.map((context) => [context, this.estimator.estimate({ id: '', title: context, context }, history)])),
      preferredStartHour: starts.length ? Math.round(average(starts)) : undefined,
    }
  }
}
