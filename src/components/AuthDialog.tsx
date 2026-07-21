import { useState, type FormEvent } from 'react'
import { Cloud, LoaderCircle, X } from 'lucide-react'
import { isSupabaseConfigured, supabase, supabaseConfigurationMessage } from '../lib/supabase'

type Props = { open: boolean; onClose: () => void }

export function AuthDialog({ open, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  if (!open) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return setStatus(supabaseConfigurationMessage)
    if (!email.includes('@') || password.length < 8) return setStatus('Usa un correo válido y una contraseña de al menos 8 caracteres.')
    setLoading(true); setStatus('')
    const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (result.error) setStatus(result.error.message || 'No se pudo completar la autenticación. Inténtalo de nuevo.')
    else if (mode === 'signup' && !result.data.session) setStatus('Revisa tu correo para confirmar la cuenta.')
    else onClose()
  }

  return <div className="modal-shade" onMouseDown={onClose}><section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}><button className="auth-close" onClick={onClose} aria-label="Cerrar"><X size={18}/></button><span className="auth-icon"><Cloud size={24}/></span><h2 id="auth-title">{mode === 'login' ? 'Sincroniza tu espacio' : 'Crea tu cuenta'}</h2><p>{isSupabaseConfigured ? 'Accede desde cualquier dispositivo sin perder tu modo offline.' : supabaseConfigurationMessage}</p><form onSubmit={submit}><label>Correo electrónico<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label><label>Contraseña<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required/></label>{status && <p className="auth-status" role="status">{status}</p>}<button className="auth-submit" disabled={loading || !isSupabaseConfigured}>{loading && <LoaderCircle className="spin" size={15}/>} {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button></form><button className="auth-switch" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? '¿No tienes cuenta? Crear una' : 'Ya tengo cuenta'}</button></section></div>
}
