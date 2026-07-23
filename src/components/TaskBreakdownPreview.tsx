import type { TaskBreakdownProposal } from '../planner'
export function TaskBreakdownPreview({proposal,onApply,onDiscard}:{proposal:TaskBreakdownProposal;onApply:()=>void;onDiscard:()=>void}){
  return <section className="task-breakdown-preview"><p>PROPUESTA DE DESGLOSE</p><h3>{proposal.reason}</h3><ol>{proposal.subtasks.map(task=><li key={task.id}><strong>{task.title}</strong><span>{task.estimatedMinutes} min</span></li>)}</ol><footer><button onClick={onDiscard}>Descartar</button><button onClick={onApply}>Aplicar desglose</button></footer></section>
}
