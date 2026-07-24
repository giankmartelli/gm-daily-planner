import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'
import { featureFlags } from './ai-planning/flags'

const migration=readFileSync('supabase/migrations/202607230003_calendar_read_integrations.sql','utf8')
describe('seguridad de calendarios',()=>{
  it('incluye user_id y RLS forzada en las cinco tablas de dominio',()=>{
    for(const table of ['calendar_accounts','external_calendars','external_calendar_events','calendar_sync_state','calendar_event_links']){
      const definition=migration.slice(migration.indexOf(`create table if not exists public.${table}`))
      expect(definition.slice(0,1600)).toContain('user_id uuid not null')
      expect(migration).toContain(`alter table public.${table} force row level security`)
    }
  })
  it('limita las políticas al propietario',()=>{
    expect(migration.match(/auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(5)
    expect(migration).toContain('revoke all on public.calendar_accounts')
  })
  it('no declara secretos privilegiados como variables VITE',()=>{
    const example=readFileSync('.env.example','utf8')
    expect(example).not.toMatch(/VITE_.*(?:SERVICE_ROLE|CLIENT_SECRET|TOKEN_ENCRYPTION)/)
  })
  it('mantiene Google y Outlook deshabilitados por defecto',()=>{
    expect(featureFlags.googleCalendar).toBe(false)
    expect(featureFlags.outlookCalendar).toBe(false)
  })
})
