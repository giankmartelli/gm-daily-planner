export function PlanExplanation({items}:{items:string[]}){
  return <details className="plan-explanation"><summary>Por qué se propone este plan</summary><ul>{items.map((item,index)=><li key={`${index}:${item}`}>{item}</li>)}</ul><p>Las recomendaciones son explicables y no se aplican sin confirmación.</p></details>
}
