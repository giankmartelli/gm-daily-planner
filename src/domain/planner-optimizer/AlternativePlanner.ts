import type { AlternativePlan } from './ConstraintModel'

export class AlternativePlanner {
  select(alternatives: AlternativePlan[], count = 3) {
    const safe = alternatives.filter((plan) => !plan.violations.some((violation) => violation.severity === 'critical'))
    const source = safe.length ? safe : alternatives
    return source.slice(0, Math.max(1, count))
  }
}
