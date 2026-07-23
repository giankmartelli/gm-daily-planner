import { describe, expect, it } from 'vitest'
import { adjustBlock, reorderBlocks } from './adjustments'

const blocks = [
  { taskId: 'a', title: 'A', startTime: '09:00', endTime: '10:00', durationMinutes: 60, reason: 'R' },
  { taskId: 'b', title: 'B', startTime: '10:00', endTime: '11:00', durationMinutes: 60, reason: 'R' },
]

describe('ajustes de propuesta', () => {
  it('impide solapamientos y no muta la propuesta', () => {
    const result = adjustBlock({ blocks, taskId: 'b', startTime: '09:30', durationMinutes: 60, schedule: {}, availableFrom: '08:00', availableUntil: '18:00' })
    expect(result.valid).toBe(false)
    expect(result.blocks).toBe(blocks)
  })
  it('permite mover y cambiar duración en pasos de cinco minutos', () => {
    const result = adjustBlock({ blocks, taskId: 'b', startTime: '11:00', durationMinutes: 47, schedule: {}, availableFrom: '08:00', availableUntil: '18:00' })
    expect(result.valid).toBe(true)
    expect(result.blocks[1]).toMatchObject({ startTime: '11:00', endTime: '11:45', durationMinutes: 45 })
  })
  it('reordena sin perder bloques', () => {
    expect(reorderBlocks(blocks, 'b', 'a').map((block) => block.taskId)).toEqual(['b', 'a'])
  })
})
