import type { DayData, EnergyLevel, Goal, Task, TimeSession } from '../domain/models'
import type { CalendarBlock, ContextProvider, ContextValue, EnergyProfile, TaskCandidate } from './domain'

const confirmed = <T>(value: T, source: string): ContextValue<T> => ({ status: 'CONFIRMED', value, source, observedAt: new Date().toISOString() })
const unavailable = <T>(source: string, explanation: string): ContextValue<T> => ({ status: 'UNAVAILABLE', source, explanation })

export class TaskContextProvider implements ContextProvider<TaskCandidate[]> {
  private readonly read: (date: string) => DayData
  constructor(read: (date: string) => DayData) { this.read = read }
  async isAvailable() { return true }
  async getContext(_userId: string | undefined, date: Date) {
    const key = new Intl.DateTimeFormat('sv-SE').format(date)
    return confirmed(this.read(key).tasks.map((task) => ({ ...task, normalizedDuration: Math.max(5, task.estimatedMinutes ?? 30) })), 'Tareas guardadas')
  }
}

export class CalendarContextProvider implements ContextProvider<CalendarBlock[]> {
  private readonly read: (date: string) => DayData
  constructor(read: (date: string) => DayData) { this.read = read }
  async isAvailable() { return true }
  async getContext(_userId: string | undefined, date: Date) {
    const schedule = this.read(new Intl.DateTimeFormat('sv-SE').format(date)).schedule
    return confirmed(Object.entries(schedule).flatMap(([start, title]) => title.trim() ? [{
      id: `calendar:${start}`, title, start, end: addMinutes(start, 60), locked: true, source: 'CONFIRMED' as const,
    }] : []), 'Agenda interna')
  }
}

export class FocusHistoryProvider implements ContextProvider<TimeSession[]> {
  private readonly read: () => TimeSession[]
  constructor(read: () => TimeSession[]) { this.read = read }
  async isAvailable() { return true }
  async getContext() { return confirmed(this.read(), 'Historial de enfoque') }
}

export class UserPreferencesProvider implements ContextProvider<{ availableFrom: string; availableUntil: string }> {
  private readonly value: { availableFrom: string; availableUntil: string }
  constructor(value = { availableFrom: '08:00', availableUntil: '18:00' }) { this.value = value }
  async isAvailable() { return true }
  async getContext() { return confirmed(this.value, 'Preferencias del usuario') }
}

export class EnergyContextProvider implements ContextProvider<EnergyProfile> {
  private readonly read: () => EnergyLevel | undefined
  constructor(read: () => EnergyLevel | undefined) { this.read = read }
  async isAvailable() { return this.read() !== undefined }
  async getContext() {
    const level = this.read()
    return level ? confirmed({ level, source: 'CONFIRMED' as const }, 'Energía declarada') : unavailable<EnergyProfile>('Energía', 'Declara tu energía para personalizar el plan.')
  }
}

export class WeatherContextProvider implements ContextProvider<unknown> {
  async isAvailable() { return false }
  async getContext() { return unavailable('Clima', 'No hay un proveedor meteorológico configurado.') }
}

export class SleepContextProvider implements ContextProvider<unknown> {
  async isAvailable() { return false }
  async getContext() { return unavailable('Sueño', 'No hay integración ni entrada manual de sueño.') }
}

export const goalsContext = (goals: Goal[]) => confirmed(goals, 'Objetivos guardados')
export const taskContext = (tasks: Task[]) => confirmed(tasks.map((task) => ({ ...task, normalizedDuration: task.estimatedMinutes ?? 30 })), 'Tareas guardadas')

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min(1439, hour * 60 + minute + minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
