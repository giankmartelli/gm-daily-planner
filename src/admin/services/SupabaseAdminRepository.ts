import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminRepository } from '../repositories/AdminRepository'
import type { AdminIdentity, DashboardMetrics, FeatureFlag, OperationalItem } from '../models'

const emptyMetrics: DashboardMetrics = { users:0,activeUsers:0,betaUsers:0,suspendedUsers:0,dau:0,wau:0,mau:0,sessions:0,errors:0,feedback:0,featureUsage:{} }
const item = (row: Record<string, unknown>): OperationalItem => ({
  id: String(row.id), title: String(row.title ?? row.email ?? row.message ?? row.event_name ?? 'Registro'),
  detail: String(row.body ?? row.kind ?? row.source ?? row.feature ?? ''), status: String(row.status ?? 'registrado'),
  createdAt: String(row.created_at ?? row.last_seen_at ?? ''),
})

export class SupabaseAdminRepository implements AdminRepository {
  private readonly client: SupabaseClient
  constructor(client: SupabaseClient) { this.client = client }
  async getIdentity(): Promise<AdminIdentity | null> {
    const { data: auth } = await this.client.auth.getUser()
    if (!auth.user) return null
    const { data, error } = await this.client.from('admin_memberships').select('role,active').eq('user_id', auth.user.id).maybeSingle()
    if (error || !data?.active) return null
    return { userId: auth.user.id, email: auth.user.email ?? 'Administrador', role: data.role }
  }
  async getMetrics(): Promise<DashboardMetrics> {
    const { data, error } = await this.client.rpc('admin_dashboard_metrics')
    if (error || data?.forbidden) throw new Error(error?.message ?? 'Acceso administrativo denegado')
    return { ...emptyMetrics, ...data }
  }
  async getFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await this.client.from('feature_flags').select('*').order('key')
    if (error) throw new Error(error.message)
    return data ?? []
  }
  async setFlag(key: string, enabled: boolean, rollout: number) {
    const { data: before } = await this.client.from('feature_flags').select('*').eq('key', key).single()
    const { error } = await this.client.from('feature_flags').update({ enabled, rollout_percentage: rollout, updated_at:new Date().toISOString() }).eq('key', key)
    if (error) throw new Error(error.message)
    await this.client.rpc('admin_record_audit', { action_name:'feature_flag.updated', resource_name:'feature_flag', resource_identifier:key, previous:before, current:{enabled,rollout_percentage:rollout} })
  }
  private async list(table: string, columns = '*'): Promise<OperationalItem[]> {
    const { data, error } = await this.client.from(table).select(columns).order('created_at', { ascending:false }).limit(50)
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(item)
  }
  listBeta() { return this.list('beta_invitations') }
  listFeedback() { return this.list('feedback_items') }
  listAnnouncements() { return this.list('announcements') }
  listErrors() { return this.list('error_events') }
  listActivity() { return this.list('activity_events') }
}
