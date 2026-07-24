import type { EnergyLevelV3, PlannedTask } from '../planner-engine'
import type { FocusBlock, OptimizationWeights, OptimizerPreferences, PlanMetrics } from './ConstraintModel'

const energyRank: Record<EnergyLevelV3, number> = { muy_baja: 0, baja: 1, media: 2, alta: 3, muy_alta: 4 }
const minutes = (start: string, end: string) => Math.max(0, (Date.parse(end) - Date.parse(start)) / 60_000)
const clamp = (value: number) => Math.min(1, Math.max(0, value))

function levelAt(time: string, preferences: OptimizerPreferences): EnergyLevelV3 {
  return preferences.energyForecast.find((point) => point.start <= time && time < point.end)?.level ?? 'media'
}

export class MetricsEngine {
  measure(tasks: PlannedTask[], focusBlocks: FocusBlock[], preferences: OptimizerPreferences): PlanMetrics {
    const sorted = [...tasks].sort((a, b) => a.suggestedStart.localeCompare(b.suggestedStart))
    let contextSwitches = 0, idleMinutes = 0, overlaps = 0, fatigue = 0, highRun = 0
    for (let index = 0; index < sorted.length; index += 1) {
      const task = sorted[index], previous = sorted[index - 1]
      if (previous) {
        const gap = minutes(previous.suggestedEnd, task.suggestedStart)
        if (previous.suggestedEnd > task.suggestedStart) overlaps += 1
        else idleMinutes += gap
        if ((preferences.taskContexts[previous.taskId] ?? previous.taskId) !== (preferences.taskContexts[task.taskId] ?? task.taskId)) contextSwitches += 1
      }
      highRun = energyRank[task.energyRequired] >= 3 ? highRun + 1 : 0
      if (highRun > preferences.maximumConsecutiveHighEnergy) fatigue += highRun - preferences.maximumConsecutiveHighEnergy
    }
    const smallBlocks = sorted.filter((task) => minutes(task.suggestedStart, task.suggestedEnd) < preferences.minimumBlockMinutes).length
    const fragmentation = Math.max(0, sorted.length - focusBlocks.reduce((sum, block) => sum + block.taskIds.length - 1, 0) - 1)
    const deepWorkMinutes = focusBlocks.reduce((sum, block) => sum + block.durationMinutes, 0)
    const continuousFlowMinutes = sorted.reduce((best, task, index) => {
      if (!index || sorted[index - 1].suggestedEnd !== task.suggestedStart) return Math.max(best, minutes(task.suggestedStart, task.suggestedEnd))
      let start = index - 1
      while (start > 0 && sorted[start - 1].suggestedEnd === sorted[start].suggestedStart) start -= 1
      return Math.max(best, minutes(sorted[start].suggestedStart, task.suggestedEnd))
    }, 0)
    const priorityValue = sorted.reduce((sum, task) => sum + task.priority, 0) / Math.max(sorted.length * 100, 1)
    const energyAlignment = sorted.reduce((sum, task) => sum + (energyRank[levelAt(task.suggestedStart, preferences)] >= energyRank[task.energyRequired] ? 1 : 0), 0) / Math.max(sorted.length, 1)
    const dependencyCompliance = sorted.reduce((sum, task, index) => sum + (task.dependencies.every((id) => !sorted.some((candidate, candidateIndex) => candidate.taskId === id && candidateIndex > index)) ? 1 : 0), 0) / Math.max(sorted.length, 1)
    const completionProbability = clamp(0.95 - fatigue * 0.04 - overlaps * 0.2 - smallBlocks * 0.01)
    const satisfaction = clamp(0.45 + deepWorkMinutes / 600 + energyAlignment * 0.25 - contextSwitches * 0.015)
    const interruptions = Math.max(0, contextSwitches - focusBlocks.length)
    const raw = this.weightedScore({
      contextSwitches, fragmentation, fatigue, smallBlocks, idleMinutes, interruptions, overlaps,
      deepWorkMinutes, continuousFlowMinutes, priorityValue, energyAlignment, completionProbability,
      satisfaction, dependencyCompliance,
    }, preferences.weights)
    return {
      score: Math.round(clamp(raw) * 10000) / 100,
      cost: Math.round((1 - clamp(raw)) * 10000) / 100,
      contextSwitches, fragmentation, fatigue, smallBlocks, idleMinutes, interruptions, overlaps,
      deepWorkMinutes, continuousFlowMinutes, priorityValue, energyAlignment, completionProbability,
      satisfaction, dependencyCompliance,
    }
  }

  private weightedScore(metrics: Omit<PlanMetrics, 'score' | 'cost'>, weights: OptimizationWeights) {
    const negative = {
      contextSwitches: 1 - clamp(metrics.contextSwitches / 10),
      fragmentation: 1 - clamp(metrics.fragmentation / 10),
      fatigue: 1 - clamp(metrics.fatigue / 10),
      smallBlocks: 1 - clamp(metrics.smallBlocks / 10),
      idleTime: 1 - clamp(metrics.idleMinutes / 240),
      interruptions: 1 - clamp(metrics.interruptions / 10),
      overlaps: metrics.overlaps ? 0 : 1,
    }
    const positive = {
      deepWork: clamp(metrics.deepWorkMinutes / 240),
      continuousFlow: clamp(metrics.continuousFlowMinutes / 240),
      completedPriority: metrics.priorityValue,
      energyAlignment: metrics.energyAlignment,
      completionProbability: metrics.completionProbability,
      satisfaction: metrics.satisfaction,
      urgency: metrics.priorityValue,
      dependencies: metrics.dependencyCompliance,
      delays: 1 - clamp(metrics.idleMinutes / 480),
      streaks: 0.5,
    }
    const entries = Object.entries(weights) as Array<[keyof OptimizationWeights, number]>
    const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0) || 1
    return entries.reduce((sum, [key, weight]) => sum + (key in negative ? negative[key as keyof typeof negative] : positive[key as keyof typeof positive]) * Math.max(0, weight), 0) / total
  }
}
