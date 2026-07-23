import type { DomainEvent, EventBus } from '../interfaces'

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<(event: DomainEvent) => void>>()
  publish<T>(event: DomainEvent<T>) { this.handlers.get(event.type)?.forEach((handler) => handler(event as DomainEvent)) }
  subscribe(type: string, handler: (event: DomainEvent) => void) {
    const set = this.handlers.get(type) ?? new Set()
    set.add(handler); this.handlers.set(type, set)
    return () => set.delete(handler)
  }
}
