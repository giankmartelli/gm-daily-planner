import type { LearningEvent, LearningPattern } from '../../domain/entities/Planning'
import type { LearningRepository } from '../../domain/interfaces/PlannerPorts'

const eventsKey = 'gm-planner:learning:events:v1', patternKey = 'gm-planner:learning:pattern:v1'
export class LocalLearningRepository implements LearningRepository {
  list(): LearningEvent[] { try { return JSON.parse(localStorage.getItem(eventsKey) ?? '[]') as LearningEvent[] } catch { return [] } }
  append(events: LearningEvent[]) { try { localStorage.setItem(eventsKey, JSON.stringify([...this.list(), ...events].slice(-5000))) } catch { /* El motor sigue siendo funcional sin telemetría local. */ } }
  savePattern(pattern: LearningPattern) { try { localStorage.setItem(patternKey, JSON.stringify(pattern)) } catch { /* Almacenamiento opcional. */ } }
  getPattern(): LearningPattern | undefined { try { const raw = localStorage.getItem(patternKey); return raw ? JSON.parse(raw) as LearningPattern : undefined } catch { return undefined } }
}
export class MemoryLearningRepository implements LearningRepository { private events: LearningEvent[] = []; private pattern?: LearningPattern; list() { return [...this.events] } append(events: LearningEvent[]) { this.events.push(...events) } savePattern(pattern: LearningPattern) { this.pattern = pattern } getPattern() { return this.pattern } }
