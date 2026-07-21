import { emptyDay, emptyWorkspace, type DayData, type WorkspaceData } from '../domain/models'
import { sanitizeDay, sanitizeWorkspace } from '../domain/validation'

export type SaveResult = { ok: true } | { ok: false; message: string }

export interface PlannerRepository {
  setScope(userId: string | null): void
  getDay(date: string): DayData
  saveDay(date: string, data: DayData): SaveResult
  getWorkspace(): WorkspaceData
  saveWorkspace(data: WorkspaceData): SaveResult
  listDayKeys(): string[]
}

const LEGACY_DAY_PREFIX = 'gm-daily-planner:'
const LEGACY_WORKSPACE_KEY = 'gm-daily-planner:workspace:v1'
let scope = 'local'
const dayPrefix = () => `gm-daily-planner:scope:${scope}:day:`
const workspaceKey = () => `gm-daily-planner:scope:${scope}:workspace:v1`

export const localPlannerRepository: PlannerRepository = {
  setScope(userId) { scope = userId ? `user:${userId}` : 'local' },
  getDay(date) {
    try {
      const raw = localStorage.getItem(`${dayPrefix()}${date}`)
        ?? (scope === 'local' ? localStorage.getItem(`${LEGACY_DAY_PREFIX}${date}`) : null)
      if (!raw) return emptyDay()
      return sanitizeDay(JSON.parse(raw))
    } catch { return emptyDay() }
  },
  saveDay(date, data) { try { localStorage.setItem(`${dayPrefix()}${date}`, JSON.stringify(sanitizeDay(data))); return { ok: true } } catch { return { ok: false, message: 'No pudimos guardar los cambios. Libera espacio del navegador e inténtalo de nuevo.' } } },
  getWorkspace() {
    try {
      const raw = localStorage.getItem(workspaceKey())
        ?? (scope === 'local' ? localStorage.getItem(LEGACY_WORKSPACE_KEY) : null)
      return sanitizeWorkspace({ ...emptyWorkspace(), ...JSON.parse(raw ?? '{}') })
    }
    catch { return emptyWorkspace() }
  },
  saveWorkspace(data) { try { localStorage.setItem(workspaceKey(), JSON.stringify(sanitizeWorkspace(data))); return { ok: true } } catch { return { ok: false, message: 'No pudimos guardar los datos generales.' } } },
  listDayKeys() {
    const currentPrefix = dayPrefix()
    const current = Object.keys(localStorage).filter((key) => key.startsWith(currentPrefix)).map((key) => key.slice(currentPrefix.length))
    const legacy = scope === 'local'
      ? Object.keys(localStorage).filter((key) => /^gm-daily-planner:\d{4}-\d{2}-\d{2}$/.test(key)).map((key) => key.slice(LEGACY_DAY_PREFIX.length))
      : []
    return [...new Set([...current, ...legacy])].sort()
  },
}

// Este contrato permite sustituir localStorage por adaptadores Supabase,
// Firebase o una API PostgreSQL sin cambiar los componentes de producto.
