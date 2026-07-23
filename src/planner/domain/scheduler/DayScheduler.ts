import type { PlanDayCommand } from '../../application/commands/PlannerCommands'
import type { BusyBlock, PlanResult, PlannedBlock } from '../entities/Planning'
import type { PlannerTask, PreferredPeriod } from '../entities/PlannerTask'
import { TaskRanker } from '../ranking/TaskRanker'
import { DEFAULT_PLANNER_CONFIG, type PlannerConfig } from '../rules/PlannerConfig'
import { EnergyService } from '../services/EnergyService'
import { overlaps, subtractIntervals, toMinutes, toTime, type Interval } from '../valueObjects/Time'

const periodBounds: Record<PreferredPeriod, Interval> = { morning: { start: 0, end: 720 }, afternoon: { start: 720, end: 1080 }, evening: { start: 1080, end: 1440 }, any: { start: 0, end: 1440 } }
export class DayScheduler {
  private readonly ranker: TaskRanker
  private readonly energy: EnergyService
  private readonly config: PlannerConfig
  constructor(ranker = new TaskRanker(), energy = new EnergyService(), config: PlannerConfig = DEFAULT_PLANNER_CONFIG) { this.ranker = ranker; this.energy = energy; this.config = config }
  schedule(command: PlanDayCommand): PlanResult {
    const from = toMinutes(command.profile.workingHours.from), until = toMinutes(command.profile.workingHours.until)
    if (!Number.isFinite(from) || !Number.isFinite(until) || from >= until) throw new Error('El horario laboral del perfil no es válido.')
    const lunch: BusyBlock = { id: `lunch:${command.date}`, title: 'Almuerzo', start: command.profile.lunchTime.from, end: command.profile.lunchTime.until, locked: true, kind: 'break' }
    const events = command.events ?? []
    const lunchInterval = { start: toMinutes(lunch.start), end: toMinutes(lunch.end) }
    const lunchIsCovered = events.some((event) => overlaps(
      { start: toMinutes(event.start), end: toMinutes(event.end) },
      lunchInterval,
    ))
    const fixed = lunchIsCovered ? events : [...events, lunch]
    const occupied: Interval[] = fixed.map((item) => ({ start: toMinutes(item.start), end: toMinutes(item.end) })).filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start)
    const completed = new Set(command.tasks.filter((task) => task.completed).map((task) => task.id))
    const ranked = this.ranker.rank(command.tasks, { date: command.date, time: command.now ?? command.profile.workingHours.from, completedTaskIds: completed, profile: command.profile, goals: command.goals, habitsCompleted: command.habits?.filter((habit) => habit.completed).length })
    const blocks: PlannedBlock[] = fixed.map((item) => ({ ...item, durationMinutes: toMinutes(item.end) - toMinutes(item.start), energy: this.energy.energyAt(item.start, command.profile), score: 1, confidence: 1, reason: ['Bloque existente protegido'], risk: 0 }))
    const unscheduledTasks: PlannerTask[] = []; let previousContext = ''
    for (let index = 0; index < ranked.length; index += 1) {
      const scored = ranked[index]
      const task = scored.task
      if (scored.blocked || task.calendarLocked) { unscheduledTasks.push(task); continue }
      const gaps = subtractIntervals({ start: from, end: until }, occupied)
      const largestGap = gaps.reduce((largest, gap) => Math.max(largest, gap.end - gap.start), 0)
      if (largestGap < this.config.minimumTaskMinutes) {
        unscheduledTasks.push(task, ...ranked.slice(index + 1).map((item) => item.task))
        break
      }
      const preference = periodBounds[task.preferredPeriod]
      const candidates = gaps.flatMap((gap) => { const start = Math.max(gap.start, preference.start); const end = Math.min(gap.end, preference.end); return start + task.estimatedMinutes <= end ? [{ start, end: start + task.estimatedMinutes }] : task.preferredPeriod === 'any' && gap.start + task.estimatedMinutes <= gap.end ? [{ start: gap.start, end: gap.start + task.estimatedMinutes }] : [] })
      if (!candidates.length) { unscheduledTasks.push(task); continue }
      const best = candidates.map((slot) => { const energy = this.energy.compatibility(task, toTime(slot.start), command.profile); const contextPenalty = previousContext && previousContext !== task.context ? this.config.contextSwitchPenalty : 0; const fragment = gaps.find((gap) => gap.start <= slot.start && gap.end >= slot.end); const fragmentationPenalty = fragment && fragment.end - slot.end > 0 && fragment.end - slot.end < this.config.minimumTaskMinutes ? this.config.fragmentationPenalty : 0; return { slot, quality: scored.total + energy * this.config.weights.energy - contextPenalty - fragmentationPenalty } }).sort((a, b) => b.quality - a.quality || a.slot.start - b.slot.start)[0]
      occupied.push(best.slot); previousContext = task.context
      const risk = Math.max(0, 1 - best.quality)
      blocks.push({ id: `task:${task.id}:${command.date}`, taskId: task.id, title: task.title, start: toTime(best.slot.start), end: toTime(best.slot.end), durationMinutes: task.estimatedMinutes, energy: this.energy.energyAt(toTime(best.slot.start), command.profile), score: scored.total, confidence: Math.max(.35, Math.min(.98, best.quality)), reason: scored.reasons, risk, kind: 'task' })
    }
    const taskBlocks = blocks.filter((block) => block.kind === 'task')
    const planned = taskBlocks.reduce((sum, block) => sum + block.durationMinutes, 0)
    const available = subtractIntervals({ start: from, end: until }, fixed.map((item) => ({ start: toMinutes(item.start), end: toMinutes(item.end) }))).reduce((sum, gap) => sum + gap.end - gap.start, 0)
    const confidence = taskBlocks.length ? taskBlocks.reduce((sum, block) => sum + block.confidence, 0) / taskBlocks.length : 0
    const risk = unscheduledTasks.length / Math.max(1, ranked.length)
    return { date: command.date, blocks: blocks.sort((a, b) => a.start.localeCompare(b.start)), unscheduledTasks, totalPlannedMinutes: planned, freeMinutes: Math.max(0, available - planned), confidence, risk, explanation: [`${planned} minutos planificados según prioridad, energía y disponibilidad.`, `${unscheduledTasks.length} tareas quedaron fuera sin perderse.`], generatedAt: new Date().toISOString() }
  }
}
