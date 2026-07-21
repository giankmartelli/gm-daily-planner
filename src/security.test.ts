import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('seguridad de producción', () => {
  const migration = readFileSync('supabase/migrations/202607210001_initial.sql', 'utf8')
  it('fuerza RLS y restringe todas las tablas por usuario', () => {
    expect(migration.match(/force row level security/g)).toHaveLength(3)
    expect(migration).toContain('(select auth.uid()) = user_id')
    expect(migration).toContain('revoke all')
    expect(migration).toContain('to authenticated')
  })
  it('protege integridad, tamaño y eliminación en cascada', () => {
    expect(migration).toContain('on delete cascade')
    expect(migration).toContain('pg_column_size(data)')
    expect(migration).toContain('unique(user_id, date)')
  })
  it('define cabeceras de seguridad y CSP', () => {
    const headers = readFileSync('public/_headers', 'utf8')
    expect(headers).toContain('X-Content-Type-Options: nosniff')
    expect(headers).toContain("object-src 'none'")
    expect(headers).toContain('Permissions-Policy:')
  })
})
