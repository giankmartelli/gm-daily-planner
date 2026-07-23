import type { BusyBlock, PlannedBlock } from '../entities/Planning'
import type { UserPlanningProfile } from '../entities/UserPlanningProfile'
import { DEFAULT_PLANNER_CONFIG, type PlannerConfig } from '../rules/PlannerConfig'
import { subtractIntervals, toMinutes, toTime } from '../valueObjects/Time'

export class FocusService {
  private readonly config: PlannerConfig
  constructor(config: PlannerConfig = DEFAULT_PLANNER_CONFIG) { this.config = config }
  build(date: string, events: BusyBlock[], profile: UserPlanningProfile): PlannedBlock[] {
    const base = { start: toMinutes(profile.workingHours.from), end: toMinutes(profile.workingHours.until) }
    const occupied = events.map((event) => ({ start: toMinutes(event.start), end: toMinutes(event.end) }))
    const gaps = subtractIntervals(base, occupied); const blocks: PlannedBlock[] = []; let used = 0; let index = 0
    for (const gap of gaps) { let cursor = gap.start; while (cursor + 30 <= gap.end && used < profile.deepWorkCapacity) { const target = profile.preferredFocusBlocks[index % profile.preferredFocusBlocks.length] ?? profile.breakFrequency; const length = Math.min(target, gap.end - cursor, profile.deepWorkCapacity - used); if (length < 30) break; blocks.push({ id: `focus:${date}:${cursor}`, title: 'Trabajo profundo', start: toTime(cursor), end: toTime(cursor + length), durationMinutes: length, energy: 'High', score: 1, confidence: .8, reason: ['Protege capacidad de trabajo profundo'], risk: 0, kind: 'focus' }); used += length; cursor += length + this.config.defaultBreakMinutes; index += 1 } }
    return blocks
  }
}
