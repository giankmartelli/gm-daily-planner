import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const [days, workspaces, profiles] = await Promise.all([
  client.from('planner_days').select('*'), client.from('planner_workspaces').select('*'), client.from('profiles').select('*'),
])
for (const result of [days, workspaces, profiles]) if (result.error) throw result.error

const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
await mkdir('backups', { recursive: true })
const path = `backups/gm-planner-${timestamp}.json`
await writeFile(path, JSON.stringify({ created_at: new Date().toISOString(), planner_days: days.data, planner_workspaces: workspaces.data, profiles: profiles.data }, null, 2), { mode: 0o600 })
console.log(`Backup cifrable generado: ${path}`)
