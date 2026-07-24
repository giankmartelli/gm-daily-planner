import type { DurationEstimate, PlannerTaskV3, TaskHistory } from './PlannerTypes'

const clampMinutes = (value: number) => Math.min(1440, Math.max(5, Math.round(value)))

function calculate(samples: TaskHistory[], fallback: number): DurationEstimate {
  if (!samples.length) return { predictedMinutes: clampMinutes(fallback), averageMinutes: clampMinutes(fallback), standardDeviation: 0, averageError: 0, sampleSize: 0, confidence: 0.35 }
  const actual = samples.map((sample) => Math.max(1, sample.actualMinutes))
  const average = actual.reduce((sum, value) => sum + value, 0) / actual.length
  const variance = actual.reduce((sum, value) => sum + (value - average) ** 2, 0) / actual.length
  const error = samples.reduce((sum, sample) => sum + Math.abs(sample.actualMinutes - sample.plannedMinutes), 0) / samples.length
  const correction = samples.reduce((sum, sample) => sum + sample.actualMinutes / Math.max(1, sample.plannedMinutes), 0) / samples.length
  return {
    predictedMinutes: clampMinutes(fallback * correction),
    averageMinutes: clampMinutes(average),
    standardDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
    averageError: Math.round(error * 100) / 100,
    sampleSize: samples.length,
    confidence: Math.min(0.95, 0.45 + samples.length * 0.05),
  }
}

export class TimeEstimator {
  estimate(task: PlannerTaskV3, history: TaskHistory[] = []): DurationEstimate {
    const fallback = task.estimatedMinutes ?? 30
    const exact = history.filter((sample) => sample.taskId === task.id && sample.actualMinutes > 0)
    if (exact.length) return calculate(exact, fallback)
    const contextual = history.filter((sample) => task.context && sample.context === task.context && sample.actualMinutes > 0)
    return calculate(contextual, fallback)
  }
}
