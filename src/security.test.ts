import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('seguridad de producción', () => {
  const migration = readFileSync('supabase/migrations/202607210001_initial.sql', 'utf8')
  const syncService = readFileSync('src/services/syncService.ts', 'utf8')
  it('fuerza RLS y restringe todas las tablas por usuario', () => {
    expect(migration.match(/force row level security/g)).toHaveLength(3)
    expect(migration).toContain('(select auth.uid()) = user_id')
    expect(migration).toContain('revoke all')
    expect(migration).toContain('to authenticated')
  })
  it('autoriza CRUD únicamente cuando auth.uid coincide con el propietario', () => {
    expect(migration).toContain('create policy "days_owner_all" on public.planner_days for all to authenticated')
    expect(migration).toContain('using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)')
    expect(migration).toContain('grant select, insert, update, delete on public.profiles, public.planner_days, public.planner_workspaces to authenticated')
  })
  it('envía y filtra user_id en todas las operaciones sincronizadas', () => {
    expect(syncService.match(/\.eq\('user_id', user\.id\)/g)).toHaveLength(2)
    expect(syncService.match(/user_id: userId/g)).toHaveLength(2)
    expect(syncService).toContain("filter: `user_id=eq.${user.id}`")
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
