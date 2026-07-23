import type { PlanProposal } from '../../../ai-planning/domain'
import { createPlanProposal } from '../../../ai-planning/engine'
import type { AIEngine } from '../interfaces'
import type { EngineResult } from '../models'
import type { ProposalInput } from '../../../ai-planning/engine'

export class AutoScheduler implements AIEngine<ProposalInput, PlanProposal> {
  readonly name = 'AutoScheduler'
  execute(input: ProposalInput): EngineResult<PlanProposal> {
    const proposal = createPlanProposal(input)
    return { value: proposal, generatedAt: proposal.createdAt, provenance: 'AI_SUGGESTION', explanations: ['Propuesta únicamente; requiere confirmación explícita antes de aplicarse.'] }
  }
}
