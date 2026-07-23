import { describe, expect, it } from 'vitest'
import { calculateTaskScore, DayRescheduler, defaultPlanningProfile, DeterministicTaskBreakdownProvider, planner } from '.'
import { normalizePlannerTask } from './domain/entities/PlannerTask'
import { toMinutes } from './domain/valueObjects/Time'

const task=(id:string,extra={})=>normalizePlannerTask({id,title:`Tarea ${id}`,...extra})
const profile=defaultPlanningProfile('America/Bogota')

describe('Planner Engine core V2',()=>{
  it('mantiene valores predeterminados para tareas antiguas',()=>{
    expect(task('legacy')).toMatchObject({priority:'media',estimatedMinutes:30,remainingMinutes:30,energyLevel:'media',focusLevel:'medio',flexibility:'flexible',status:'inbox',source:'local'})
  })
  it('eleva una tarea vencida y explica el motivo',()=>{
    const context={now:'09:00',date:'2026-07-23',availableMinutes:120,completedTaskIds:new Set<string>(),currentEnergy:'media' as const,currentPeriod:'morning' as const}
    const overdue=calculateTaskScore(task('late',{dueAt:'2026-07-22'}),context)
    const normal=calculateTaskScore(task('normal'),context)
    expect(overdue.totalScore).toBeGreaterThan(normal.totalScore)
    expect(overdue.explanations.join(' ')).toContain('vencida')
  })
  it('un evento externo bloquea tiempo sin convertirse en tarea',()=>{
    const result=planner.planDay({date:'2026-07-23',tasks:[task('one',{remainingMinutes:60})],events:[{id:'google:event',title:'Reunión',start:'08:00',end:'10:00',locked:true,kind:'event'}],profile})
    const planned=result.blocks.find(block=>block.taskId==='one')!
    expect(toMinutes(planned.start)).toBeGreaterThanOrEqual(toMinutes('10:00'))
    expect(result.blocks.find(block=>block.id==='google:event')?.taskId).toBeUndefined()
  })
  it('no crea solapamientos y devuelve capacidad real',()=>{
    const result=planner.planDay({date:'2026-07-23',tasks:[task('a',{remainingMinutes:90}),task('b',{remainingMinutes:90})],events:[],profile})
    const sorted=result.blocks.slice().sort((a,b)=>a.start.localeCompare(b.start))
    for(let index=1;index<sorted.length;index+=1)expect(toMinutes(sorted[index].start)).toBeGreaterThanOrEqual(toMinutes(sorted[index-1].end))
    expect(result.totalAvailableMinutes).toBeGreaterThan(result.totalPlannedMinutes)
    expect(result.proposalId).toBeTruthy()
  })
  it('una reunión nueva produce comparación y no aplica automáticamente',()=>{
    const current=planner.planDay({date:'2026-07-23',tasks:[task('a',{remainingMinutes:60})],events:[],profile})
    const comparison=new DayRescheduler().compare({date:'2026-07-23',tasks:[task('a',{remainingMinutes:60})],events:[{id:'new-meeting',title:'Reunión nueva',start:'08:00',end:'10:00',locked:true,kind:'event'}],profile,currentPlan:current,trigger:'event-created',at:'08:00'})
    expect(comparison.requiresConfirmation).toBe(true)
    expect(comparison.before).toBe(current)
    expect(comparison.after.blocks.some(block=>block.id==='new-meeting')).toBe(true)
  })
  it('divide una tarea grande en una propuesta confirmable',async()=>{
    const proposal=await new DeterministicTaskBreakdownProvider().createBreakdown({task:task('large',{estimatedMinutes:180,remainingMinutes:180})})
    expect(proposal.requiresConfirmation).toBe(true)
    expect(proposal.subtasks.length).toBe(4)
    expect(proposal.subtasks.reduce((sum,item)=>sum+item.estimatedMinutes,0)).toBe(180)
  })
  it('planifica 500 tareas sin perder estabilidad',()=>{
    const tasks=Array.from({length:500},(_,index)=>task(String(index),{remainingMinutes:5,estimatedMinutes:5}))
    const started=Date.now()
    const result=planner.planDay({date:'2026-07-23',tasks,events:[],profile})
    expect(result.blocks.length+result.unscheduledTasks.length).toBeGreaterThanOrEqual(500)
    expect(Date.now()-started).toBeLessThan(1000)
  })
})
