import type { DailyPlan, PlannedTask } from '../planner-engine'
import { DEFAULT_OPTIMIZER_PREFERENCES, type OptimizerPreferences } from './ConstraintModel'

export const addMinutes = (iso: string, minutes: number) => new Date(Date.parse(iso.endsWith('Z') ? iso : `${iso}Z`) + minutes * 60_000).toISOString().slice(0, 19)

export const plannedTask = (id: string, start: string, extra: Partial<PlannedTask> = {}): PlannedTask => ({
  taskId: id, title: `Task ${id}`, priority: 50, suggestedStart: start,
  suggestedEnd: addMinutes(start, extra.estimatedMinutes ?? 30), reason: 'Greedy',
  confidence: 0.7, estimatedMinutes: 30, energyRequired: 'media',
  alerts: [], dependencies: [], score: 50, factors: [], ...extra,
})

export const dailyPlan = (tasks: PlannedTask[]): DailyPlan => ({
  date: '2026-07-23', orderedTasks: tasks, unscheduledTaskIds: [], conflicts: [], suggestions: [],
  totalPlannedMinutes: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
  generatedAt: '2026-07-23T08:00:00',
})

export const preferences = (extra: Partial<OptimizerPreferences> = {}): OptimizerPreferences => ({
  ...DEFAULT_OPTIMIZER_PREFERENCES,
  taskContexts: {},
  protectedTaskIds: new Set(),
  energyForecast: [],
  streakTaskIds: new Set(),
  ...extra,
  weights: { ...DEFAULT_OPTIMIZER_PREFERENCES.weights, ...extra.weights },
})
