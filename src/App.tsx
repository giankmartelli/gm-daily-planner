import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import './product.css'
import type { User } from '@supabase/supabase-js'
import { BarChart3, Bell, CalendarDays, CheckCircle2, ChevronRight, Clock3, Cloud, CloudOff, Download, Focus, Goal as GoalIcon, Home, ListTodo, LogOut, Menu, Moon, Plus, Search, Settings, Sun, Target, TrendingUp, X, Zap } from 'lucide-react'
import { AuthDialog } from './components/AuthDialog'
import { CalendarPanel } from './components/CalendarPanel'
import { ProductivityTimer } from './components/ProductivityTimer'
import { SmartPlannerPanel } from './components/SmartPlannerPanel'
import { TaskPanel } from './components/TaskPanel'
import { localPlannerRepository as repository } from './data/plannerRepository'
import { colors } from './design/tokens'
import { HOURS, todayKey, type DayData, type Goal, type Task, type ViewMode, type WorkspaceData } from './domain/models'
import { applySmartPlan, type PlannedBlock } from './domain/smartPlanner'
import { LIMITS } from './domain/validation'
import { isSupabaseConfigured, supabase, supabaseConfigurationMessage } from './lib/supabase'
import { reportError } from './lib/monitoring'
import { syncService, type SyncState } from './services/syncService'

type Theme = 'light' | 'dark'
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const uid = () => crypto.randomUUID()

function dueOn(task: Task, origin: string, target: string) {
  const start = new Date(`${origin}T12:00:00`), end = new Date(`${target}T12:00:00`)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000)
  if (days <= 0) return false
  if (task.recurrence === 'diaria') return true
  if (task.recurrence === 'semanal') return days % 7 === 0
  return task.recurrence === 'mensual' && start.getDate() === end.getDate()
}

function loadDayWithRecurrence(date: string): DayData {
  const current = repository.getDay(date)
  const recurring: Task[] = []
  repository.listDayKeys().filter((key) => key < date).forEach((origin) => repository.getDay(origin).tasks.filter((task) => !task.id.includes(':') && dueOn(task, origin, date)).forEach((task) => {
    const id = `${task.id}:${date}`
    if (!current.tasks.some((item) => item.id === id)) recurring.push({ ...task, id, completed: false, subtasks: task.subtasks.map((sub) => ({ ...sub, completed: false })), trackedMinutes: 0 })
  }))
  return recurring.length ? { ...current, tasks: [...current.tasks, ...recurring] } : current
}

