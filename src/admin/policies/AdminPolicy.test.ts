import { describe, expect, it } from 'vitest'
import { canAccess, visibleSections } from './AdminPolicy'

describe('AdminPolicy', () => {
  it('permite control completo al super_admin', () => {
    expect(visibleSections('super_admin')).toHaveLength(12)
    expect(canAccess('super_admin', 'security')).toBe(true)
  })
  it('limita beta_manager a operaciones beta y lectura necesaria', () => {
    expect(canAccess('beta_manager', 'beta')).toBe(true)
    expect(canAccess('beta_manager', 'flags')).toBe(false)
    expect(canAccess('beta_manager', 'settings')).toBe(false)
  })
  it('mantiene viewer estrictamente en lectura ejecutiva', () => {
    expect(visibleSections('viewer')).toEqual(['overview','analytics'])
  })
  it('permite soporte sin acceso a configuración o flags', () => {
    expect(canAccess('support', 'errors')).toBe(true)
    expect(canAccess('support', 'feedback')).toBe(true)
    expect(canAccess('support', 'settings')).toBe(false)
  })
})
