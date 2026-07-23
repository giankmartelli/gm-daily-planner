import type { PlanProposal, PlanningContext } from './domain'
import { createPlanProposal, type ProposalInput } from './engine'

export type AIPlanningInput = ProposalInput
export type AIPlanningOutput = PlanProposal
export type PlanExplanationInput = { proposal: PlanProposal }
export type PlanExplanation = { summary: string; insights: string[] }
export type AdjustmentInput = { proposal: PlanProposal; instruction: string }
export type AdjustmentOutput = PlanProposal

export interface PlannerAIProvider {
  generateBrief(input: AIPlanningInput): Promise<AIPlanningOutput>
  explainProposal(input: PlanExplanationInput): Promise<PlanExplanation>
  suggestAdjustments(input: AdjustmentInput): Promise<AdjustmentOutput>
}

export class DeterministicPlannerProvider implements PlannerAIProvider {
  async generateBrief(input: AIPlanningInput) { return createPlanProposal(input) }
  async explainProposal({ proposal }: PlanExplanationInput) {
    return { summary: `${proposal.changes.length} cambios propuestos con ${proposal.completionProbability}% de probabilidad estimada.`, insights: proposal.insights.map((item) => item.explanation) }
  }
  async suggestAdjustments({ proposal }: AdjustmentInput) { return proposal }
}

export class MockPlannerAIProvider extends DeterministicPlannerProvider {}

export class RemotePlannerAIProvider implements PlannerAIProvider {
  private readonly endpoint?: string
  private readonly fallback: PlannerAIProvider
  private readonly getAccessToken?: () => Promise<string | undefined>
  constructor(endpoint?: string, fallback: PlannerAIProvider = new DeterministicPlannerProvider(), getAccessToken?: () => Promise<string | undefined>) {
    this.endpoint = endpoint
    this.fallback = fallback
    this.getAccessToken = getAccessToken
  }
  async generateBrief(input: AIPlanningInput): Promise<PlanProposal> {
    const local = await this.fallback.generateBrief(input)
    if (!this.endpoint) return local
    try {
      const remote = await this.request('generateBrief', {
        date: input.context.date,
        energy: input.energy,
        completionProbability: local.completionProbability,
        taskSignals: (input.context.tasks.value ?? []).map((task) => ({
          id: task.id, priority: task.priority, completed: task.completed,
          estimatedMinutes: task.estimatedMinutes, dueDate: task.dueDate,
        })),
        calendar: (input.context.calendar.value ?? []).map(({ id, start, end, locked }) => ({ id, start, end, locked })),
        changes: local.changes.map(({ id, type, confidence, riskLevel, proposedState }) => ({ id, type, confidence, riskLevel, proposedState: { start: proposedState.start, end: proposedState.end } })),
      })
      const response = remote as { summary: string; insights: string[]; risks: string[] }
      return {
        ...local,
        provider: 'remote' as const,
        insights: [
          ...local.insights,
          ...response.insights.map((explanation) => ({ id: crypto.randomUUID(), title: 'Análisis remoto', explanation, provenance: 'AI_SUGGESTION' as const, confidence: 'medium' as const })),
        ],
        probabilityExplanation: [...local.probabilityExplanation, ...response.risks],
      }
    } catch { return local }
  }
  async explainProposal(input: PlanExplanationInput) {
    if (!this.endpoint) return this.fallback.explainProposal(input)
    try { return await this.request('explainProposal', sanitizeProposal(input.proposal)) as PlanExplanation }
    catch { return this.fallback.explainProposal(input) }
  }
  async suggestAdjustments(input: AdjustmentInput) {
    if (!this.endpoint) return this.fallback.suggestAdjustments(input)
    try {
      const result = await this.request('suggestAdjustments', { proposal: sanitizeProposal(input.proposal), instruction: input.instruction })
      return validateProposal(result, input.proposal.context)
    } catch { return this.fallback.suggestAdjustments(input) }
  }
  private async request(action: string, payload: unknown) {
    const token = await this.getAccessToken?.()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch(this.endpoint!, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, payload }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Planner remoto respondió ${response.status}`)
      return await response.json() as unknown
    } finally { window.clearTimeout(timer) }
  }
}

function validateProposal(value: unknown, context: PlanningContext): PlanProposal {
  if (!value || typeof value !== 'object') throw new Error('Salida del planner inválida')
  const candidate = value as Partial<PlanProposal>
  if (!candidate.id || !Array.isArray(candidate.changes) || typeof candidate.completionProbability !== 'number') throw new Error('Salida del planner incompleta')
  if (candidate.completionProbability < 0 || candidate.completionProbability > 100) throw new Error('Probabilidad fuera de rango')
  return { ...candidate, context } as PlanProposal
}

function sanitizeProposal(proposal: PlanProposal) {
  return {
    id: proposal.id, date: proposal.date, completionProbability: proposal.completionProbability,
    changes: proposal.changes.map(({ id, type, explanation, confidence, riskLevel, status, proposedState }) => ({
      id, type, explanation, confidence, riskLevel, status,
      proposedState: { start: proposedState.start, end: proposedState.end },
    })),
  }
}
