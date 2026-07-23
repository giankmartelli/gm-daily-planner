export function PlanRiskIndicator({risk,confidence}:{risk:number;confidence:number}){
  const level=risk>=.65?'alto':risk>=.35?'medio':'bajo'
  return <div className={`plan-risk ${level}`} aria-label={`Riesgo ${Math.round(risk*100)} por ciento, confianza ${Math.round(confidence*100)} por ciento`}><span>Riesgo {level}</span><strong>{Math.round(risk*100)}%</strong><small>{Math.round(confidence*100)}% confianza estimada</small></div>
}
