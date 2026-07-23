import type { EngineContext } from '../models'
import { PlannerEngine } from '../engines/PlannerEngine'

export class BuildDailyIntelligence {
  private readonly planner: PlannerEngine
  constructor(planner = new PlannerEngine()) { this.planner = planner }
  execute(context: EngineContext) { return this.planner.analyze(context) }
}
