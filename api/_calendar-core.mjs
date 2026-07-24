import { createClient } from '@supabase/supabase-js'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const env = name => {
  const value=process.env[name]?.trim()
  if(!value)throw Object.assign(new Error(`Integración no configurada: falta ${name}`),{status:503})
  return value
}
const baseUrl=()=>env('PUBLIC_SITE_URL').replace(/\/$/,'')
const service=()=>createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})
const hash=value=>createHash('sha256').update(value).digest('base64url')
const encryptionKey=()=>createHash('sha256').update(env('CALENDAR_TOKEN_ENCRYPTION_KEY')).digest()
const encrypt=value=>{const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);const payload=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),payload].map(part=>part.toString('base64url')).join('.')}
const decrypt=value=>{const [iv,tag,payload]=value.split('.').map(part=>Buffer.from(part,'base64url'));const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(payload),decipher.final()]).toString('utf8')}
const send=(response,status,payload)=>response.status(status).setHeader('Cache-Control','no-store').json(payload)
const requirePost=request=>{if(request.method!=='POST')throw Object.assign(new Error('Método no permitido'),{status:405})}

async function authenticatedUser(request){
  const token=request.headers.authorization?.replace(/^Bearer\s+/i,'')
  if(!token)throw Object.assign(new Error('Sesión requerida'),{status:401})
  const auth=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await auth.auth.getUser(token)
  if(error||!data.user)throw Object.assign(new Error('Sesión inválida'),{status:401})
  return data.user
}
const providers={
  google:{
    clientId:()=>env('GOOGLE_CALENDAR_CLIENT_ID'),clientSecret:()=>env('GOOGLE_CALENDAR_CLIENT_SECRET'),
    authorization:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',
    scopes:['openid','email','https://www.googleapis.com/auth/calendar.readonly'],
    redirect:()=>`${baseUrl()}/api/google-calendar-auth-callback`,
  },
  outlook:{
    clientId:()=>env('MICROSOFT_CALENDAR_CLIENT_ID'),clientSecret:()=>env('MICROSOFT_CALENDAR_CLIENT_SECRET'),
    authorization:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',token:'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes:['openid','email','offline_access','Calendars.Read'],
    redirect:()=>`${baseUrl()}/api/microsoft-calendar-auth-callback`,
  },
}

export async function startAuthorization(provider,request,response){
  try{
    requirePost(request)
    const user=await authenticatedUser(request);const config=providers[provider]
    const state=randomBytes(32).toString('base64url');const verifier=randomBytes(48).toString('base64url')
    const {error}=await service().from('calendar_oauth_states').insert({user_id:user.id,provider,state_hash:hash(state),code_verifier_encrypted:encrypt(verifier),redirect_uri:config.redirect(),expires_at:new Date(Date.now()+10*60_000).toISOString()})
    if(error)throw error
    const query=new URLSearchParams({client_id:config.clientId(),redirect_uri:config.redirect(),response_type:'code',scope:config.scopes.join(' '),state,code_challenge:hash(verifier),code_challenge_method:'S256'})
    if(provider==='google'){query.set('access_type','offline');query.set('prompt','consent');query.set('include_granted_scopes','true')}
    return send(response,200,{authorizationUrl:`${config.authorization}?${query}`})
  }catch(error){return send(response,error.status??500,{error:error.message})}
}

