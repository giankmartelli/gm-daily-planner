import { Activity, AlertTriangle, BarChart3, Brain, CheckCircle2, Clock3, Download, FileText, Gauge, MoonStar, TrendingDown, TrendingUp } from 'lucide-react'
import { localPlannerRepository as repository } from '../data/plannerRepository'
import { analyticsToCsv, buildProductivityAnalytics } from '../domain/analytics'
import type { TimeSession } from '../domain/models'
import type { PlanOutcome } from '../ai-planning/domain'
import { ExecutiveDashboard } from '../core/ai/features/ExecutiveDashboard'

type Props = { selectedDate: string; sessions: TimeSession[]; userId?: string }

const minutes = (value: number) => value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}m` : `${value}m`

function downloadCsv(content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `gm-daily-planner-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ReportsCenter({ selectedDate, sessions, userId }: Props) {
  const analytics = buildProductivityAnalytics({ selectedDate, getDay: repository.getDay, sessions })
  const outcomePrefix = `gm-daily-planner:outcome:${userId ?? 'local'}:`
  const outcomes = Object.keys(localStorage).filter((key) => key.startsWith(outcomePrefix)).flatMap((key) => {
    try { return [JSON.parse(localStorage.getItem(key) ?? '') as PlanOutcome] } catch { return [] }
  })
  const history = repository.listDayKeys().filter((date) => date <= selectedDate).slice(-30).map((date) => ({ date, day: repository.getDay(date) }))
  const current = repository.getDay(selectedDate)
  const availableMinutes = Math.max(0, 480 - Object.values(current.schedule).filter((title) => title.trim()).length * 60)
  const month = analytics.points.slice(-30)
  const week = analytics.points.slice(-7)
  const kpis = [
    { label: 'Productividad hoy', value: `${analytics.today.score}%`, detail: `${analytics.weeklyAverage}% semanal`, icon: Gauge, tone: 'blue' },
    { label: 'Tiempo trabajado', value: minutes(analytics.focusedMinutes), detail: `${analytics.activeDays} días activos`, icon: Clock3, tone: 'violet' },
    { label: 'Trabajo profundo', value: minutes(analytics.deepMinutes), detail: `${minutes(analytics.shallowMinutes)} superficial`, icon: Brain, tone: 'green' },
    { label: 'Tiempo perdido', value: minutes(analytics.lostMinutes), detail: `${analytics.overdue} retrasadas hoy`, icon: AlertTriangle, tone: 'orange' },
    { label: 'Completadas', value: String(analytics.completed), detail: `${analytics.pending} pendientes hoy`, icon: CheckCircle2, tone: 'green' },
    { label: 'Promedio anual', value: `${analytics.annualAverage}%`, detail: `${analytics.monthlyAverage}% mensual`, icon: Activity, tone: 'blue' },
  ]
  return <div className="reports-center">
    <ExecutiveDashboard context={{ date: selectedDate, day: current, goals: [], sessions, outcomes, history, availableMinutes }}/>
    <section className="reports-command">
      <div><p>PRODUCTIVITY INTELLIGENCE</p><h2>Entiende tu ritmo, no solo tus resultados.</h2><span>365 días de señales convertidas en decisiones claras.</span></div>
      <div><button onClick={() => downloadCsv(analyticsToCsv(analytics))}><Download size={15}/>Exportar CSV</button><button onClick={() => window.print()}><FileText size={15}/>Guardar PDF</button></div>
    </section>
    <section className="report-kpis">{kpis.map(({ label, value, detail, icon: Icon, tone }) => <article key={label}><span className={`metric-icon ${tone}`}><Icon size={17}/></span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>)}</section>
    <div className="reports-grid reports-expanded">
      <section className="panel chart-panel">
        <div className="panel-title"><div><span className="icon-box blue"><BarChart3 size={17}/></span><div><h2>Progreso semanal</h2><p>Cumplimiento diario</p></div></div><strong>{analytics.weeklyAverage}%</strong></div>
        <div className="bars">{week.map((point) => <div key={point.date}><span><i style={{ height: `${Math.max(4, point.score)}%` }}/></span><small>{new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(new Date(`${point.date}T12:00:00`)).slice(0, 2)}</small><em>{point.score}%</em></div>)}</div>
      </section>
      <section className="panel performance-extremes">
        <div><span><TrendingUp size={18}/></span><small>MEJOR DÍA</small><strong>{analytics.bestDay.score}%</strong><p>{analytics.bestDay.date}</p></div>
        <div><span><TrendingDown size={18}/></span><small>DÍA DE MENOR RITMO</small><strong>{analytics.worstDay.score}%</strong><p>{analytics.worstDay.date}</p></div>
        <div><span><MoonStar size={18}/></span><small>PROMEDIO DIARIO</small><strong>{analytics.activeDays ? minutes(Math.round(analytics.focusedMinutes / analytics.activeDays)) : '0m'}</strong><p>tiempo de enfoque</p></div>
      </section>
      <section className="panel heat-panel">
        <div className="panel-title"><div><span className="icon-box green"><Activity size={17}/></span><div><h2>Mapa de actividad</h2><p>Últimos 30 días</p></div></div><strong>{analytics.monthlyAverage}%</strong></div>
        <div className="heatmap reports-heatmap">{month.map((point) => <i key={point.date} title={`${point.date}: ${point.score}%`} style={{ opacity: .1 + point.score / 112 }}/>)}</div>
      </section>
    </div>
  </div>
}
