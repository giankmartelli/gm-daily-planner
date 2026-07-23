import type { LearningEvent, LearningPattern } from '../entities/Planning'
import type { LearningRepository } from '../interfaces/PlannerPorts'

export class LearningEngine {
  private readonly repository: LearningRepository
  constructor(repository: LearningRepository) { this.repository = repository }
  learn(events: LearningEvent[]): LearningPattern {
    if (events.length) this.repository.append(events)
    const samples = this.repository.list(); const completed = samples.filter((event) => event.completed); const contexts: Record<string, { completed: number; total: number }> = {}; const hourSuccess = new Map<number, number[]>()
    for (const event of samples) { const key = event.context ?? 'general'; contexts[key] ??= { completed: 0, total: 0 }; contexts[key].total += 1; if (event.completed) contexts[key].completed += 1; if (event.actualStart) { const hour = new Date(event.actualStart).getHours(); const values = hourSuccess.get(hour) ?? []; values.push(event.productivity); hourSuccess.set(hour, values) } }
    const pattern: LearningPattern = { sampleSize: samples.length, completionRate: completed.length / Math.max(1, samples.length), averageDelayMinutes: samples.reduce((sum, event) => sum + Math.max(0, event.delayedMinutes), 0) / Math.max(1, samples.length), effectiveHours: [...hourSuccess].filter(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length >= .65).map(([hour]) => hour).sort((a, b) => a - b), contextPerformance: Object.fromEntries(Object.entries(contexts).map(([key, value]) => [key, value.completed / value.total])), updatedAt: new Date().toISOString() }
    this.repository.savePattern(pattern); return pattern
  }
}
