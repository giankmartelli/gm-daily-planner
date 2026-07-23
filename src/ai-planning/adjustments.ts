import type { PlannedBlock } from '../domain/smartPlanner'

export type AdjustmentResult = { blocks: PlannedBlock[]; valid: boolean; message: string; freeMinutes: number }
const toMinutes = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute }
const toTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`

export function adjustBlock(input: {
  blocks: PlannedBlock[]
  taskId: string
  startTime: string
  durationMinutes: number
  schedule: Record<string, string>
  availableFrom: string
  availableUntil: string
}): AdjustmentResult {
  const start = toMinutes(input.startTime)
  const duration = Math.max(5, Math.min(240, Math.round(input.durationMinutes / 5) * 5))
  const end = start + duration
  const occupied = Object.entries(input.schedule).flatMap(([time, title]) => title.trim() ? [{ start: toMinutes(time), end: toMinutes(time) + 60 }] : [])
  const other = input.blocks.filter((block) => block.taskId !== input.taskId).map((block) => ({ start: toMinutes(block.startTime), end: toMinutes(block.endTime) }))
  const outside = start < toMinutes(input.availableFrom) || end > toMinutes(input.availableUntil)
  const collision = [...occupied, ...other].some((interval) => start < interval.end && end > interval.start)
  if (outside || collision) {
    return { blocks: input.blocks, valid: false, message: outside ? 'El bloque queda fuera de tu disponibilidad.' : 'El bloque se solapa con una actividad confirmada u otra propuesta.', freeMinutes: freeMinutes(input.blocks, input.availableFrom, input.availableUntil) }
  }
  const blocks = input.blocks.map((block) => block.taskId === input.taskId ? { ...block, startTime: input.startTime, endTime: toTime(end), durationMinutes: duration, reason: `${block.reason} Ajustado manualmente.` } : block).sort((a, b) => a.startTime.localeCompare(b.startTime))
  return { blocks, valid: true, message: 'Propuesta ajustada. Aún no se ha guardado.', freeMinutes: freeMinutes(blocks, input.availableFrom, input.availableUntil) }
}

export function reorderBlocks(blocks: PlannedBlock[], sourceId: string, targetId: string) {
  const source = blocks.findIndex((block) => block.taskId === sourceId)
  const target = blocks.findIndex((block) => block.taskId === targetId)
  if (source < 0 || target < 0 || source === target) return blocks
  const next = [...blocks], [moved] = next.splice(source, 1)
  next.splice(target, 0, moved)
  return next
}

export function freeMinutes(blocks: PlannedBlock[], availableFrom: string, availableUntil: string) {
  return Math.max(0, toMinutes(availableUntil) - toMinutes(availableFrom) - blocks.reduce((sum, block) => sum + block.durationMinutes, 0))
}
