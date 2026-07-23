import { Activity, Brain, Gauge, Repeat2, Sparkles, Timer, TrendingUp, Zap } from 'lucide-react'
import type { EngineContext } from '../models'
import { BuildDailyIntelligence } from '../usecases/BuildDailyIntelligence'

type Props = { context: EngineContext }
const intelligence = new BuildDailyIntelligence()

export function ExecutiveDashboard({ context }: Props) {
  const { analytics, prediction, brief } = intelligence.execute(context)
  const widgets = [
    { label: "Today's Score", value: `${analytics.todayScore}%`, detail: brief.riskLevel === 'alto' ? 'Requiere simplificar' : 'Carga controlada', icon: Gauge },
    { label: 'Weekly Score', value: `${analytics.weeklyScore}%`, detail: `${analytics.consistency}% consistencia`, icon: TrendingUp },
    { label: 'Focus Time', value: `${Math.floor(analytics.focusMinutes / 60)}h ${analytics.focusMinutes % 60}m`, detail: `${analytics.deepWorkMinutes} min profundos`, icon: Timer },
    { label: 'Completion Rate', value: `${analytics.completionRate}%`, detail: `${prediction.probability}% probable hoy`, icon: Activity },
    { label: 'Energy Distribution', value: `${analytics.energyDistribution.alta} min`, detail: 'carga de energía alta', icon: Zap },
    { label: 'Interruptions', value: String(analytics.interruptions), detail: 'cambios de contexto estimados', icon: Repeat2 },
    { label: 'Prediction Accuracy', value: analytics.predictionAccuracy === undefined ? 'Sin muestra' : `${analytics.predictionAccuracy}%`, detail: 'revisiones confirmadas', icon: Brain },
    { label: 'Learning Progress', value: `${analytics.learningProgress}%`, detail: `${context.outcomes.length} revisiones`, icon: Sparkles },
  ]
  return <section className="executive-os" aria-labelledby="executive-title">
    <header><div><p>GM AI OS · EXECUTIVE INTELLIGENCE</p><h2 id="executive-title">Señales para decidir mejor.</h2><span>{brief.recommendation}</span></div><strong>{prediction.probability}%<small> probabilidad estimada</small></strong></header>
    <div className="executive-widgets">{widgets.map(({ label, value, detail, icon: Icon }) => <article key={label}><Icon size={16}/><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>)}</div>
    <div className="trend-line" aria-label={`Tendencia: ${analytics.productivityTrend.join(', ')} por ciento`}>{analytics.productivityTrend.map((value, index) => <i key={index} style={{ height: `${Math.max(6, value)}%` }}/>)}</div>
    <footer><span>Fuentes no conectadas: {brief.missingSources.join(', ')}</span><em>Estimaciones basadas únicamente en datos registrados.</em></footer>
  </section>
}
