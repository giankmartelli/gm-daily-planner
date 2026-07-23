import type { AdminRepository } from '../repositories/AdminRepository'
import type { AdminIdentity, DashboardMetrics, FeatureFlag, OperationalItem } from '../models'

export class UnavailableAdminRepository implements AdminRepository {
  private fail(): never { throw new Error('Supabase no está configurado. El Control Center requiere una conexión segura.') }
  getIdentity(): Promise<AdminIdentity | null> { return Promise.resolve(null) }
  getMetrics(): Promise<DashboardMetrics> { return Promise.reject(this.fail()) }
  getFlags(): Promise<FeatureFlag[]> { return Promise.reject(this.fail()) }
  setFlag(): Promise<void> { return Promise.reject(this.fail()) }
  listBeta(): Promise<OperationalItem[]> { return Promise.reject(this.fail()) }
  listFeedback(): Promise<OperationalItem[]> { return Promise.reject(this.fail()) }
  listAnnouncements(): Promise<OperationalItem[]> { return Promise.reject(this.fail()) }
  listErrors(): Promise<OperationalItem[]> { return Promise.reject(this.fail()) }
  listActivity(): Promise<OperationalItem[]> { return Promise.reject(this.fail()) }
}