export async function finishAuthorization(provider,request,response){
  const appRedirect=new URL('/app',baseUrl())
  try{
    const {code,state,error:oauthError}=request.query
    if(oauthError||!code||!state)throw new Error(oauthError||'Respuesta OAuth incompleta')
    const admin=service()
    const {data:record,error}=await admin.from('calendar_oauth_states').select('*').eq('state_hash',hash(state)).eq('provider',provider).is('consumed_at',null).single()
    if(error||!record||Date.parse(record.expires_at)<Date.now())throw new Error('Estado OAuth inválido o vencido')
    const config=providers[provider]
    const body=new URLSearchParams({client_id:config.clientId(),client_secret:config.clientSecret(),code,redirect_uri:record.redirect_uri,grant_type:'authorization_code',code_verifier:decrypt(record.code_verifier_encrypted)})
    const tokenResponse=await fetch(config.token,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body})
    const tokens=await tokenResponse.json();if(!tokenResponse.ok)throw new Error(tokens.error_description||tokens.error||'No fue posible intercambiar el código OAuth')
    const identity=await loadIdentity(provider,tokens.access_token)
    const account={user_id:record.user_id,provider,provider_account_id:identity.id,email:identity.email,status:'active',scopes:String(tokens.scope||config.scopes.join(' ')).split(' '),access_token_encrypted:encrypt(tokens.access_token),refresh_token_encrypted:tokens.refresh_token?encrypt(tokens.refresh_token):null,token_expires_at:tokens.expires_in?new Date(Date.now()+tokens.expires_in*1000).toISOString():null,updated_at:new Date().toISOString()}
    const {data:saved,error:saveError}=await admin.from('calendar_accounts').upsert(account,{onConflict:'user_id,provider,provider_account_id'}).select('id').single()
    if(saveError)throw saveError
    await admin.from('calendar_sync_state').upsert({account_id:saved.id,user_id:record.user_id,updated_at:new Date().toISOString()})
    await admin.from('calendar_oauth_states').update({consumed_at:new Date().toISOString()}).eq('id',record.id)
    appRedirect.searchParams.set('calendar','connected')
  }catch(error){appRedirect.searchParams.set('calendar','error');appRedirect.searchParams.set('reason',String(error.message).slice(0,120))}
  response.setHeader('Cache-Control','no-store');return response.redirect(302,appRedirect.toString())
}

async function loadIdentity(provider,token){
  const url=provider==='google'?'https://openidconnect.googleapis.com/v1/userinfo':'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName'
  const result=await fetch(url,{headers:{authorization:`Bearer ${token}`}});const body=await result.json()
  if(!result.ok)throw new Error('No fue posible verificar la identidad del calendario')
  return provider==='google'?{id:body.sub,email:body.email}:{id:body.id,email:body.mail||body.userPrincipalName}
}

export async function disconnect(provider,request,response){
  try{
    requirePost(request)
    const user=await authenticatedUser(request);const admin=service()
    const {data:accounts,error}=await admin.from('calendar_accounts').select('id').eq('user_id',user.id).eq('provider',provider).neq('status','disconnected')
    if(error)throw error
    const ids=accounts.map(account=>account.id)
    if(ids.length)await admin.from('calendar_accounts').update({status:'disconnected',access_token_encrypted:'revoked',refresh_token_encrypted:null,updated_at:new Date().toISOString()}).in('id',ids)
    return send(response,200,{disconnected:ids.length})
  }catch(error){return send(response,error.status??500,{error:error.message})}
}

