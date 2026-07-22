// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyDay } from '../domain/models'
import { CalendarPanel } from './CalendarPanel'

const selected = '2026-07-22'
afterEach(cleanup)
const getDay = (key: string) => key === selected ? {
  ...emptyDay(),
  tasks: [{ id: 't1', title: 'Revisar propuesta', completed: false, priority: 'alta' as const, category: 'Trabajo' as const, tags: [], subtasks: [], recurrence: 'ninguna' as const, estimatedMinutes: 30, energyLevel: 'media' as const, flexibility: 'flexible' as const, preferredPeriod: 'mañana' as const, trackedMinutes: 0, createdAt: '2026-07-22T08:00:00.000Z' }],
  schedule: { ...emptyDay().schedule, '09:00': 'Bloque de foco' },
} : emptyDay()

describe('experiencia de calendario', () => {
  it('muestra tareas, agenda y controles accesibles del día seleccionado', () => {
    render(<CalendarPanel selected={selected} day={getDay(selected)} getDay={getDay} onSelect={vi.fn()} onSchedule={vi.fn()} onNewTask={vi.fn()}/>)
    expect(screen.getByRole('heading', { name: 'Calendario' })).toBeTruthy()
    expect(screen.getAllByText('Revisar propuesta')).toHaveLength(2)
    expect(screen.getByLabelText('Agenda del miércoles, 22 de julio')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Periodo anterior' })).toBeTruthy()
  })

  it('cambia entre mes, semana y día sin alterar los datos', () => {
    render(<CalendarPanel selected={selected} day={getDay(selected)} getDay={getDay} onSelect={vi.fn()} onSchedule={vi.fn()} onNewTask={vi.fn()}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(screen.getByRole('grid', { name: 'Calendario semanal' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Día' }))
    expect(screen.getAllByRole('heading', { name: 'miércoles, 22 de julio' })).toHaveLength(2)
    expect(screen.getAllByText('Revisar propuesta')).toHaveLength(2)
  })

  it('delega la edición de agenda y la creación de tareas', () => {
    const onSchedule = vi.fn()
    const onNewTask = vi.fn()
    render(<CalendarPanel selected={selected} day={getDay(selected)} getDay={getDay} onSelect={vi.fn()} onSchedule={onSchedule} onNewTask={onNewTask}/>)
    fireEvent.change(screen.getByLabelText('Actividad de las 09:00'), { target: { value: 'Trabajo profundo' } })
    expect(onSchedule).toHaveBeenCalledWith('09:00', 'Trabajo profundo')
    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    expect(onNewTask).toHaveBeenCalledOnce()
  })
})
