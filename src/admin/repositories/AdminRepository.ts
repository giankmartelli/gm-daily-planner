import type { AdminIdentity, DashboardMetrics, FeatureFlag, OperationalItem } from '../models'

export interface AdminRepository {
  getIdentity(): Promise<AdminIdentity | null>
  getMetrics(): Promise<DashboardMetrics>
  getFlags(): Promise<FeatureFlag[]>
  setFlag(key: string, enabled: boolean, rollout: number): Promise<void>
  listBeta(): Promise<OperationalItem[]>
  listFeedback(): Promise<OperationalItem[]>
  listAnnouncements(): Promise<OperationalItem[]>
  listErrors(): Promise<OperationalItem[]>
  listActivity(): Promise<OperationalItem[]>
}
