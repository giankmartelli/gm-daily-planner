import { energyAt, isEnergySafe, taskEnergyMinimum } from './EnergyModel'
import type { BusyBlock, EnergyForecastPoint, PlannedTask, PlannerConflict, PlannerTaskV3, TaskScore, WorkingHours } from './PlannerTypes'

type Interval = { start: number; end: number }
type SchedulerInput = {
  date: string
  tasks: PlannerTaskV3[]
  scores: Map<string, TaskScore>
  estimates: Map<string, number>
  occupied: BusyBlock[]
  energyForecast: EnergyForecastPoint[]
  workingHours: WorkingHours
  bufferMinutes: number
}
export type ScheduleResult = { planned: PlannedTask[]; unscheduledTaskIds: string[]; conflicts: PlannerConflict[] }

export const toMinute = (value: string) => {
  const time = value.includes('T') ? value.slice(11, 16) : value
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN
}
export const toTime = (date: string, minute: number) => `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00`

function freeSlots(start: number, end: number, occupied: Interval[]) {
  const sorted = occupied.filter((item) => item.end > start && item.start < end).sort((a, b) => a.start - b.start)
  const slots: Interval[] = []
  let cursor = start
  for (const item of sorted) {
    if (item.start > cursor) slots.push({ start: cursor, end: Math.min(item.start, end) })
    cursor = Math.max(cursor, item.end)
  }
  if (cursor < end) slots.push({ start: cursor, end })
  return slots
}

export class SmartScheduler {
  schedule(input: SchedulerInput): ScheduleResult {
    const start = toMinute(input.workingHours.start), end = toMinute(input.workingHours.end)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return { planned: [], unscheduledTaskIds: input.tasks.map((task) => task.id), conflicts: [{ type: 'capacity', explanation: 'El horario laboral no es válido.' }] }
    }
    const occupied = input.occupied.map((block) => ({ start: toMinute(block.start) - input.bufferMinutes, end: toMinute(block.end) + input.bufferMinutes }))
      .filter((block) => Number.isFinite(block.start) && Number.isFinite(block.end))
    const planned: PlannedTask[] = [], conflicts: PlannerConflict[] = [], unscheduledTaskIds: string[] = []
    const ordered = [...input.tasks].sort((left, right) => (input.scores.get(right.id)?.score ?? 0) - (input.scores.get(left.id)?.score ?? 0) || left.id.localeCompare(right.id))
    for (const task of ordered) {
      const duration = input.estimates.get(task.id) ?? 30
      const fixedMinute = task.fixedStartAt ? toMinute(task.fixedStartAt) : null
      const slots = freeSlots(start, end, occupied)
      const candidates = fixedMinute === null ? slots : slots.filter((slot) => fixedMinute >= slot.start && fixedMinute + duration <= slot.end)
      let chosen: number | null = null
      for (const slot of candidates) {
        const candidate = fixedMinute ?? Math.max(slot.start, task.earliestStartAt ? toMinute(task.earliestStartAt) : slot.start)
        if (candidate + duration > slot.end) continue
        const level = energyAt(toTime(input.date, candidate), input.energyForecast)
        if (!isEnergySafe(task, level)) continue
        chosen = candidate
        break
      }
      if (chosen === null) {
        unscheduledTaskIds.push(task.id)
        conflicts.push({
          type: input.energyForecast.length && !input.energyForecast.some((point) => isEnergySafe(task, point.level)) ? 'energy' : 'capacity',
          taskId: task.id,
          explanation: `No existe un bloque compatible para “${task.title}”.`,
        })
        continue
      }
      const score = input.scores.get(task.id)
      const alerts = task.dueAt && task.dueAt < toTime(input.date, chosen) ? ['Fecha límite vencida o anterior al bloque sugerido.'] : []
      planned.push({
        taskId: task.id, title: task.title, priority: score?.score ?? 0,
        suggestedStart: toTime(input.date, chosen), suggestedEnd: toTime(input.date, chosen + duration),
        reason: `Score ${score?.score ?? 0}/100; cabe sin solapamientos y con energía compatible.`,
        confidence: score?.confidence ?? 0.5, estimatedMinutes: duration,
        energyRequired: taskEnergyMinimum(task), alerts, dependencies: task.dependencies ?? [],
        score: score?.score ?? 0, factors: score?.factors ?? [],
      })
      occupied.push({ start: chosen, end: chosen + duration })
    }
    return { planned: planned.sort((a, b) => a.suggestedStart.localeCompare(b.suggestedStart)), unscheduledTaskIds, conflicts }
  }
}
