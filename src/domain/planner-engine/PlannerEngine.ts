import { ConflictResolver } from './ConflictResolver'
import { DependencyGraph } from './DependencyGraph'
import { energyAt } from './EnergyModel'
import { LearningEngine } from './LearningEngine'
import { ScoreCalculator } from './ScoreCalculator'
import { SmartScheduler } from './SmartScheduler'
import { SuggestionGenerator } from './SuggestionGenerator'
import { TimeEstimator } from './TimeEstimator'
import {
  DEFAULT_PREFERENCES,
  type BusyBlock,
  type DailyPlan,
  type PlannerConflict,
  type PlannerInput,
  type PlannerTaskV3,
  type ReplanInput,
} from './PlannerTypes'

const isoTime = (date: string, value: string) => value.includes('T') ? value : `${date}T${value}:00`

function normalizeBlocks(input: PlannerInput): BusyBlock[] {
  const preferences = { ...DEFAULT_PREFERENCES, ...input.preferences }
  const blocks = [...(input.timeBlocks ?? []), ...(input.calendarEvents ?? []), ...(input.externalEvents ?? [])]
    .map((block) => ({ ...block, start: isoTime(input.date, block.start), end: isoTime(input.date, block.end) }))
  if (preferences.lunch) blocks.push({ id: 'system:lunch', title: 'Almuerzo', start: isoTime(input.date, preferences.lunch.start), end: isoTime(input.date, preferences.lunch.end), source: 'lunch', immutable: true })
  return blocks
}

function habitTasks(input: PlannerInput): PlannerTaskV3[] {
  return (input.habits ?? []).filter((habit) => !habit.completed).map((habit) => ({
    id: `habit:${habit.id}`,
    title: habit.title,
    priority: 'media',
    importance: 0.55,
    estimatedMinutes: habit.durationMinutes,
    energyMinimum: habit.energyMinimum ?? 'baja',
    fixedStartAt: habit.preferredTime ? isoTime(input.date, habit.preferredTime) : null,
    context: 'hábito',
    frequency: 1,
  }))
}

export class PlannerEngine {
  private readonly scoring: ScoreCalculator
  private readonly energy: { at: typeof energyAt }
  private readonly estimator: TimeEstimator
  private readonly dependencies: DependencyGraph
  private readonly scheduler: SmartScheduler
  private readonly conflicts: ConflictResolver
  private readonly learning: LearningEngine
  private readonly suggestions: SuggestionGenerator

  constructor(
    scoring = new ScoreCalculator(),
    energy = { at: energyAt },
    estimator = new TimeEstimator(),
    dependencies = new DependencyGraph(),
    scheduler = new SmartScheduler(),
    conflicts = new ConflictResolver(),
    learning = new LearningEngine(estimator),
    suggestions = new SuggestionGenerator(),
  ) {
    this.scoring = scoring
    this.energy = energy
    this.estimator = estimator
    this.dependencies = dependencies
    this.scheduler = scheduler
    this.conflicts = conflicts
    this.learning = learning
    this.suggestions = suggestions
  }

  createPlan(input: PlannerInput): DailyPlan {
    const tasks = [...input.tasks, ...(input.subtasks ?? []), ...habitTasks(input)].filter((task) => !task.completed)
    const profile = this.learning.buildProfile(input.history ?? [])
    const graph = this.dependencies.analyze([...tasks, ...input.tasks.filter((task) => task.completed)])
    const blocks = normalizeBlocks(input)
    const overlapConflicts = this.conflicts.detectBlockOverlaps(blocks)
    const completed = new Set(input.tasks.filter((task) => task.completed).map((task) => task.id))
    const endOfDay = isoTime(input.date, input.workingHours.end)
    const available = Math.max(0, (Date.parse(endOfDay) - Date.parse(input.now)) / 60_000)
    const currentEnergy = this.energy.at(input.now, input.energyForecast ?? [])
    const scores = new Map(tasks.map((task) => [task.id, this.scoring.calculate(task, {
      now: input.now,
      endOfDay,
      availableMinutes: available,
      energy: currentEnergy,
      completedTaskIds: completed,
      profile,
      weights: input.weights,
    })]))
    const estimates = new Map(tasks.map((task) => [task.id, this.estimator.estimate(task, input.history).predictedMinutes]))
    const graphOrder = new Map(graph.orderedIds.map((id, index) => [id, index]))
    const schedulable = tasks.filter((task) => !graph.cycles.some((cycle) => cycle.includes(task.id)) && !graph.missingDependencies[task.id]?.length)
      .sort((left, right) => (graphOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (graphOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER))
    const scheduled = this.scheduler.schedule({
      date: input.date,
      tasks: schedulable,
      scores,
      estimates,
      occupied: blocks,
      energyForecast: input.energyForecast ?? [],
      workingHours: input.workingHours,
      bufferMinutes: input.preferences?.bufferMinutes ?? DEFAULT_PREFERENCES.bufferMinutes,
    })
    const graphConflicts: PlannerConflict[] = [
      ...graph.cycles.map((cycle): PlannerConflict => ({ type: 'cycle', blockIds: cycle, explanation: `Ciclo de dependencias detectado: ${cycle.join(' → ')}.` })),
      ...Object.entries(graph.missingDependencies).map(([taskId, ids]): PlannerConflict => ({ type: 'dependency', taskId, explanation: `Dependencias inexistentes: ${ids.join(', ')}.` })),
    ]
    const unscheduled = new Set([...scheduled.unscheduledTaskIds, ...tasks.filter((task) => !schedulable.includes(task)).map((task) => task.id)])
    return {
      date: input.date,
      orderedTasks: scheduled.planned,
      unscheduledTaskIds: [...unscheduled],
      conflicts: [...overlapConflicts, ...graphConflicts, ...scheduled.conflicts],
      suggestions: this.suggestions.generate(tasks, scores, unscheduled),
      totalPlannedMinutes: scheduled.planned.reduce((sum, task) => sum + task.estimatedMinutes, 0),
      generatedAt: input.now,
    }
  }

  replanAffected(input: ReplanInput): DailyPlan {
    const event = { ...input.newEvent, start: isoTime(input.date, input.newEvent.start), end: isoTime(input.date, input.newEvent.end) }
    const affectedIds = new Set(this.conflicts.affectedTasks(input.previousPlan, event).map((task) => task.taskId))
    if (!affectedIds.size) return { ...input.previousPlan, generatedAt: input.now }
    const preserved = this.conflicts.preserveUnaffected(input.previousPlan, event)
    const affectedTasks = [...input.tasks, ...(input.subtasks ?? [])].filter((task) => affectedIds.has(task.id))
    const preservedBlocks: BusyBlock[] = preserved.map((task) => ({
      id: `preserved:${task.taskId}`, title: task.title, start: task.suggestedStart, end: task.suggestedEnd, source: 'fixed', immutable: true,
    }))
    const partial = this.createPlan({ ...input, tasks: affectedTasks, subtasks: [], timeBlocks: [...(input.timeBlocks ?? []), event, ...preservedBlocks] })
    return {
      ...partial,
      orderedTasks: [...preserved, ...partial.orderedTasks].sort((a, b) => a.suggestedStart.localeCompare(b.suggestedStart)),
      totalPlannedMinutes: preserved.reduce((sum, task) => sum + task.estimatedMinutes, 0) + partial.totalPlannedMinutes,
    }
  }
}
