import { useEffect, useMemo, useState } from 'react'
import { Award, BrainCircuit, CalendarDays, CloudSun, Gauge, Sparkles, Target, TimerReset } from 'lucide-react'
import type { DayData, Goal } from '../domain/models'

type Props = {
  date: string
  day: DayData
  goals: Goal[]
  score: number
  trackedMinutes: number
  streak: number
  weeklyScores: number[]
  monthlyScore: number
}

const quotes = [
  'Lo que proteges en tu calendario revela lo que de verdad importa.',
  'Un día claro no necesita más tareas, necesita mejores decisiones.',
  'El progreso sostenible comienza dejando espacio para pensar.',
  'Haz primero lo que mueve el día, no lo que hace más ruido.',
  'La constancia tranquila supera a la intensidad ocasional.',
  'Tu atención es un recurso: inviértela con intención.',
  'Terminar bien también significa saber cuándo descansar.',
]

function energyAt(hour: number) {
  if (hour < 10) return { label: 'Alta', value: 86, copy: 'Tu mejor ventana para trabajo profundo.' }
  if (hour < 13) return { label: 'Media', value: 64, copy: 'Buen momento para ejecutar y decidir.' }
  if (hour < 16) return { label: 'Baja', value: 38, copy: 'Reduce fricción y elige tareas ligeras.' }
  if (hour < 19) return { label: 'Alta', value: 78, copy: 'Segunda ventana de concentración.' }
  return { label: 'Media', value: 55, copy: 'Cierra ciclos y prepara mañana.' }
}

export function DashboardOverview({ date, day, goals, score, trackedMinutes, streak, weeklyScores, monthlyScore }: Props) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const selected = new Date(`${date}T12:00:00`)
  const energy = energyAt(now.getHours())
  const pending = day.tasks.filter((task) => !task.completed)
  const priority = pending.filter((task) => task.priority === 'alta')
  const blocked = pending.filter((task) => task.dependencies?.length)
  const overloadedMinutes = pending.reduce((sum, task) => sum + (task.estimatedMinutes ?? 30), 0)
  const objectiveProgress = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + Math.min(1, goal.progress / Math.max(1, goal.target)), 0) / goals.length * 100)
    : 0
  const achievement = streak >= 7 ? 'Semana imparable' : score === 100 ? 'Día perfecto' : trackedMinutes >= 120 ? 'Enfoque profundo' : 'Ritmo consciente'
  const summary = useMemo(() => {
    if (!pending.length) return 'Tu día está despejado. Protege este espacio o prepara una prioridad valiosa.'
    if (overloadedMinutes > 480) return `Detecté ${Math.round(overloadedMinutes / 60)} horas pendientes. Conviene mover tareas flexibles y proteger descansos.`
    if (blocked.length) return `${blocked.length} tarea${blocked.length > 1 ? 's dependen' : ' depende'} de trabajo previo. Resuelve esos bloqueos antes de reordenar.`
    if (priority.length) return `${priority.length} prioridad${priority.length > 1 ? 'es altas' : ' alta'} concentra el impacto del día. Empieza por la de mayor energía.`
    return 'La carga es sostenible. Agrupa tareas similares para reducir cambios de contexto.'
  }, [blocked.length, overloadedMinutes, pending.length, priority.length])

  return <section className="dashboard-overview" aria-label="Resumen inteligente del día">
    <article className="day-brief">
      <div className="day-brief-top">
        <span className="live-time">{new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(now)}</span>
        <span className="weather-placeholder" title="Integración meteorológica preparada"><CloudSun size={16}/> 22° · Parcialmente nublado</span>
      </div>
      <p className="eyebrow">{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(selected)}</p>
      <h2>{now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'}.<br/><span>Diseñemos un día que se sienta posible.</span></h2>
      <blockquote>“{quotes[selected.getDay()]}”</blockquote>
      <div className="brief-signals">
        <div><Gauge size={17}/><span>Energía</span><strong>{energy.label}</strong><i><b style={{ width: `${energy.value}%` }}/></i><small>{energy.copy}</small></div>
        <div><Target size={17}/><span>Objetivos</span><strong>{objectiveProgress}%</strong><i><b style={{ width: `${objectiveProgress}%` }}/></i><small>{goals.length ? `${goals.length} objetivos activos` : 'Define tu primer objetivo'}</small></div>
        <div><TimerReset size={17}/><span>Capacidad</span><strong>{Math.max(0, 480 - overloadedMinutes)} min</strong><i><b style={{ width: `${Math.max(4, Math.min(100, 100 - overloadedMinutes / 4.8))}%` }}/></i><small>{overloadedMinutes > 480 ? 'Día con sobrecarga' : 'Margen disponible hoy'}</small></div>
      </div>
    </article>

    <div className="overview-side">
      <article className="ai-digest">
        <header><span><BrainCircuit size={17}/></span><div><small>GM AI PLANNER</small><strong>Lectura del día</strong></div><em>LOCAL</em></header>
        <p>{summary}</p>
        <div><span>{priority.length} prioritarias</span><span>{blocked.length} bloqueadas</span><span>{pending.length} pendientes</span></div>
      </article>
      <article className="progress-window">
        <header><div><CalendarDays size={16}/><span>Ritmo de progreso</span></div><strong>{monthlyScore}% mes</strong></header>
        <div className="week-spark">{weeklyScores.map((value, index) => <i key={index} title={`${value}%`}><b style={{ height: `${Math.max(8, value)}%` }}/></i>)}</div>
        <footer><span>Últimos 7 días</span><strong>{Math.round(weeklyScores.reduce((sum, value) => sum + value, 0) / 7)}% promedio</strong></footer>
      </article>
      <article className="achievement-card">
        <span><Award size={18}/></span><div><small>LOGRO ACTUAL</small><strong>{achievement}</strong><p>{streak} días de racha · {trackedMinutes} min enfocados</p></div><Sparkles size={17}/>
      </article>
    </div>
  </section>
}
