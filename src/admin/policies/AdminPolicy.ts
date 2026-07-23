import type { AdminRole, AdminSection } from '../models'

const permissions: Record<AdminRole, AdminSection[]> = {
  super_admin: ['overview','beta','users','flags','feedback','announcements','errors','activity','analytics','ai','security','settings'],
  admin: ['overview','beta','users','flags','feedback','announcements','errors','activity','analytics','ai','security','settings'],
  beta_manager: ['overview','beta','users','feedback','analytics'],
  support: ['overview','users','feedback','errors','activity'],
  viewer: ['overview','analytics'],
}

export const canAccess = (role: AdminRole, section: AdminSection) => permissions[role].includes(section)
export const visibleSections = (role: AdminRole) => permissions[role]
