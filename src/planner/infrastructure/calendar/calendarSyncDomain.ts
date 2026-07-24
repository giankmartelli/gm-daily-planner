export type ExternalCalendarEvent = {
  externalEventId:string
  title:string
  startsAt:string
  endsAt:string
  timezone?:string|null
  recurringEventId?:string|null
  updatedAt?:string
}
export type IncrementalPage = {
  events:ExternalCalendarEvent[]
  deletedIds:string[]
  cursor?:string|null
  deltaLink?:string|null
}
export type IncrementalState = {
  events:ExternalCalendarEvent[]
  cursor?:string|null
  deltaLink?:string|null
}

export function mergeIncrementalCalendarState(current:IncrementalState,page:IncrementalPage):IncrementalState{
  const deleted=new Set(page.deletedIds)
  const events=new Map(current.events.filter(event=>!deleted.has(event.externalEventId)).map(event=>[event.externalEventId,event]))
  for(const event of page.events){
    const previous=events.get(event.externalEventId)
    if(!previous||!previous.updatedAt||!event.updatedAt||Date.parse(event.updatedAt)>=Date.parse(previous.updatedAt))events.set(event.externalEventId,event)
  }
  return {events:[...events.values()].sort((left,right)=>left.startsAt.localeCompare(right.startsAt)),cursor:page.cursor??current.cursor,deltaLink:page.deltaLink??current.deltaLink}
}

export function tokenNeedsRefresh(expiresAt:string|null|undefined,now=Date.now(),skewMs=60_000){
  return !expiresAt||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=now+skewMs
}

export function statusAfterCalendarFailure(status:number|'revoked'|'network'){
  if(status==='revoked')return 'revoked' as const
  if(status===401)return 'expired' as const
  return 'error' as const
}

export function isoToZonedTime(value:string,timezone:string){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value))
  const hour=parts.find(part=>part.type==='hour')?.value??'00'
  const minute=parts.find(part=>part.type==='minute')?.value??'00'
  return `${hour}:${minute}`
}

export async function synchronizeWithoutDataLoss(current:IncrementalState,load:()=>Promise<IncrementalPage>){
  try{return {state:mergeIncrementalCalendarState(current,await load()),error:null}}
  catch(error){return {state:current,error:error instanceof Error?error.message:'Fallo de red'}}
}
