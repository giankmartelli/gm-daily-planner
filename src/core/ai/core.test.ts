import { describe, expect, it, vi } from 'vitest'
import { emptyDay, normalizeTask, type DayData } from '../../domain/models'
import type { EngineContext } from './models'
import { DecisionEngine } from './engines/DecisionEngine'
import { EnergyEngine } from './engines/EnergyEngine'
import { PredictionEngine } from './engines/PredictionEngine'
import { MorningBriefEngine } from './engines/MorningBriefEngine'
import { ExecutiveAnalyticsEngine } from './engines/ExecutiveAnalyticsEngine'
import { FallbackProvider, type AIProvider } from './providers'
import { AutoScheduler } from './engines/AutoScheduler'
import { LearningEngine } from './engines/LearningEngine'
import { PlannerEngine } from './engines/PlannerEngine'
import { InMemoryEventBus } from './services/EventBus'
import { BuildDailyIntelligence } from './usecases/BuildDailyIntelligence'
import type { LearningProfileRepository } from './interfaces'
import type { PlanningContext } from '../../ai-planning/domain'

const task = normalizeTask({ id: 'a', title: 'Entrega', priority: 'alta', dueDate: '2026-07-22', estimatedMinutes: 90, focusRequired: .9, deepWork: true })
const day: DayData = { ...emptyDay(), tasks: [task] }
const context: EngineContext = { date: '2026-07-23', day, goals: [], sessions: [], outcomes: [], history: [{ date: '2026-07-22', day }], availableMinutes: 240 }

describe('GM AI Core', () => {
  it('ordena decisiones y explica el score', () => {
    const result = new DecisionEngine().execute({ tasks: [task], date: context.date, availableMinutes: 240 })
    expect(result.value[0].score).toBeGreaterThan(70)
    expect(result.value[0].explanation.join(' ')).toContain('Vencida')
  })
  it('clasifica carga sin inventar fuentes externas', () => {
    expect(new EnergyEngine().execute({ tasks: [task] }).value[0]).toMatchObject({ classification: 'Deep Work' })
  })
  it('predice con factores verificables', () => {
    const prediction = new PredictionEngine().execute(context)
    expect(prediction.value.probability).toBeGreaterThanOrEqual(0)
    expect(prediction.value.factors).toHaveLength(4)
  })
  it('genera Morning Brief tipado y marca fuentes ausentes', () => {
    const brief = new MorningBriefEngine().execute(context).value
    expect(brief.todayFocus).toBe('Entrega')
    expect(brief.missingSources).toContain('Clima')
  })
  it('calcula analytics ejecutivos ligeros', () => {
    const analytics = new ExecutiveAnalyticsEngine().execute(context).value
    expect(analytics.energyDistribution.media).toBe(90)
    expect(analytics.productivityTrend).toHaveLength(1)
  })
  it('usa fallback cuando el proveedor primario falla', async () => {
    const primary: AIProvider = { kind: 'remote', generate: vi.fn().mockRejectedValue(new Error('offline')) }
    const value = await new FallbackProvider(primary).generate('test', {}, () => ({ ok: true }))
    expect(value).toEqual({ ok: true })
  })
  it('orquesta el conjunto completo desde el caso de uso', () => {
    const result = new BuildDailyIntelligence(new PlannerEngine()).execute(context)
    expect(result.brief.todayFocus).toBe('Entrega')
    expect(result.analytics.todayScore).toBe(0)
  })
  it('AutoScheduler devuelve propuesta sin aplicarla', () => {
    const planningContext: PlanningContext = {
      date: context.date, generatedAt: new Date().toISOString(),
      tasks: { status: 'CONFIRMED', source: 'test', value: [{ ...task, normalizedDuration: 90 }] },
      calendar: { status: 'CONFIRMED', source: 'test', value: [] },
      goals: { status: 'CONFIRMED', source: 'test', value: [] },
      focusHistory: { status: 'CONFIRMED', source: 'test', value: [] },
      energy: { status: 'UNAVAILABLE', source: 'test' }, weather: { status: 'UNAVAILABLE', source: 'test' }, sleep: { status: 'UNAVAILABLE', source: 'test' }, constraints: [],
    }
    const result = new AutoScheduler().execute({ context: planningContext, availableFrom: '08:00', availableUntil: '12:00', energy: 'media' })
    expect(result.value.status).toBe('draft')
    expect(result.provenance).toBe('AI_SUGGESTION')
  })
  it('LearningEngine guarda un perfil explicable', () => {
    const store = new Map<string, unknown>()
    const repository: LearningProfileRepository = { get: (id) => store.get(id), save: (id, value) => { store.set(id, value) } }
    const result = new LearningEngine(repository).execute({ userId: 'u', tasks: [task], outcomes: [] })
    expect(result.value.sampleSize).toBe(0)
    expect(store.has('u')).toBe(true)
  })
  it('publica y desuscribe eventos de dominio', () => {
    const bus = new InMemoryEventBus(), handler = vi.fn()
    const unsubscribe = bus.subscribe('plan.created', handler)
    bus.publish({ type: 'plan.created', payload: { id: 'p' }, occurredAt: new Date().toISOString() })
    unsubscribe()
    bus.publish({ type: 'plan.created', payload: { id: 'x' }, occurredAt: new Date().toISOString() })
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
