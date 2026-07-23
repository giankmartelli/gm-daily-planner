export const PLANNER_SCORE_WEIGHTS = {
  urgency: 15,
  deadline: 18,
  priority: 14,
  energyMatch: 11,
  durationFit: 8,
  dependencyReadiness: 12,
  continuity: 7,
  preferredPeriod: 7,
  historicalFit: 8,
} as const

export const PLANNER_LIMITS = {
  minimumTaskMinutes: 5,
  maximumTaskMinutes: 1440,
  largeTaskMinutes: 90,
  deadlineHorizonDays: 14,
  maximumDailyRisk: 100,
} as const

export type PlannerScoreFactor = keyof typeof PLANNER_SCORE_WEIGHTS
