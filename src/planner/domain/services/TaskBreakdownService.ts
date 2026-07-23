import { normalizePlannerTask, type PlannerTask } from '../entities/PlannerTask'

export type TaskBreakdownProposal={taskId:string;reason:string;subtasks:PlannerTask[];requiresConfirmation:true}
export interface TaskBreakdownProvider { createBreakdown(input:{task:PlannerTask;reason?:string}):Promise<TaskBreakdownProposal> }
const phases=['Preparación','Ejecución','Revisión','Cierre']

export class DeterministicTaskBreakdownProvider implements TaskBreakdownProvider {
  async createBreakdown({task,reason}:{task:PlannerTask;reason?:string}):Promise<TaskBreakdownProposal>{
    const shouldSplit=task.estimatedMinutes>=90||task.postponementCount>=2||reason==='requested'
    if(!shouldSplit)return {taskId:task.id,reason:'La tarea ya tiene una duración manejable.',subtasks:[task],requiresConfirmation:true}
    const count=Math.min(phases.length,Math.max(2,Math.ceil(task.estimatedMinutes/45)))
    const base=Math.floor(task.estimatedMinutes/count/5)*5
    const subtasks=phases.slice(0,count).map((phase,index)=>normalizePlannerTask({...task,id:`${task.id}:breakdown:${index+1}`,parentTaskId:task.id,title:`${task.title} · ${phase}`,estimatedMinutes:index===count-1?task.estimatedMinutes-base*(count-1):base,remainingMinutes:index===count-1?task.estimatedMinutes-base*(count-1):base,dependencies:index?[`${task.id}:breakdown:${index}`]:task.dependencies,createdAutomatically:true,status:'inbox'}))
    return {taskId:task.id,reason:reason==='requested'?'División solicitada por el usuario.':'La duración o los aplazamientos aumentan el riesgo de incumplimiento.',subtasks,requiresConfirmation:true}
  }
}
