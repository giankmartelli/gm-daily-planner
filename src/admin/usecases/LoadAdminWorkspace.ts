import type { AdminRepository } from '../repositories/AdminRepository'
import type { AdminSection } from '../models'

export class LoadAdminWorkspace {
  private readonly repository: AdminRepository
  constructor(repository: AdminRepository) { this.repository = repository }
  async execute(section: AdminSection) {
    if (section === 'overview' || section === 'analytics' || section === 'ai') return this.repository.getMetrics()
    if (section === 'flags') return this.repository.getFlags()
    if (section === 'beta' || section === 'users') return this.repository.listBeta()
    if (section === 'feedback') return this.repository.listFeedback()
    if (section === 'announcements') return this.repository.listAnnouncements()
    if (section === 'errors' || section === 'security') return this.repository.listErrors()
    if (section === 'activity') return this.repository.listActivity()
    return null
  }
}
