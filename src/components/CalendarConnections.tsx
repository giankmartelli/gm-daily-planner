import { CalendarDays, Cloud, RefreshCw, Unplug } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { CalendarConnectionService, type CalendarConnection, type CalendarProvider } from '../planner/infrastructure/calendar/CalendarConnectionService'
import { SyncStatusBadge } from './SyncStatusBadge'
import { featureFlags } from '../ai-planning/flags'

export function CalendarConnections({user}:{user:User|null}){
  const service=useMemo(()=>supabase?new CalendarConnectionService(supabase):null,[])
  const [connections,setConnections]=useState<CalendarConnection[]>([])
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState('')
  const load=useCallback(async()=>{
    if(!service||!user){setConnections([]);return}
    try{setConnections(await service.listConnections())}
    catch(error){setMessage(error instanceof Error?error.message:'No fue posible cargar los calendarios')}
  },[service,user])
  useEffect(()=>{void Promise.resolve().then(load)},[load])
  const run=async(provider:CalendarProvider,action:'connect'|'sync'|'disconnect')=>{
    if(!service)return
    setBusy(`${provider}:${action}`);setMessage('')
    try{
      if(action==='connect')await service.authorize(provider)
      else if(action==='sync'){
        const result=await service.synchronize(provider)
        setMessage(`${result.events??0} eventos sincronizados.`)
      }else{
        await service.disconnect(provider)
        setMessage('Calendario desconectado sin eliminar tus tareas.')
      }
    }catch(error){setMessage(error instanceof Error?error.message:'No fue posible completar la operación')}
    finally{setBusy('');await load()}
  }
  return <section className="panel calendar-connections"><header><div><span className="icon-box blue"><Cloud size={17}/></span><div><h2>Calendarios conectados</h2><p>Solo lectura · tus reuniones bloquean tiempo</p></div></div></header>
    {!user&&<div className="calendar-connect-empty"><CalendarDays size={22}/><strong>Inicia sesión para conectar calendarios</strong><p>La agenda local seguirá funcionando sin conexión.</p></div>}
    <div className="calendar-provider-list">{(['google','outlook'] as const).map(provider=>{const connection=connections.find(item=>item.provider===provider&&item.status!=='disconnected');const label=provider==='google'?'Google Calendar':'Outlook Calendar';const enabled=provider==='google'?featureFlags.googleCalendar:featureFlags.outlookCalendar;return <article key={provider}><div className={`provider-mark ${provider}`}>{provider==='google'?'G':'O'}</div><div><strong>{label}</strong><small>{enabled?(connection?.email??'No conectado'):'Integración no configurada'}</small></div>{enabled&&connection?<><SyncStatusBadge status={connection.status}/><button disabled={Boolean(busy)} onClick={()=>void run(provider,'sync')} aria-label={`Sincronizar ${label}`}><RefreshCw size={14}/></button><button disabled={Boolean(busy)} onClick={()=>void run(provider,'disconnect')} aria-label={`Desconectar ${label}`}><Unplug size={14}/></button></>:<button className="connect-calendar" disabled={!user||!enabled||Boolean(busy)} onClick={()=>void run(provider,'connect')}>{enabled?'Conectar':'No disponible'}</button>}</article>})}</div>
    {message&&<p className="calendar-connection-message" role="status">{message}</p>}
  </section>
}
