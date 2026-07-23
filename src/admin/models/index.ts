export type AdminRole = 'super_admin' | 'admin' | 'beta_manager' | 'support' | 'viewer'
export type AdminSection = 'overview' | 'beta' | 'users' | 'flags' | 'feedback' | 'announcements' | 'errors' | 'activity' | 'analytics' | 'ai' | 'security' | 'settings'

export interface AdminIdentity { userId: string; email: string; role: AdminRole }
export interface DashboardMetrics {
  users: number; activeUsers: number; betaUsers: number; suspendedUsers: number
  dau: number; wau: number; mau: number; sessions: number; errors: number; feedback: number
  featureUsage: Record<string, number>
}
export interface FeatureFlag {
  key: string; description: string; enabled: boolean; rollout_percentage: number; updated_at: string
}
export interface OperationalItem {
  id: string; title: string; detail: string; status: string; createdAt: string
}
