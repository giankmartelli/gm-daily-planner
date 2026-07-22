import { emptyDay, emptyWorkspace, type DayData, type WorkspaceData } from '../domain/models'
import { sanitizeDay, sanitizeWorkspace } from '../domain/validation'

export type SaveResult = { ok: true } | { ok: false; message: string }
export type PlannerRecord<T> = { data: T; updatedAt: string }
export type MergeResult = 'local' | 'remote' | 'equal'

export interface PlannerRepository {
  setScope(userId: string | null): void
  getDay(date: string): DayData
  getDayRecord(date: string): PlannerRecord<DayData> | null
  saveDay(date: string, data: DayData, updatedAt?: string): SaveResult
  mergeRemoteDay(date: string, data: DayData, updatedAt: string): MergeResult
  getWorkspace(): WorkspaceData
  getWorkspaceRecord(): PlannerRecord<WorkspaceData> | null
  saveWorkspace(data: WorkspaceData, updatedAt?: string): SaveResult
  mergeRemoteWorkspace(data: WorkspaceData, updatedAt: string): MergeResult
  listDayKeys(): string[]
}

const LEGACY_DAY_PREFIX = 'gm-daily-planner:'
const LEGACY_WORKSPACE_KEY = 'gm-daily-planner:workspace:v1'
let scope = 'local'
const dayPrefix = () => `gm-daily-planner:scope:${scope}:day:`
const workspaceKey = () => `gm-daily-planner:scope:${scope}:workspace:v1`
const EPOCH = new Date(0).toISOString()

function validTimestamp(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : EPOCH
}

function decodeRecord<T>(raw: string | null, sanitize: (value: unknown) => T): PlannerRecord<T> | null {
  if (!raw) return null
  const parsed = JSON.parse(raw) as unknown
  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    const envelope = parsed as { data: unknown; updatedAt?: unknown }
    return { data: sanitize(envelope.data), updatedAt: validTimestamp(envelope.updatedAt) }
  }
  return { data: sanitize(parsed), updatedAt: EPOCH }
}

function encodeRecord<T>(data: T, updatedAt = new Date().toISOString()) {
  return JSON.stringify({ data, updatedAt: validTimestamp(updatedAt) })
}

function compareRemote(local: PlannerRecord<unknown> | null, remoteUpdatedAt: string): MergeResult {
  if (!local) return 'remote'
  const difference = Date.parse(validTimestamp(remoteUpdatedAt)) - Date.parse(local.updatedAt)
  return difference > 0 ? 'remote' : difference < 0 ? 'local' : 'equal'
}

function readDayRecord(date: string) {
  const raw = localStorage.getItem(`${dayPrefix()}${date}`)
    ?? (scope === 'local' ? localStorage.getItem(`${LEGACY_DAY_PREFIX}${date}`) : null)
  return decodeRecord(raw, sanitizeDay)
}

function readWorkspaceRecord() {
  const raw = localStorage.getItem(workspaceKey())
    ?? (scope === 'local' ? localStorage.getItem(LEGACY_WORKSPACE_KEY) : null)
  return decodeRecord(raw, (value) => sanitizeWorkspace({ ...emptyWorkspace(), ...(value && typeof value === 'object' ? value : {}) }))
}

export const localPlannerRepository: PlannerRepository = {
  setScope(userId) { scope = userId ? `user:${userId}` : 'local' },
  getDay(date) {
    try { return readDayRecord(date)?.data ?? emptyDay() } catch { return emptyDay() }
  },
  getDayRecord(date) {
    try { return readDayRecord(date) } catch { return null }
  },
  saveDay(date, data, updatedAt) {
    try {
      const sanitized = sanitizeDay(data)
      const current = readDayRecord(date)
      if (!updatedAt && current && JSON.stringify(current.data) === JSON.stringify(sanitized)) return { ok: true }
      localStorage.setItem(`${dayPrefix()}${date}`, encodeRecord(sanitized, updatedAt)); return { ok: true }
    }
    catch { return { ok: false, message: 'No pudimos guardar los cambios. Libera espacio del navegador e inténtalo de nuevo.' } }
  },
  mergeRemoteDay(date, data, updatedAt) {
    const local = this.getDayRecord(date)
    const result = compareRemote(local, updatedAt)
    if (result !== 'remote') return result
    this.saveDay(date, data, updatedAt)
    return 'remote'
  },
  getWorkspace() {
    try { return readWorkspaceRecord()?.data ?? emptyWorkspace() } catch { return emptyWorkspace() }
  },
  getWorkspaceRecord() {
    try { return readWorkspaceRecord() } catch { return null }
  },
  saveWorkspace(data, updatedAt) {
    try {
      const sanitized = sanitizeWorkspace(data)
      const current = readWorkspaceRecord()
      if (!updatedAt && current && JSON.stringify(current.data) === JSON.stringify(sanitized)) return { ok: true }
      localStorage.setItem(workspaceKey(), encodeRecord(sanitized, updatedAt)); return { ok: true }
    }
    catch { return { ok: false, message: 'No pudimos guardar los datos generales.' } }
  },
  mergeRemoteWorkspace(data, updatedAt) {
    const local = this.getWorkspaceRecord()
    const result = compareRemote(local, updatedAt)
    if (result !== 'remote') return result
    this.saveWorkspace(data, updatedAt)
    return 'remote'
  },
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
