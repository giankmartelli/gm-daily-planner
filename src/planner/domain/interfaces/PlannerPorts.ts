import type { BusyBlock, LearningEvent, LearningPattern } from '../entities/Planning'

export interface LearningRepository { list(): LearningEvent[]; append(events: LearningEvent[]): void; savePattern(pattern: LearningPattern): void; getPattern(): LearningPattern | undefined }
export interface CalendarAdapter { readonly provider: 'google' | 'outlook' | 'apple'; listEvents(from: string, until: string): Promise<BusyBlock[]> }
export interface PlanningStrategy<Input, Output> { execute(input: Input): Output | Promise<Output> }
