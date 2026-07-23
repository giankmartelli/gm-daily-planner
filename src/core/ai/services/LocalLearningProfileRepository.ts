import type { LearningProfileRepository } from '../interfaces'

export class LocalLearningProfileRepository implements LearningProfileRepository {
  get(userId: string) {
    const value = localStorage.getItem(`gm-ai-os:learning:${userId}`)
    return value ? JSON.parse(value) as unknown : null
  }
  save(userId: string, value: unknown) { localStorage.setItem(`gm-ai-os:learning:${userId}`, JSON.stringify(value)) }
}
