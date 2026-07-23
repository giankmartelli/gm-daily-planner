import type { PlannerTask } from '../entities/PlannerTask'

export const contextAffinity = (left?: PlannerTask, right?: PlannerTask) => !left || !right ? 1 : left.context === right.context ? 1 : left.tags.some((tag) => right.tags.includes(tag)) ? .7 : .25
export const isDeepWorkCandidate = (task: PlannerTask) => task.deepWork || task.focusRequired >= .75 || task.estimatedMinutes >= 60
export const canInterrupt = (task: PlannerTask, remainingMinutes: number) => task.interruptible && remainingMinutes >= 15
