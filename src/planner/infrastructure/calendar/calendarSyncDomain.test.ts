import { describe,expect,it } from 'vitest'
import { isoToZonedTime,mergeIncrementalCalendarState,statusAfterCalendarFailure,synchronizeWithoutDataLoss,tokenNeedsRefresh,type IncrementalState } from './calendarSyncDomain'

const event=(id:string,updatedAt='2026-07-23T10:00:00Z',recurringEventId?:string)=>({externalEventId:id,title:id,startsAt:'2026-07-23T13:00:00Z',endsAt:'2026-07-23T14:00:00Z',updatedAt,recurringEventId})
describe('calendarSyncDomain',()=>{
  it('deduplica por identificador y conserva la versión más reciente',()=>{
    const state=mergeIncrementalCalendarState({events:[event('one')]},{events:[event('one','2026-07-23T11:00:00Z')],deletedIds:[]})
    expect(state.events).toHaveLength(1)
    expect(state.events[0].updatedAt).toContain('11:00')
  })
  it('conserva cursores incrementales opacos',()=>{
    expect(mergeIncrementalCalendarState({events:[],cursor:'old'},{events:[],deletedIds:[],cursor:'next'}).cursor).toBe('next')
    expect(mergeIncrementalCalendarState({events:[],deltaLink:'old'},{events:[],deletedIds:[],deltaLink:'delta-next'}).deltaLink).toBe('delta-next')
  })
  it('clasifica revocación y token vencido',()=>{
    expect(statusAfterCalendarFailure('revoked')).toBe('revoked')
    expect(statusAfterCalendarFailure(401)).toBe('expired')
    expect(tokenNeedsRefresh('2026-07-23T11:00:00Z',Date.parse('2026-07-23T12:00:00Z'))).toBe(true)
  })
  it('conserva instancias recurrentes',()=>{
    const state=mergeIncrementalCalendarState({events:[]},{events:[event('instance','2026-07-23T10:00:00Z','series')],deletedIds:[]})
    expect(state.events[0].recurringEventId).toBe('series')
  })
  it('elimina eventos informados por sincronización incremental',()=>{
    expect(mergeIncrementalCalendarState({events:[event('deleted')]},{events:[],deletedIds:['deleted']}).events).toEqual([])
  })
  it('convierte zonas horarias de forma determinista',()=>{
    expect(isoToZonedTime('2026-07-23T13:00:00Z','America/Bogota')).toBe('08:00')
  })
  it('un fallo de red conserva el estado anterior',async()=>{
    const current:IncrementalState={events:[event('safe')],cursor:'cursor'}
    const result=await synchronizeWithoutDataLoss(current,()=>Promise.reject(new Error('offline')))
    expect(result.state).toBe(current)
    expect(result.error).toBe('offline')
  })
})
