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
  constructor(endpoint?: string, fallback: PlannerAIProvider = new DeterministicPlannerProvider()) {
    this.endpoint = endpoint
    this.fallback = fallback
  }
  async generateBrief(input: AIPlanningInput) {
    if (!this.endpoint) return this.fallback.generateBrief(input)
    try {
      const response = await fetch(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
      if (!response.ok) throw new Error(`Planner remoto respondió ${response.status}`)
      return validateProposal(await response.json(), input.context)
    } catch { return this.fallback.generateBrief(input) }
  }
  async explainProposal(input: PlanExplanationInput) { return this.fallback.explainProposal(input) }
  async suggestAdjustments(input: AdjustmentInput) { return this.fallback.suggestAdjustments(input) }
}

function validateProposal(value: unknown, context: PlanningContext): PlanProposal {
  if (!value || typeof value !== 'object') throw new Error('Salida del planner inválida')
  const candidate = value as Partial<PlanProposal>
  if (!candidate.id || !Array.isArray(candidate.changes) || typeof candidate.completionProbability !== 'number') throw new Error('Salida del planner incompleta')
  if (candidate.completionProbability < 0 || candidate.completionProbability > 100) throw new Error('Probabilidad fuera de rango')
  return { ...candidate, context } as PlanProposal
}
