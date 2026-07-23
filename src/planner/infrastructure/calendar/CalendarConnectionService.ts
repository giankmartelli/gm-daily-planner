import type { SupabaseClient } from '@supabase/supabase-js'
import type { BusyBlock } from '../../domain/entities/Planning'

export type CalendarProvider='google'|'outlook'
export type CalendarConnection={id:string;provider:CalendarProvider;email:string;status:'active'|'expired'|'revoked'|'error'|'disconnected';scopes:string[];token_expires_at?:string;last_synced_at?:string;last_error?:string}

export class CalendarConnectionService {
  constructor(privateClient:SupabaseClient){this.client=privateClient}
  private readonly client:SupabaseClient
  async listConnections():Promise<CalendarConnection[]>{
    const {data,error}=await this.client.rpc('list_calendar_connections')
    if(error)throw new Error(error.message)
    return (data??[]) as CalendarConnection[]
  }
  async listEvents(from:string,until:string):Promise<BusyBlock[]>{
    const {data,error}=await this.client.from('external_calendar_events').select('id,title,starts_at,ends_at,provider,external_event_id').lt('starts_at',until).gt('ends_at',from).eq('status','confirmed').order('starts_at')
    if(error)throw new Error(error.message)
    return (data??[]).map(row=>({id:`${row.provider}:${row.external_event_id}`,title:row.title||'Ocupado',start:row.starts_at,end:row.ends_at,locked:true,kind:'event'}))
  }
  async authorize(provider:CalendarProvider){
    const response=await this.call(`/api/${provider==='google'?'google':'microsoft'}-calendar-auth-start`)
    if(!response.authorizationUrl)throw new Error('El servidor no devolvió una URL de autorización')
    window.location.assign(response.authorizationUrl)
  }
  async synchronize(provider:CalendarProvider){return this.call(`/api/${provider==='google'?'google':'microsoft'}-calendar-sync`)}
  async disconnect(provider:CalendarProvider){return this.call(`/api/${provider==='google'?'google':'microsoft'}-calendar-disconnect`)}
  private async call(path:string){
    const {data}=await this.client.auth.getSession();const token=data.session?.access_token
    if(!token)throw new Error('Inicia sesión para conectar un calendario.')
    const response=await fetch(path,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'}})
    const result=await response.json()
    if(!response.ok)throw new Error(result.error||'No fue posible completar la operación')
    return result
  }
}
