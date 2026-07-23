import type { EnergyRequired } from './PlannerTask'

export type EnergyCurvePoint = { from: string; until: string; energy: EnergyRequired }
export type UserPlanningProfile = {
  wakeTime: string
  sleepTime: string
  workingHours: { from: string; until: string }
  preferredFocusBlocks: number[]
  lunchTime: { from: string; until: string }
  exerciseTime?: { from: string; until: string }
  energyCurve: EnergyCurvePoint[]
  chronotype: 'early' | 'balanced' | 'late'
  timezone: string
  workDays: number[]
  preferredTaskLength: number
  notificationStyle: 'minimal' | 'balanced' | 'proactive'
  planningStyle: 'structured' | 'balanced' | 'flexible'
  deepWorkCapacity: number
  breakFrequency: number
}

export const defaultPlanningProfile = (timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): UserPlanningProfile => ({
  wakeTime: '07:00', sleepTime: '22:30', workingHours: { from: '08:00', until: '18:00' }, preferredFocusBlocks: [90, 75], lunchTime: { from: '12:00', until: '13:00' },
  energyCurve: [{ from: '07:00', until: '10:00', energy: 'High' }, { from: '10:00', until: '12:00', energy: 'Medium' }, { from: '13:00', until: '15:00', energy: 'Low' }, { from: '15:00', until: '18:00', energy: 'High' }, { from: '18:00', until: '22:00', energy: 'Medium' }],
  chronotype: 'balanced', timezone, workDays: [1, 2, 3, 4, 5], preferredTaskLength: 45, notificationStyle: 'balanced', planningStyle: 'balanced', deepWorkCapacity: 180, breakFrequency: 90,
})
