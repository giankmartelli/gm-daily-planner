import type { RealtimeChannel, User } from '@supabase/supabase-js'
import { localPlannerRepository } from '../data/plannerRepository'
import { sanitizeDay, sanitizeWorkspace } from '../domain/validation'
import { reportError } from '../lib/monitoring'
import { supabase } from '../lib/supabase'

export type SyncState = 'local' | 'syncing' | 'synced' | 'error'
type DayRow = { date: string; data: unknown; updated_at: string }

class SyncService {
  private channel: RealtimeChannel | null = null

  async synchronize(user: User) {
    if (!supabase) return
    try {
      const { data: remoteDays, error } = await supabase.from('planner_days').select('date,data,updated_at').order('date')
      if (error) throw error
      const remoteMap = new Map((remoteDays as DayRow[]).map((row) => [row.date, row]))
      for (const date of localPlannerRepository.listDayKeys()) {
        if (!remoteMap.has(date)) await this.pushDay(user.id, date)
      }
      for (const row of remoteDays as DayRow[]) localPlannerRepository.saveDay(row.date, sanitizeDay(row.data))
      const { data: remoteWorkspace, error: workspaceError } = await supabase.from('planner_workspaces').select('data').maybeSingle()
      if (workspaceError) throw workspaceError
      if (remoteWorkspace) localPlannerRepository.saveWorkspace(sanitizeWorkspace(remoteWorkspace.data))
      else await this.pushWorkspace(user.id)
    } catch (error) { reportError(error, { operation: 'initial_sync' }); throw error }
  }

  async pushDay(userId: string, date: string) {
    if (!supabase) return
    const { error } = await supabase.from('planner_days').upsert({ user_id: userId, date, data: localPlannerRepository.getDay(date), updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' })
    if (error) throw error
  }

  async pushWorkspace(userId: string) {
    if (!supabase) return
    const { error } = await supabase.from('planner_workspaces').upsert({ user_id: userId, data: localPlannerRepository.getWorkspace(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
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
