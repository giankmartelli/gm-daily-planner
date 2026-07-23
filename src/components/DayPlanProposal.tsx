import type { PlannedBlock, SmartPlan } from '../domain/smartPlanner'
export function DayPlanProposal({proposal,onRemove}:{proposal:SmartPlan;onRemove:(taskId:string)=>void}){
  return <section className="day-plan-proposal">{proposal.blocks.map((block:PlannedBlock)=><article key={block.taskId}><time>{block.startTime}–{block.endTime}</time><div><strong>{block.title}</strong><p>{block.reason}</p></div><button onClick={()=>onRemove(block.taskId)} aria-label={`Eliminar ${block.title}`}>×</button></article>)}</section>
}
