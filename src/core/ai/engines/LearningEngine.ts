import { adaptFromOutcome } from '../../../ai-planning/adaptiveRules'
import type { PlanOutcome } from '../../../ai-planning/domain'
import type { Task } from '../../../domain/models'
import type { AIEngine, LearningProfileRepository } from '../interfaces'
import type { EngineResult, LearningProfile } from '../models'

export class LearningEngine implements AIEngine<{ userId: string; tasks: Task[]; outcomes: PlanOutcome[] }, LearningProfile> {
  readonly name = 'LearningEngine'
  private readonly repository: LearningProfileRepository
  constructor(repository: LearningProfileRepository) { this.repository = repository }
  execute({ userId, tasks, outcomes }: { userId: string; tasks: Task[]; outcomes: PlanOutcome[] }): EngineResult<LearningProfile> {
    const recent = outcomes.slice(-10)
    const adaptations = recent.map((outcome) => adaptFromOutcome(tasks, outcome))
    const last = adaptations.at(-1)
    const profile: LearningProfile = {
      userId,
      preferredPeriods: {},
      idealBlockMinutes: last?.blockMinutes ?? 50,
      breakMinutes: last?.breakMinutes ?? 10,
      dailyLoadFactor: last?.dailyLoadFactor ?? 1,
      fatigueFactor: recent.length ? recent.filter((outcome) => outcome.energy === 'baja' || outcome.realistic === false).length / recent.length : 0,
      sampleSize: recent.length,
      updatedAt: new Date().toISOString(),
    }
    this.repository.save(userId, profile)
    return { value: profile, generatedAt: profile.updatedAt, provenance: 'ESTIMATED', explanations: last?.explanation ?? ['Aún no hay revisiones suficientes; se conservan valores neutrales.'] }
  }
}
