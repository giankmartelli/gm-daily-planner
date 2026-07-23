import type { EnergyRequired, PlannerTask } from './PlannerTask'

export type BusyBlock = { id: string; title: string; start: string; end: string; locked?: boolean; kind?: 'event' | 'focus' | 'task' | 'break' }
export type PlannedBlock = BusyBlock & { taskId?: string; durationMinutes: number; energy: EnergyRequired; score: number; confidence: number; reason: string[]; risk: number }
export type PlanResult = { date: string; blocks: PlannedBlock[]; unscheduledTasks: PlannerTask[]; totalPlannedMinutes: number; freeMinutes: number; confidence: number; risk: number; explanation: string[]; generatedAt: string }
export type PlanWeekResult = { days: PlanResult[]; unscheduledTasks: PlannerTask[] }
export type LearningEvent = { id: string; taskId?: string; plannedStart?: string; actualStart?: string; plannedEnd?: string; actualEnd?: string; delayedMinutes: number; cancelled: boolean; completed: boolean; productivity: number; context?: string; recordedAt: string }
export type LearningPattern = { sampleSize: number; completionRate: number; averageDelayMinutes: number; effectiveHours: number[]; contextPerformance: Record<string, number>; updatedAt: string }
