import type { EnergyRequired, PlannerTask } from '../entities/PlannerTask'
import type { UserPlanningProfile } from '../entities/UserPlanningProfile'
import { toMinutes } from '../valueObjects/Time'

const energyValue: Record<EnergyRequired, number> = { Low: 1, Medium: 2, High: 3 }
export class EnergyService {
  energyAt(time: string, profile: UserPlanningProfile): EnergyRequired { const minute = toMinutes(time); return profile.energyCurve.find((point) => minute >= toMinutes(point.from) && minute < toMinutes(point.until))?.energy ?? 'Medium' }
  compatibility(task: PlannerTask, time: string, profile: UserPlanningProfile) { const difference = Math.abs(energyValue[task.energyRequired] - energyValue[this.energyAt(time, profile)]); return difference === 0 ? 1 : difference === 1 ? .55 : .15 }
}
