import type { EngineContext, ExecutiveAnalytics, MorningBrief, Prediction } from '../models'
import { DecisionEngine } from './DecisionEngine'
import { EnergyEngine } from './EnergyEngine'
import { ExecutiveAnalyticsEngine } from './ExecutiveAnalyticsEngine'
import { MorningBriefEngine } from './MorningBriefEngine'
import { PredictionEngine } from './PredictionEngine'

export class PlannerEngine {
  readonly decisions: DecisionEngine
  readonly energy: EnergyEngine
  readonly predictions: PredictionEngine
  readonly morningBrief: MorningBriefEngine
  readonly executive: ExecutiveAnalyticsEngine
  constructor(decisions = new DecisionEngine(), energy = new EnergyEngine(), predictions = new PredictionEngine(), morningBrief = new MorningBriefEngine(decisions, predictions), executive = new ExecutiveAnalyticsEngine()) {
    this.decisions = decisions; this.energy = energy; this.predictions = predictions; this.morningBrief = morningBrief; this.executive = executive
  }
  analyze(context: EngineContext): { brief: MorningBrief; prediction: Prediction; analytics: ExecutiveAnalytics } {
    return {
      brief: this.morningBrief.execute(context).value,
      prediction: this.predictions.execute(context).value,
      analytics: this.executive.execute(context).value,
    }
  }
}
