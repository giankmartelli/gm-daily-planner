import type { RescheduleComparison as Comparison } from '../planner'
export function RescheduleComparison({comparison}:{comparison:Comparison}){
  return <section className="reschedule-comparison"><header><div><span>ANTES</span><strong>{comparison.before.blocks.length} bloques</strong></div><div><span>DESPUÉS</span><strong>{comparison.after.blocks.length} bloques</strong></div></header><ul>{comparison.changes.map((change,index)=><li key={`${change.taskId}:${index}`}><strong>{change.title}</strong><span>{change.before?.start??'—'} → {change.after?.start??'Sin espacio'}</span><p>{change.reason}</p></li>)}</ul></section>
}
