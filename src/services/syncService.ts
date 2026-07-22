import type { RealtimeChannel, User } from '@supabase/supabase-js'
import { localPlannerRepository } from '../data/plannerRepository'
import { sanitizeDay, sanitizeWorkspace } from '../domain/validation'
import { reportError } from '../lib/monitoring'
import { supabase } from '../lib/supabase'

export type SyncState = 'local' | 'syncing' | 'synced' | 'error'
type DayRow = { date: string; data: unknown; updated_at: string }
type WorkspaceRow = { data: unknown; updated_at: string }
export type DaySyncReceipt = { userId: string; date: string; taskCount: number; updatedAt: string; version: number }

function sameDay(left: unknown, right: unknown) {
  return JSON.stringify(sanitizeDay(left)) === JSON.stringify(sanitizeDay(right))
}

function syncFailure(operation: string, detail: unknown) {
  const message = detail && typeof detail === 'object' && 'message' in detail ? String(detail.message) : String(detail)
  return new Error(`${operation}: ${message}`)
}

class SyncService {
  private channel: RealtimeChannel | null = null

  async synchronize(user: User) {
    if (!supabase) return
    try {
      const { data: remoteDays, error } = await supabase.from('planner_days').select('date,data,updated_at').eq('user_id', user.id).order('date')
      if (error) throw error
      const remoteMap = new Map((remoteDays as DayRow[]).map((row) => [row.date, row]))
      for (const date of localPlannerRepository.listDayKeys()) {
        if (!remoteMap.has(date)) await this.pushDay(user.id, date)
      }
      for (const row of remoteDays as DayRow[]) {
        const merge = localPlannerRepository.mergeRemoteDay(row.date, sanitizeDay(row.data), row.updated_at)
        if (merge === 'local') await this.pushDay(user.id, row.date)
      }
      const { data: remoteWorkspace, error: workspaceError } = await supabase.from('planner_workspaces').select('data,updated_at').eq('user_id', user.id).maybeSingle()
      if (workspaceError) throw workspaceError
      if (remoteWorkspace) {
        const row = remoteWorkspace as WorkspaceRow
        const merge = localPlannerRepository.mergeRemoteWorkspace(sanitizeWorkspace(row.data), row.updated_at)
        if (merge === 'local') await this.pushWorkspace(user.id)
      }
      else await this.pushWorkspace(user.id)
    } catch (error) { reportError(error, { operation: 'initial_sync' }); throw error }
  }

  async pushDay(userId: string, date: string) {
    if (!supabase) throw new Error('push_day: Supabase no está configurado')
    const local = localPlannerRepository.getDayRecord(date)
    if (!local) throw new Error(`push_day: no existe un registro local para ${date}`)
    const { data: upserted, error } = await supabase.from('planner_days')
      .upsert({ user_id: userId, date, data: local.data }, { onConflict: 'user_id,date' })
      .select('user_id,date,data,updated_at,version')
      .single()
    if (error) throw syncFailure('push_day upsert', error)
    if (!upserted || upserted.user_id !== userId || upserted.date !== date || !sameDay(upserted.data, local.data)) {
      throw new Error('push_day upsert: Supabase devolvió una fila incompleta o distinta del payload local')
    }

    const { data: verified, error: verifyError } = await supabase.from('planner_days')
      .select('user_id,date,data,updated_at,version')
      .eq('user_id', userId)
      .eq('date', date)
      .single()
    if (verifyError) throw syncFailure('push_day readback', verifyError)
    if (!verified || verified.user_id !== userId || verified.date !== date || !sameDay(verified.data, local.data)) {
      throw new Error('push_day readback: la fila leída no contiene la tarea recién guardada')
    }

    const current = localPlannerRepository.getDayRecord(date)
    if (current?.updatedAt === local.updatedAt && verified.updated_at) localPlannerRepository.saveDay(date, current.data, verified.updated_at)
    const receipt: DaySyncReceipt = { userId: verified.user_id, date: verified.date, taskCount: sanitizeDay(verified.data).tasks.length, updatedAt: verified.updated_at, version: verified.version }
    console.info('[GM sync] pushDay verificado', receipt)
    return receipt
  }

  async pushWorkspace(userId: string) {
    if (!supabase) throw new Error('push_workspace: Supabase no está configurado')
    const local = localPlannerRepository.getWorkspaceRecord()
    if (!local) throw new Error('push_workspace: no existe un registro local')
    const { data: upserted, error } = await supabase.from('planner_workspaces')
      .upsert({ user_id: userId, data: local.data }, { onConflict: 'user_id' })
      .select('user_id,data,updated_at,version')
      .single()
    if (error) throw syncFailure('push_workspace upsert', error)
    if (!upserted || upserted.user_id !== userId) throw new Error('push_workspace upsert: Supabase devolvió una fila inválida')
    const { data: verified, error: verifyError } = await supabase.from('planner_workspaces')
      .select('user_id,data,updated_at,version')
      .eq('user_id', userId)
      .single()
    if (verifyError) throw syncFailure('push_workspace readback', verifyError)
    if (!verified || verified.user_id !== userId || JSON.stringify(sanitizeWorkspace(verified.data)) !== JSON.stringify(local.data)) {
      throw new Error('push_workspace readback: la fila leída no coincide con el payload local')
    }
    const current = localPlannerRepository.getWorkspaceRecord()
    if (current?.updatedAt === local.updatedAt && verified.updated_at) localPlannerRepository.saveWorkspace(current.data, verified.updated_at)
    console.info('[GM sync] pushWorkspace verificado', { userId: verified.user_id, updatedAt: verified.updated_at, version: verified.version })
  }

  subscribe(user: User, onRemoteChange: () => void) {
    if (!supabase) return
    this.unsubscribe()
    this.channel = supabase.channel(`planner:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_days', filter: `user_id=eq.${user.id}` }, onRemoteChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_workspaces', filter: `user_id=eq.${user.id}` }, onRemoteChange)
      .subscribe()
  }

  unsubscribe() { if (this.channel && supabase) void supabase.removeChannel(this.channel); this.channel = null }
}

export const syncService = new SyncService()
