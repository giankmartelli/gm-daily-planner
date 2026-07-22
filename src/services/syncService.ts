import type { RealtimeChannel, User } from '@supabase/supabase-js'
import { localPlannerRepository } from '../data/plannerRepository'
import { sanitizeDay, sanitizeWorkspace } from '../domain/validation'
import { reportError } from '../lib/monitoring'
import { supabase } from '../lib/supabase'

export type SyncState = 'local' | 'syncing' | 'synced' | 'error'
type DayRow = { date: string; data: unknown; updated_at: string }
type WorkspaceRow = { data: unknown; updated_at: string }

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
    if (!supabase) return
    const local = localPlannerRepository.getDayRecord(date)
    if (!local) return
    const { data, error } = await supabase.from('planner_days')
      .upsert({ user_id: userId, date, data: local.data }, { onConflict: 'user_id,date' })
      .select('updated_at')
      .single()
    if (error) throw error
    const current = localPlannerRepository.getDayRecord(date)
    if (current?.updatedAt === local.updatedAt && data?.updated_at) localPlannerRepository.saveDay(date, current.data, data.updated_at)
  }

  async pushWorkspace(userId: string) {
    if (!supabase) return
    const local = localPlannerRepository.getWorkspaceRecord()
    if (!local) return
    const { data, error } = await supabase.from('planner_workspaces')
      .upsert({ user_id: userId, data: local.data }, { onConflict: 'user_id' })
      .select('updated_at')
      .single()
    if (error) throw error
    const current = localPlannerRepository.getWorkspaceRecord()
    if (current?.updatedAt === local.updatedAt && data?.updated_at) localPlannerRepository.saveWorkspace(current.data, data.updated_at)
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
