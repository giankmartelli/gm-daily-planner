import { emptyDay, emptyWorkspace, type DayData, type WorkspaceData } from '../domain/models'
import { sanitizeDay, sanitizeWorkspace } from '../domain/validation'

export type SaveResult = { ok: true } | { ok: false; message: string }

export interface PlannerRepository {
  getDay(date: string): DayData
  saveDay(date: string, data: DayData): SaveResult
  getWorkspace(): WorkspaceData
  saveWorkspace(data: WorkspaceData): SaveResult
  listDayKeys(): string[]
}

const DAY_PREFIX = 'gm-daily-planner:'
const WORKSPACE_KEY = 'gm-daily-planner:workspace:v1'

export const localPlannerRepository: PlannerRepository = {
  getDay(date) {
    try {
      const raw = localStorage.getItem(`${DAY_PREFIX}${date}`)
      if (!raw) return emptyDay()
      return sanitizeDay(JSON.parse(raw))
    } catch { return emptyDay() }
  },
  saveDay(date, data) { try { localStorage.setItem(`${DAY_PREFIX}${date}`, JSON.stringify(sanitizeDay(data))); return { ok: true } } catch { return { ok: false, message: 'No pudimos guardar los cambios. Libera espacio del navegador e inténtalo de nuevo.' } } },
  getWorkspace() {
    try { return sanitizeWorkspace({ ...emptyWorkspace(), ...JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? '{}') }) }
    catch { return emptyWorkspace() }
  },
  saveWorkspace(data) { try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(sanitizeWorkspace(data))); return { ok: true } } catch { return { ok: false, message: 'No pudimos guardar los datos generales.' } } },
  listDayKeys() {
    return Object.keys(localStorage).filter((key) => /^gm-daily-planner:\d{4}-\d{2}-\d{2}$/.test(key)).map((key) => key.slice(DAY_PREFIX.length)).sort()
  },
}

// Este contrato permite sustituir localStorage por adaptadores Supabase,
// Firebase o una API PostgreSQL sin cambiar los componentes de producto.
