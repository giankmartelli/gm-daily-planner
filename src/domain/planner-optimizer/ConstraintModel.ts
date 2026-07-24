import type { DailyPlan, EnergyLevelV3, PlannedTask } from '../planner-engine'

export type OptimizationWeights = {
  contextSwitches: number
  fragmentation: number
  fatigue: number
  smallBlocks: number
  idleTime: number
  interruptions: number
  overlaps: number
  deepWork: number
  continuousFlow: number
  completedPriority: number
  energyAlignment: number
  completionProbability: number
  satisfaction: number
  urgency: number
  dependencies: number
  delays: number
  streaks: number
}

export type OptimizerPreferences = {
  weights: OptimizationWeights
  minimumFocusMinutes: 60
  preferredFocusMinutes: 90 | 120
  maximumConsecutiveHighEnergy: number
  minimumBlockMinutes: number
  beamWidth: number
  backtrackingDepth: number
  taskContexts: Record<string, string>
  protectedTaskIds: Set<string>
  energyForecast: Array<{ start: string; end: string; level: EnergyLevelV3 }>
  streakTaskIds: Set<string>
}

export type ConstraintViolation = {
  type: 'overlap' | 'dependency' | 'protected' | 'duration' | 'horizon'
  taskIds: string[]
  severity: 'warning' | 'critical'
  explanation: string
}

export type FocusBlock = {
  id: string
  start: string
  end: string
  durationMinutes: number
  taskIds: string[]
  protected: true
}

export type PlanMetrics = {
  score: number
  cost: number
  contextSwitches: number
  fragmentation: number
  fatigue: number
  smallBlocks: number
  idleMinutes: number
  interruptions: number
  overlaps: number
  deepWorkMinutes: number
  continuousFlowMinutes: number
  priorityValue: number
  energyAlignment: number
  completionProbability: number
  satisfaction: number
  dependencyCompliance: number
}

export type OptimizationDecision = {
  taskId: string
  why: string
  changed: string
  improved: string[]
  worsened: string[]
  previousScore: number
  newScore: number
}

export type AlternativePlan = {
  id: string
  label: string
  tasks: PlannedTask[]
  focusBlocks: FocusBlock[]
  metrics: PlanMetrics
  violations: ConstraintViolation[]
}

export type OptimizedPlan = {
  sourcePlan: DailyPlan
  selected: AlternativePlan
  alternatives: AlternativePlan[]
  baselineMetrics: PlanMetrics
  gain: number
  decisions: OptimizationDecision[]
  generatedAt: string
}

export type OptimizationInput = {
  plan: DailyPlan
  preferences?: Partial<Omit<OptimizerPreferences, 'weights'>> & { weights?: Partial<OptimizationWeights> }
}

export const DEFAULT_OPTIMIZATION_WEIGHTS: OptimizationWeights = {
  contextSwitches: 9, fragmentation: 8, fatigue: 8, smallBlocks: 5, idleTime: 7, interruptions: 7,
  overlaps: 15, deepWork: 10, continuousFlow: 7, completedPriority: 8, energyAlignment: 6,
  completionProbability: 8, satisfaction: 5, urgency: 7, dependencies: 12, delays: 6, streaks: 4,
}

export const DEFAULT_OPTIMIZER_PREFERENCES: OptimizerPreferences = {
  weights: DEFAULT_OPTIMIZATION_WEIGHTS,
  minimumFocusMinutes: 60,
  preferredFocusMinutes: 90,
  maximumConsecutiveHighEnergy: 2,
  minimumBlockMinutes: 25,
  beamWidth: 12,
  backtrackingDepth: 3,
  taskContexts: {},
  protectedTaskIds: new Set(),
  energyForecast: [],
  streakTaskIds: new Set(),
}

const duration = (task: PlannedTask) => Math.max(0, (Date.parse(task.suggestedEnd) - Date.parse(task.suggestedStart)) / 60_000)

export class ConstraintModel {
  validate(tasks: PlannedTask[], original: PlannedTask[], preferences: OptimizerPreferences): ConstraintViolation[] {
    const violations: ConstraintViolation[] = []
    const sorted = [...tasks].sort((a, b) => a.suggestedStart.localeCompare(b.suggestedStart))
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index - 1].suggestedEnd > sorted[index].suggestedStart) {
        violations.push({ type: 'overlap', taskIds: [sorted[index - 1].taskId, sorted[index].taskId], severity: 'critical', explanation: 'Las tareas se solapan.' })
      }
    }
    const positions = new Map(sorted.map((task, index) => [task.taskId, index]))
    for (const task of sorted) {
      if (duration(task) <= 0) violations.push({ type: 'duration', taskIds: [task.taskId], severity: 'critical', explanation: 'La duración debe ser positiva.' })
      for (const dependency of task.dependencies) {
        if (positions.has(dependency) && positions.get(dependency)! > positions.get(task.taskId)!) {
          violations.push({ type: 'dependency', taskIds: [dependency, task.taskId], severity: 'critical', explanation: 'El orden viola una dependencia.' })
        }
      }
    }
    const originalById = new Map(original.map((task) => [task.taskId, task]))
    for (const taskId of preferences.protectedTaskIds) {
      const before = originalById.get(taskId), after = tasks.find((task) => task.taskId === taskId)
      if (before && after && (before.suggestedStart !== after.suggestedStart || before.suggestedEnd !== after.suggestedEnd)) {
        violations.push({ type: 'protected', taskIds: [taskId], severity: 'critical', explanation: 'Se movió un bloque protegido.' })
      }
    }
    if (original.length && tasks.some((task) => task.suggestedStart < original[0].suggestedStart || task.suggestedEnd > original.at(-1)!.suggestedEnd)) {
      violations.push({ type: 'horizon', taskIds: [], severity: 'critical', explanation: 'El plan excede el horizonte original.' })
    }
    return violations
  }
}
