import type { EngineResult } from '../models'

export interface AIEngine<I, O> {
  readonly name: string
  execute(input: I): Promise<EngineResult<O>> | EngineResult<O>
}

export interface AIProvider {
  readonly kind: 'remote' | 'deterministic' | 'fallback'
  generate<TInput, TOutput>(operation: string, input: TInput, local: () => TOutput): Promise<TOutput>
}

export interface LearningProfileRepository {
  get(userId: string): Promise<unknown> | unknown
  save(userId: string, value: unknown): Promise<void> | void
}

export type DomainEvent<T = unknown> = { type: string; payload: T; occurredAt: string }
export interface EventBus {
  publish<T>(event: DomainEvent<T>): void
  subscribe(type: string, handler: (event: DomainEvent) => void): () => void
}
