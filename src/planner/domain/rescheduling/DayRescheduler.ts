import type { RecalculateCommand } from '../../application/commands/PlannerCommands'
import type { PlanResult, PlannedBlock } from '../entities/Planning'
import { RecalculateUseCase } from '../../application/useCases/PlannerUseCases'

export type PlanChange = {
  taskId?: string
  title: string
  type: 'moved' | 'postponed' | 'unscheduled' | 'added'
  before?: Pick<PlannedBlock,'start'|'end'>
  after?: Pick<PlannedBlock,'start'|'end'>
  reason: string
}
export type RescheduleComparison = {
  before: PlanResult
  after: PlanResult
  changes: PlanChange[]
  trigger: RecalculateCommand['trigger']
  requiresConfirmation: true
}

export class DayRescheduler {
  private readonly recalculate:RecalculateUseCase
  constructor(recalculate=new RecalculateUseCase()){this.recalculate=recalculate}
  compare(command:RecalculateCommand):RescheduleComparison {
    const after=this.recalculate.execute(command)
    const previous=new Map(command.currentPlan.blocks.filter(block=>block.taskId).map(block=>[block.taskId!,block]))
    const next=new Map(after.blocks.filter(block=>block.taskId).map(block=>[block.taskId!,block]))
    const changes:PlanChange[]=[]
    for(const [taskId,before] of previous){
      const current=next.get(taskId)
      if(!current)changes.push({taskId,title:before.title,type:'unscheduled',before,reason:`Se quedó sin espacio después de ${command.trigger}.`})
      else if(before.start!==current.start||before.end!==current.end)changes.push({taskId,title:before.title,type:'moved',before,after:current,reason:`Se movió para respetar ${command.trigger} y evitar solapamientos.`})
    }
    for(const [taskId,current] of next)if(!previous.has(taskId))changes.push({taskId,title:current.title,type:'added',after:current,reason:'Ahora cabe en la disponibilidad restante.'})
    return {before:command.currentPlan,after,changes,trigger:command.trigger,requiresConfirmation:true}
  }
}