function App() {
  const [view, setView] = useState<ViewMode>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [day, setDay] = useState<DayData>(() => loadDayWithRecurrence(todayKey()))
  const [workspace, setWorkspace] = useState<WorkspaceData>(repository.getWorkspace)
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('gm-daily-planner:theme') === 'dark' ? 'dark' : 'light')
  const [search, setSearch] = useState('')
  const [newHabit, setNewHabit] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
  const [installHelp, setInstallHelp] = useState(false)
  const [message, setMessage] = useState(() => supabaseConfigurationMessage)
  const [user, setUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>('local')
  const [syncReady, setSyncReady] = useState(false)
  const selectedDateRef = useRef(selectedDate)
  const connectionVersionRef = useRef(0)
  const markSyncSuccess = () => setSyncState((current) => current === 'error' ? 'error' : 'synced')

  useEffect(() => { selectedDateRef.current = selectedDate }, [selectedDate])
  useEffect(() => { const result = repository.saveDay(selectedDate, day); if (!result.ok) { const timer = window.setTimeout(() => setMessage(result.message), 0); return () => window.clearTimeout(timer) } }, [day, selectedDate])
  useEffect(() => { const result = repository.saveWorkspace(workspace); if (!result.ok) { const timer = window.setTimeout(() => setMessage(result.message), 0); return () => window.clearTimeout(timer) } }, [workspace])
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('gm-daily-planner:theme', theme); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? colors.neutral[950] : colors.neutral[50]) }, [theme])
  useEffect(() => { const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt) }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler) }, [])
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('.search input')?.focus() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])
  useEffect(() => {
    if (!supabase) return
    let active = true
    const connect = async (nextUser: User | null) => {
      const connectionVersion = ++connectionVersionRef.current
      if (!active) return
      repository.setScope(nextUser?.id ?? null)
      setUser(nextUser); setSyncReady(false)
      if (!nextUser) {
        syncService.unsubscribe(); setSyncState('local')
        setDay(loadDayWithRecurrence(selectedDateRef.current)); setWorkspace(repository.getWorkspace())
        return
      }
      setSyncState('syncing')
      try {
        await syncService.synchronize(nextUser)
        if (!active || connectionVersion !== connectionVersionRef.current) return
        setDay(loadDayWithRecurrence(selectedDateRef.current)); setWorkspace(repository.getWorkspace()); setSyncState('synced'); setSyncReady(true)
        syncService.subscribe(nextUser, () => {
          void syncService.synchronize(nextUser).then(() => {
            if (active && connectionVersion === connectionVersionRef.current) { setDay(loadDayWithRecurrence(selectedDateRef.current)); setWorkspace(repository.getWorkspace()); markSyncSuccess() }
          }).catch((error) => {
            reportError(error, { operation: 'realtime_sync' })
            if (active && connectionVersion === connectionVersionRef.current) { setSyncState('error'); setMessage('No pudimos actualizar desde la nube. Tus cambios locales permanecen guardados.') }
          })
        })
      } catch (error) { reportError(error, { operation: 'connect_sync' }); if (active) { setSyncState('error'); setMessage('No pudimos sincronizar. Tus cambios siguen seguros en este dispositivo.') } }
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void connect(session?.user ?? null) })
    return () => { active = false; listener.subscription.unsubscribe(); syncService.unsubscribe() }
  }, [])
  useEffect(() => { if (!user || !syncReady) return; const timer = window.setTimeout(() => { setSyncState('syncing'); void syncService.pushDay(user.id, selectedDate).then(markSyncSuccess).catch((error) => { reportError(error, { operation: 'push_day' }); setSyncState('error'); setMessage(`No pudimos guardar los cambios en la nube. La tarea permanece en este dispositivo. ${error instanceof Error ? error.message : ''}`) }) }, 700); return () => window.clearTimeout(timer) }, [day, selectedDate, syncReady, user])
  useEffect(() => { if (!user || !syncReady) return; const timer = window.setTimeout(() => { setSyncState('syncing'); void syncService.pushWorkspace(user.id).then(markSyncSuccess).catch((error) => { reportError(error, { operation: 'push_workspace' }); setSyncState('error'); setMessage(`No pudimos guardar los datos generales en la nube. Permanecen en este dispositivo. ${error instanceof Error ? error.message : ''}`) }) }, 700); return () => window.clearTimeout(timer) }, [syncReady, user, workspace])
  useEffect(() => {
    const checkReminders = () => {
      if (selectedDate !== todayKey() || !('Notification' in window) || Notification.permission !== 'granted') return
      const now = new Date(), time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      day.tasks.filter((task) => !task.completed && task.reminder === time).forEach((task) => {
        const key = `gm-reminder:${selectedDate}:${task.id}:${time}`
        if (sessionStorage.getItem(key)) return
        new Notification('GM Daily Planner', { body: task.title, icon: '/icons/icon-192.png', tag: task.id })
        sessionStorage.setItem(key, '1')
      })
    }
    checkReminders(); const interval = window.setInterval(checkReminders, 30000)
    return () => window.clearInterval(interval)
  }, [day.tasks, selectedDate])

  const selectDate = (date: string) => { setSelectedDate(date); setDay(loadDayWithRecurrence(date)) }
  const completed = day.tasks.filter((task) => task.completed).length
  const habitDone = day.habits.filter((habit) => habit.completed).length
  const total = day.tasks.length + day.habits.length
  const score = total ? Math.round(((completed + habitDone) / total) * 100) : 0
  const tracked = workspace.sessions.filter((session) => session.date === selectedDate).reduce((sum, session) => sum + session.minutes, 0) + day.tasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
  const activeKeys = repository.listDayKeys()
  const streak = useMemo(() => { let count = 0; const date = new Date(); for (let i = 0; i < 366; i += 1) { const key = new Intl.DateTimeFormat('sv-SE').format(date); const data = key === selectedDate ? day : repository.getDay(key); if (!data.tasks.length || !data.tasks.every((task) => task.completed)) break; count += 1; date.setDate(date.getDate() - 1) } return count }, [day, selectedDate])
  const visibleTasks = search ? day.tasks.filter((task) => `${task.title} ${task.category} ${task.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())) : day.tasks
  const setTasks = (tasks: Task[]) => setDay((data) => {
    const next = { ...data, tasks }
    const result = repository.saveDay(selectedDate, next)
    if (!result.ok) setMessage(result.message)
    return next
  })
  const updateVisibleTasks = (tasks: Task[]) => {
    if (!search) return setTasks(tasks)
    const visibleIds = new Set(visibleTasks.map((task) => task.id))
    const retained = day.tasks.filter((task) => !visibleIds.has(task.id))
    setTasks([...retained, ...tasks])
  }
  const addSession = useCallback((minutes: number) => setWorkspace((data) => ({ ...data, sessions: [...data.sessions, { id: uid(), minutes, date: selectedDate }] })), [selectedDate])
  const applyPlan = (blocks: PlannedBlock[]) => {
    setDay((data) => ({ ...data, schedule: applySmartPlan(data.schedule, blocks) }))
    setMessage(`${blocks.length} bloque(s) añadidos a tu agenda. Guardando cambios…`)
  }

  const install = async () => { if (!installPrompt) return setInstallHelp(true); await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null) }
  const addHabit = (event: FormEvent) => { event.preventDefault(); const name = newHabit.trim(); if (!name) return setMessage('Escribe un nombre para el hábito.'); if (day.habits.some((habit) => habit.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return setMessage('Ese hábito ya existe.'); setDay((data) => ({ ...data, habits: [...data.habits, { id: uid(), name, completed: false }] })); setNewHabit(''); setMessage('Hábito creado.') }
  const addGoal = (event: FormEvent) => { event.preventDefault(); const title = newGoal.trim(); if (!title) return setMessage('Escribe un objetivo.'); if (workspace.goals.some((goal) => goal.title.toLocaleLowerCase() === title.toLocaleLowerCase())) return setMessage('Ese objetivo ya existe.'); const goal: Goal = { id: uid(), title, progress: 0, target: 10, unit: 'sesiones' }; setWorkspace((data) => ({ ...data, goals: [...data.goals, goal] })); setNewGoal(''); setMessage('Objetivo creado.') }

  const nav = [
    { id: 'dashboard' as const, label: 'Inicio', icon: Home }, { id: 'tasks' as const, label: 'Mis tareas', icon: ListTodo },
    { id: 'calendar' as const, label: 'Calendario', icon: CalendarDays }, { id: 'focus' as const, label: 'Enfoque', icon: Focus }, { id: 'reports' as const, label: 'Informes', icon: BarChart3 },
  ]
  const formatted = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`))

  return <div className="product-shell">
    <div className={`mobile-shade ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="logo"><img src="/brand/logo-mark.svg" alt=""/><div><strong>GM</strong><span>Daily Planner</span></div><button onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X size={18}/></button></div>
      <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setSidebarOpen(false) }}><Icon size={17}/><span>{label}</span>{id === 'tasks' && <em>{day.tasks.filter((task) => !task.completed).length}</em>}</button>)}</nav>
      <div className="sidebar-section"><p>ESPACIOS</p><button><span className="space-dot work"/>Trabajo</button><button><span className="space-dot personal"/>Personal</button><button><span className="space-dot study"/>Estudio</button></div>
      <div className="sidebar-footer"><button onClick={install}><Download size={16}/>Instalar aplicación</button><button onClick={() => setMessage('La configuración avanzada estará disponible próximamente.')}><Settings size={16}/>Configuración</button><button className="profile" onClick={() => user ? void supabase?.auth.signOut().then(({ error }) => { if (error) setMessage(`No se pudo cerrar la sesión: ${error.message}`) }) : setAuthOpen(true)}><span>{user ? user.email?.slice(0, 2).toUpperCase() : 'GM'}</span><div><strong>{user ? user.email : 'Mi espacio'}</strong><small>{user ? (syncState === 'synced' ? 'Sincronizado' : syncState === 'syncing' ? 'Sincronizando…' : 'Sin conexión') : isSupabaseConfigured ? 'Conectar nube' : 'Modo local'}</small></div>{user ? <LogOut size={15}/> : <ChevronRight size={15}/>}</button></div>
    </aside>

    <main className="workspace">
      <header className="app-header"><button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="search"><Search size={16}/><input value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tareas, etiquetas…" aria-label="Buscar"/><kbd>⌘ K</kbd></div><div className="header-actions"><span className={`sync-indicator ${syncState}`} title={syncState === 'synced' ? 'Sincronizado' : syncState === 'syncing' ? 'Sincronizando' : 'Datos locales'}>{syncState === 'error' ? <CloudOff size={15}/> : <Cloud size={15}/>}</span><button onClick={() => setMessage('Los recordatorios activos aparecerán como notificaciones del sistema.')} aria-label="Notificaciones"><Bell size={18}/><i/></button><button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button><button className="avatar" onClick={() => user ? setMessage(`Sesión activa: ${user.email ?? 'usuario autenticado'}`) : setAuthOpen(true)} aria-label={user ? 'Cuenta sincronizada' : 'Conectar cuenta'}>{user ? user.email?.slice(0, 2).toUpperCase() : 'GM'}</button></div></header>

      <div className="content">
        <div className="page-heading"><div><p>{formatted.toUpperCase()}</p><h1>{view === 'dashboard' ? 'Buenos días, construyamos un gran día.' : nav.find((item) => item.id === view)?.label}</h1><span>{view === 'dashboard' ? 'Claridad, enfoque y progreso en un solo lugar.' : 'Todo organizado para que avances sin fricción.'}</span></div><button className="new-task" onClick={() => { setView('tasks'); setTimeout(() => document.getElementById('task-title')?.focus(), 0) }}><Plus size={16}/>Nueva tarea</button></div>

        {view === 'dashboard' && <>
          <SmartPlannerPanel tasks={day.tasks} schedule={day.schedule} date={selectedDate} onApply={applyPlan}/>
          <section className="metric-grid"><article><span className="metric-icon blue"><CheckCircle2/></span><div><p>Completadas</p><strong>{completed}<small> / {day.tasks.length}</small></strong><em>tareas de hoy</em></div></article><article><span className="metric-icon violet"><TrendingUp/></span><div><p>Productividad</p><strong>{score}%</strong><em>{score >= 70 ? 'Excelente ritmo' : 'Listo para avanzar'}</em></div></article><article><span className="metric-icon orange"><Zap/></span><div><p>Racha actual</p><strong>{streak}<small> días</small></strong><em>La constancia suma</em></div></article><article><span className="metric-icon green"><Clock3/></span><div><p>Tiempo enfocado</p><strong>{Math.floor(tracked / 60)}<small>h</small> {tracked % 60}<small>m</small></strong><em>registrado hoy</em></div></article></section>
          <div className="dashboard-grid"><TaskPanel tasks={visibleTasks} onChange={updateVisibleTasks}/><div className="right-rail"><ProductivityTimer onComplete={addSession}/><GoalPanel goals={workspace.goals} onChange={(goals) => setWorkspace((data) => ({ ...data, goals }))} onAdd={addGoal} value={newGoal} setValue={setNewGoal}/></div></div>
          <div className="dashboard-bottom"><HabitsPanel day={day} setDay={setDay} value={newHabit} setValue={setNewHabit} onAdd={addHabit}/><SummaryPanel day={day} setDay={setDay} score={score} tracked={tracked}/></div>
        </>}
        {view === 'tasks' && <div className="single-column"><TaskPanel tasks={visibleTasks} onChange={updateVisibleTasks}/><SchedulePanel day={day} setDay={setDay}/></div>}
        {view === 'calendar' && <div className="calendar-layout"><CalendarPanel selected={selectedDate} activeKeys={activeKeys} onSelect={selectDate}/><SchedulePanel day={day} setDay={setDay}/></div>}
        {view === 'focus' && <div className="focus-layout"><ProductivityTimer onComplete={addSession}/><GoalPanel goals={workspace.goals} onChange={(goals) => setWorkspace((data) => ({ ...data, goals }))} onAdd={addGoal} value={newGoal} setValue={setNewGoal}/><SummaryPanel day={day} setDay={setDay} score={score} tracked={tracked}/></div>}
        {view === 'reports' && <Reports selectedDate={selectedDate}/>} 
      </div>
    </main>
    {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Cerrar mensaje"><X size={14}/></button></div>}
    {installHelp && <div className="modal-shade" onMouseDown={() => setInstallHelp(false)}><section className="install-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button onClick={() => setInstallHelp(false)} aria-label="Cerrar"><X/></button><img src="/icons/icon-192.png" alt="GM Daily Planner"/><h2>Instala GM Daily Planner</h2><p>En iPhone usa Compartir → Agregar a inicio. En Mac, Windows o Android abre el menú del navegador y selecciona Instalar.</p><button className="primary" onClick={() => setInstallHelp(false)}>Entendido</button></section></div>}
    <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)}/>
  </div>
}

function HabitsPanel({ day, setDay, value, setValue, onAdd }: { day: DayData; setDay: React.Dispatch<React.SetStateAction<DayData>>; value: string; setValue: (value: string) => void; onAdd: (event: FormEvent) => void }) {
  return <section className="panel habits-pro"><div className="panel-title"><div><span className="icon-box green"><Target size={17}/></span><div><h2>Hábitos</h2><p>Pequeñas acciones, grandes resultados</p></div></div><strong>{day.habits.filter((h) => h.completed).length}/{day.habits.length}</strong></div><form onSubmit={onAdd}><input aria-label="Nuevo hábito" maxLength={LIMITS.habit} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Crear un hábito…"/><button aria-label="Agregar hábito"><Plus size={15}/></button></form><div className="habit-pro-list">{day.habits.map((habit) => <label key={habit.id}><input type="checkbox" checked={habit.completed} onChange={() => setDay((data) => ({ ...data, habits: data.habits.map((item) => item.id === habit.id ? { ...item, completed: !item.completed } : item) }))}/><span>{habit.completed && '✓'}</span><strong>{habit.name}</strong></label>)}{!day.habits.length && <p>Añade el primer hábito que quieras consolidar.</p>}</div></section>
}

function GoalPanel({ goals, onChange, onAdd, value, setValue }: { goals: Goal[]; onChange: (goals: Goal[]) => void; onAdd: (event: FormEvent) => void; value: string; setValue: (value: string) => void }) {
  return <section className="panel goals-panel"><div className="panel-title"><div><span className="icon-box orange"><GoalIcon size={17}/></span><div><h2>Objetivos</h2><p>Resultados que importan</p></div></div></div><form onSubmit={onAdd}><input aria-label="Nuevo objetivo" maxLength={LIMITS.goal} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nuevo objetivo…"/><button aria-label="Agregar objetivo"><Plus size={15}/></button></form>{goals.map((goal) => <div className="goal-row" key={goal.id}><div><strong>{goal.title}</strong><span>{goal.progress} / {goal.target} {goal.unit}</span></div><div className="goal-bar"><i style={{ width: `${Math.min(100, goal.progress / goal.target * 100)}%` }}/></div><button onClick={() => onChange(goals.map((item) => item.id === goal.id ? { ...item, progress: Math.min(item.target, item.progress + 1) } : item))}>+1</button></div>)}{!goals.length && <p className="panel-empty">Crea un objetivo medible para esta semana.</p>}</section>
}

function SchedulePanel({ day, setDay }: { day: DayData; setDay: React.Dispatch<React.SetStateAction<DayData>> }) {
  const times = [...new Set([...HOURS, ...Object.keys(day.schedule)])].sort()
  return <section className="panel schedule-pro"><div className="panel-title"><div><span className="icon-box blue"><Clock3 size={17}/></span><div><h2>Agenda</h2><p>Bloques de tiempo editables</p></div></div></div><div>{times.map((hour) => <label key={hour}><time>{hour}</time><i/><input aria-label={`Actividad de las ${hour}`} maxLength={LIMITS.schedule} value={day.schedule[hour] ?? ''} onChange={(e) => setDay((data) => ({ ...data, schedule: { ...data.schedule, [hour]: e.target.value } }))} placeholder="Añadir bloque…"/></label>)}</div></section>
}

function SummaryPanel({ day, setDay, score, tracked }: { day: DayData; setDay: React.Dispatch<React.SetStateAction<DayData>>; score: number; tracked: number }) {
  return <section className="panel summary-panel"><div className="panel-title"><div><span className="icon-box violet"><BarChart3 size={17}/></span><div><h2>Resumen del día</h2><p>Tu progreso de un vistazo</p></div></div></div><div className="summary-ring" style={{ '--score': `${score * 3.6}deg` } as React.CSSProperties}><span><strong>{score}%</strong>cumplido</span></div><div className="summary-lines"><p><span>Tareas pendientes</span><strong>{day.tasks.filter((task) => !task.completed).length}</strong></p><p><span>Minutos de enfoque</span><strong>{tracked}</strong></p><p><span>Subtareas completadas</span><strong>{day.tasks.flatMap((task) => task.subtasks).filter((item) => item.completed).length}</strong></p></div><textarea aria-label="Notas del día" maxLength={LIMITS.note} value={day.notes} onChange={(event) => setDay((data) => ({ ...data, notes: event.target.value }))} placeholder="Notas y reflexiones del día…"/></section>
}

function Reports({ selectedDate }: { selectedDate: string }) {
  const days = Array.from({ length: 30 }, (_, index) => { const date = new Date(`${selectedDate}T12:00:00`); date.setDate(date.getDate() - (29 - index)); const key = new Intl.DateTimeFormat('sv-SE').format(date); const data = repository.getDay(key); const total = data.tasks.length + data.habits.length; return { key, score: total ? Math.round((data.tasks.filter((t) => t.completed).length + data.habits.filter((h) => h.completed).length) / total * 100) : 0 } })
  const weekly = days.slice(-7), average = Math.round(days.reduce((sum, item) => sum + item.score, 0) / days.length)
  return <div className="reports-grid"><section className="panel report-hero"><div><p>PROMEDIO MENSUAL</p><strong>{average}%</strong><span>Tu consistencia durante los últimos 30 días</span></div><TrendingUp size={50}/></section><section className="panel chart-panel"><div className="panel-title"><div><span className="icon-box blue"><BarChart3 size={17}/></span><div><h2>Resumen semanal</h2><p>Porcentaje de cumplimiento por día</p></div></div></div><div className="bars">{weekly.map((item) => <div key={item.key}><span><i style={{ height: `${Math.max(4, item.score)}%` }}/></span><small>{new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(new Date(`${item.key}T12:00:00`)).slice(0, 2)}</small><em>{item.score}%</em></div>)}</div></section><section className="panel heat-panel"><div className="panel-title"><div><span className="icon-box green"><Zap size={17}/></span><div><h2>Actividad mensual</h2><p>Últimos 30 días</p></div></div></div><div className="heatmap">{days.map((item) => <i key={item.key} title={`${item.key}: ${item.score}%`} style={{ opacity: .12 + item.score / 115 }}/>)}</div></section></div>
}

export default App
