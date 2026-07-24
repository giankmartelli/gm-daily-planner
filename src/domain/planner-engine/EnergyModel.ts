import type { EnergyForecastPoint, EnergyLevelV3, PlannerTaskV3 } from './PlannerTypes'

const ENERGY_RANK: Record<EnergyLevelV3, number> = { muy_baja: 0, baja: 1, media: 2, alta: 3, muy_alta: 4 }

export const energyRank = (level: EnergyLevelV3) => ENERGY_RANK[level]

export function energyAt(time: string, forecast: EnergyForecastPoint[]): EnergyLevelV3 {
  return forecast.find((point) => point.start <= time && time < point.end)?.level ?? 'media'
}

export function taskEnergyMinimum(task: PlannerTaskV3): EnergyLevelV3 {
  return task.energyMinimum ?? (Number(task.complexity ?? 0.5) >= 0.75 ? 'alta' : 'media')
}

export function taskEnergyIdeal(task: PlannerTaskV3): EnergyLevelV3 {
  return task.energyIdeal ?? taskEnergyMinimum(task)
}

export function isEnergySafe(task: PlannerTaskV3, available: EnergyLevelV3) {
  return energyRank(available) >= energyRank(taskEnergyMinimum(task))
}

export function energyCompatibility(task: PlannerTaskV3, available: EnergyLevelV3) {
  if (!isEnergySafe(task, available)) return 0
  const distance = Math.abs(energyRank(available) - energyRank(taskEnergyIdeal(task)))
  return Math.max(0.4, 1 - distance * 0.15)
}