export async function syncCalendar(provider,request,response){
  try{
    requirePost(request)
    const user=await authenticatedUser(request);const admin=service()
    const {data:accounts,error}=await admin.from('calendar_accounts').select('*').eq('user_id',user.id).eq('provider',provider).eq('status','active')
    if(error)throw error
    let synchronized=0
    for(const account of accounts){
      const accessToken=Date.parse(account.token_expires_at||0)<=Date.now()+60_000 ? await refreshAccount(provider,account,admin) : decrypt(account.access_token_encrypted)
      const {data:syncState}=await admin.from('calendar_sync_state').select('cursor,delta_link').eq('account_id',account.id).maybeSingle()
      const result=provider==='google'?await googleEvents(accessToken,syncState?.cursor):await outlookEvents(accessToken,syncState?.delta_link)
      const rows=result.events.map(event=>({...event,account_id:account.id,user_id:user.id,provider}))
      if(rows.length){const {error:upsertError}=await admin.from('external_calendar_events').upsert(rows,{onConflict:'account_id,external_event_id'});if(upsertError)throw upsertError}
      if(result.deletedIds.length)await admin.from('external_calendar_events').delete().eq('account_id',account.id).in('external_event_id',result.deletedIds)
      await admin.from('calendar_sync_state').upsert({account_id:account.id,user_id:user.id,cursor:result.cursor??syncState?.cursor??null,delta_link:result.deltaLink??syncState?.delta_link??null,last_synced_at:new Date().toISOString(),last_success_at:new Date().toISOString(),last_error:null,consecutive_failures:0,updated_at:new Date().toISOString()})
      synchronized+=rows.length
    }
    return send(response,200,{accounts:accounts.length,events:synchronized})
  }catch(error){return send(response,error.status??500,{error:error.message})}
}
export async function refreshCalendar(provider,request,response){
  try{
    requirePost(request)
    const user=await authenticatedUser(request);const admin=service()
    const {data:accounts,error}=await admin.from('calendar_accounts').select('*').eq('user_id',user.id).eq('provider',provider).eq('status','active')
    if(error)throw error
    for(const account of accounts)await refreshAccount(provider,account,admin)
    return send(response,200,{refreshed:accounts.length})
  }catch(error){return send(response,error.status??500,{error:error.message})}
}
async function refreshAccount(provider,account,admin){
  if(!account.refresh_token_encrypted){await admin.from('calendar_accounts').update({status:'expired'}).eq('id',account.id);throw new Error(`La autorización ${provider} debe renovarse`)}
  const config=providers[provider]
  const body=new URLSearchParams({client_id:config.clientId(),client_secret:config.clientSecret(),refresh_token:decrypt(account.refresh_token_encrypted),grant_type:'refresh_token'})
  const response=await fetch(config.token,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body})
  const tokens=await response.json();if(!response.ok)throw new Error(tokens.error_description||'No fue posible renovar la autorización')
  await admin.from('calendar_accounts').update({access_token_encrypted:encrypt(tokens.access_token),refresh_token_encrypted:tokens.refresh_token?encrypt(tokens.refresh_token):account.refresh_token_encrypted,token_expires_at:new Date(Date.now()+(tokens.expires_in||3600)*1000).toISOString(),status:'active',updated_at:new Date().toISOString()}).eq('id',account.id)
  return tokens.access_token
}
async function googleEvents(token,syncToken){
  const timeMin=new Date(Date.now()-7*86_400_000).toISOString(),timeMax=new Date(Date.now()+90*86_400_000).toISOString()
  const events=[],deletedIds=[];let pageToken,nextSyncToken
  do{
    const url=new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    const query=syncToken?{singleEvents:'true',showDeleted:'true',syncToken,maxResults:'2500'}:{singleEvents:'true',showDeleted:'true',timeMin,timeMax,maxResults:'2500'}
    if(pageToken)query.pageToken=pageToken
    url.search=new URLSearchParams(query).toString()
    const response=await fetch(url,{headers:{authorization:`Bearer ${token}`}})
    if(response.status===410&&syncToken)return googleEvents(token,null)
    const body=await response.json();if(!response.ok)throw new Error(body.error?.message||'Error de sincronización Google')
    for(const item of body.items||[]){
      if(item.status==='cancelled'){deletedIds.push(item.id);continue}
      if(!item.start||!item.end)continue
      events.push({external_event_id:item.id,title:item.summary||'Ocupado',starts_at:item.start.dateTime||`${item.start.date}T00:00:00Z`,ends_at:item.end.dateTime||`${item.end.date}T00:00:00Z`,timezone:item.start.timeZone||null,all_day:Boolean(item.start.date),recurring_event_id:item.recurringEventId||null,status:item.status||'confirmed',etag:item.etag||null,raw_hash:hash(JSON.stringify([item.id,item.updated,item.start,item.end]))})
    }
    pageToken=body.nextPageToken;nextSyncToken=body.nextSyncToken||nextSyncToken
  }while(pageToken)
  return {events,deletedIds,cursor:nextSyncToken}
}
async function outlookEvents(token,deltaLink){
  const start=new Date(Date.now()-7*86_400_000).toISOString(),end=new Date(Date.now()+90*86_400_000).toISOString()
  let url=deltaLink||`https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`
  const events=[],deletedIds=[];let finalDeltaLink=deltaLink
  while(url){
    const response=await fetch(url,{headers:{authorization:`Bearer ${token}`,'Prefer':'outlook.timezone=\"UTC\"'}});const body=await response.json()
    if(response.status===410&&deltaLink)return outlookEvents(token,null)
    if(!response.ok)throw new Error(body.error?.message||'Error de sincronización Outlook')
    for(const item of body.value||[]){
      if(item['@removed']||item.isCancelled){deletedIds.push(item.id);continue}
      if(!item.start||!item.end)continue
      events.push({external_event_id:item.id,title:item.subject||'Ocupado',starts_at:`${item.start.dateTime}${item.start.dateTime.endsWith('Z')?'':'Z'}`,ends_at:`${item.end.dateTime}${item.end.dateTime.endsWith('Z')?'':'Z'}`,timezone:item.start.timeZone||'UTC',all_day:Boolean(item.isAllDay),recurring_event_id:item.seriesMasterId||null,status:'confirmed',raw_hash:hash(JSON.stringify([item.id,item.lastModifiedDateTime,item.start,item.end]))})
    }
    url=body['@odata.nextLink']||null;finalDeltaLink=body['@odata.deltaLink']||finalDeltaLink
  }
  return {events,deletedIds,deltaLink:finalDeltaLink}
}
