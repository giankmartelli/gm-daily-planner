export const DECISION_WEIGHTS = {
  priority: .24,
  urgency: .25,
  impact: .22,
  energyFit: .10,
  durationFit: .11,
  dependencyReadiness: .08,
} as const

export const clampScore = (value: number) => Math.min(100, Math.max(0, Math.round(value)))
