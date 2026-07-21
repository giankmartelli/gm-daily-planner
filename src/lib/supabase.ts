import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const missingVariables = [
  !url && 'VITE_SUPABASE_URL',
  !anonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean) as string[]

export const isSupabaseConfigured = missingVariables.length === 0 && Boolean(url?.startsWith('https://'))
export const supabaseConfigurationMessage = isSupabaseConfigured
  ? ''
  : missingVariables.length
    ? `Falta configurar ${missingVariables.join(' y ')} en .env.local. La aplicación continúa en modo local.`
    : 'VITE_SUPABASE_URL debe ser una URL HTTPS válida. La aplicación continúa en modo local.'

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'X-Client-Info': 'gm-daily-planner/1.0' } },
    })
  : null
