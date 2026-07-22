import { useState, type DragEvent, type FormEvent } from 'react'
import { Bell, Check, ChevronDown, ChevronRight, Clock3, GripVertical, ListChecks, Pencil, Plus, Repeat2, Trash2, X } from 'lucide-react'
import { CATEGORIES, type Category, type EnergyLevel, type Flexibility, type PreferredPeriod, type Priority, type Recurrence, type Task } from '../domain/models'
import { LIMITS } from '../domain/validation'

type Props = { tasks: Task[]; onChange: (tasks: Task[]) => void }
const priorities: Priority[] = ['alta', 'media', 'baja']
const uid = () => crypto.randomUUID()

export function TaskPanel({ tasks, onChange }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('Trabajo')
  const [priority, setPriority] = useState<Priority>('media')
  const [recurrence, setRecurrence] = useState<Recurrence>('ninguna')
  const [tags, setTags] = useState('')
  const [reminder, setReminder] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)
  const [dueDate, setDueDate] = useState('')
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('media')
  const [flexibility, setFlexibility] = useState<Flexibility>('flexible')
  const [preferredPeriod, setPreferredPeriod] = useState<PreferredPeriod>('cualquiera')
  const [details, setDetails] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [subtask, setSubtask] = useState('')
  const [dragged, setDragged] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null)

  const add = (event: FormEvent) => {
    event.preventDefault(); const clean = title.trim(); if (!clean) return setError('Escribe un título para la tarea.')
    if (tasks.some((task) => task.title.toLocaleLowerCase() === clean.toLocaleLowerCase())) return setError('Ya existe una tarea con ese título.')
    onChange([...tasks, { id: uid(), title: clean, category, priority, recurrence, tags: tags.split(',').map((tag) => tag.trim().slice(0, LIMITS.tag)).filter(Boolean).slice(0, LIMITS.tags), reminder: reminder || undefined, completed: false, subtasks: [], estimatedMinutes, dueDate: dueDate || undefined, energyLevel, flexibility, preferredPeriod, trackedMinutes: 0, createdAt: new Date().toISOString() }])
    setTitle(''); setTags(''); setReminder(''); setDueDate(''); setEstimatedMinutes(30); setEnergyLevel('media'); setFlexibility('flexible'); setPreferredPeriod('cualquiera'); setDetails(false); setError('')
  }
  const update = (id: string, patch: Partial<Task>) => onChange(tasks.map((task) => task.id === id ? { ...task, ...patch } : task))
  const drop = (event: DragEvent, targetId: string) => {
    event.preventDefault(); if (!dragged || dragged === targetId) return
    const from = tasks.findIndex((task) => task.id === dragged), to = tasks.findIndex((task) => task.id === targetId)
    const next = [...tasks], [item] = next.splice(from, 1); next.splice(to, 0, item); onChange(next); setDragged(null)
  }
  const addSubtask = (task: Task) => {
    if (!subtask.trim() || task.subtasks.some((item) => item.title.toLocaleLowerCase() === subtask.trim().toLocaleLowerCase())) return
    update(task.id, { subtasks: [...task.subtasks, { id: uid(), title: subtask.trim(), completed: false }] }); setSubtask('')
  }
  const beginEdit = (task: Task) => { setEditing(task.id); setEditTitle(task.title); setExpanded(task.id) }
  const saveEdit = (task: Task) => {
    const clean = editTitle.trim()
    if (!clean) return setError('El título no puede quedar vacío.')
    if (tasks.some((item) => item.id !== task.id && item.title.toLocaleLowerCase() === clean.toLocaleLowerCase())) return setError('Ya existe una tarea con ese título.')
    update(task.id, { title: clean }); setEditing(null); setError('')
  }

  return <section className="task-panel panel">
    <div className="panel-title"><div><span className="icon-box blue"><ListChecks size={17}/></span><div><h2>Prioridades de hoy</h2><p>{tasks.filter((task) => task.completed).length} de {tasks.length} tareas completadas</p></div></div><span className="count-pill">{tasks.length}</span></div>
    <form className="quick-add" onSubmit={add}>
      <Plus size={18}/><label className="sr-only" htmlFor="task-title">Nueva tarea</label><input id="task-title" value={title} maxLength={LIMITS.task} onChange={(event) => { setTitle(event.target.value); if (error) setError('') }} placeholder="Añadir una tarea…" />
      <select aria-label="Categoría" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Prioridad" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>{priorities.map((item) => <option key={item}>{item}</option>)}</select>
      <button className="details-toggle" type="button" onClick={() => setDetails((value) => !value)} aria-label="Más opciones"><ChevronDown size={16}/></button><button className="add-button" type="submit">Agregar</button>
      {details && <div className="task-options"><label><Repeat2 size={14}/>Repetir<select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}><option value="ninguna">Nunca</option><option value="diaria">Diariamente</option><option value="semanal">Semanalmente</option><option value="mensual">Mensualmente</option></select></label><label><Bell size={14}/>Recordatorio<input type="time" value={reminder} onChange={(event) => { setReminder(event.target.value); if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission() }} /></label><label>Vencimiento<input aria-label="Vencimiento" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></label><label>Duración<input aria-label="Duración estimada" type="number" min="5" max="1440" step="5" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Math.min(1440, Math.max(5, Number(event.target.value) || 5)))}/></label><label>Energía<select aria-label="Energía de la tarea" value={energyLevel} onChange={(event) => setEnergyLevel(event.target.value as EnergyLevel)}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label><label>Flexibilidad<select aria-label="Flexibilidad" value={flexibility} onChange={(event) => setFlexibility(event.target.value as Flexibility)}><option value="flexible">Flexible</option><option value="fija">Fija</option></select></label><label>Periodo<select aria-label="Periodo preferido" value={preferredPeriod} onChange={(event) => setPreferredPeriod(event.target.value as PreferredPeriod)}><option value="cualquiera">Cualquiera</option><option value="mañana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select></label><label className="tags-option">Etiquetas<input maxLength={LIMITS.tag * LIMITS.tags} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="cliente, diseño" /></label></div>}
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="task-stack">
      {!tasks.length && <div className="empty-pro"><span>✓</span><h3>Tu día está despejado</h3><p>Captura lo importante y comienza con una sola tarea.</p></div>}
      {tasks.map((task) => <article key={task.id} className={`task-row priority-${task.priority} ${task.completed ? 'done' : ''}`} draggable onDragStart={() => setDragged(task.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, task.id)}>
        <GripVertical className="drag-handle" size={16}/><button className="task-check" onClick={() => update(task.id, { completed: !task.completed })} aria-label={task.completed ? `Marcar ${task.title} como pendiente` : `Completar ${task.title}`}>{task.completed && '✓'}</button>
        <button className="task-main" onClick={() => setExpanded(expanded === task.id ? null : task.id)}><strong>{task.title}</strong><span className="task-meta"><i className={`priority-dot ${task.priority}`}/>{task.category}{task.tags.map((tag) => <em key={tag}>#{tag}</em>)}{task.recurrence !== 'ninguna' && <><Repeat2 size={11}/>{task.recurrence}</>}{task.reminder && <><Bell size={11}/>{task.reminder}</>}</span></button>
        <span className="subtask-count">{task.subtasks.filter((item) => item.completed).length}/{task.subtasks.length}</span><button className="row-edit" onClick={() => beginEdit(task)} aria-label={`Editar ${task.title}`}><Pencil size={14}/></button><button className="row-expand" onClick={() => setExpanded(expanded === task.id ? null : task.id)} aria-label="Ver subtareas">{expanded === task.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button><button className={`row-delete ${deleteCandidate === task.id ? 'confirm' : ''}`} onClick={() => deleteCandidate === task.id ? onChange(tasks.filter((item) => item.id !== task.id)) : setDeleteCandidate(task.id)} onBlur={() => setDeleteCandidate(null)} aria-label={deleteCandidate === task.id ? `Confirmar eliminación de ${task.title}` : `Eliminar ${task.title}`}>{deleteCandidate === task.id ? <Check size={15}/> : <Trash2 size={15}/>}</button>
        {expanded === task.id && <div className="subtasks">{editing === task.id && <div className="edit-task"><input aria-label="Editar título de tarea" maxLength={LIMITS.task} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveEdit(task); if (event.key === 'Escape') setEditing(null) }} autoFocus/><button onClick={() => saveEdit(task)} aria-label="Guardar edición"><Check size={14}/></button><button onClick={() => setEditing(null)} aria-label="Cancelar edición"><X size={14}/></button></div>}<div className="subtask-list">{task.subtasks.map((item) => <label key={item.id}><input type="checkbox" checked={item.completed} onChange={() => update(task.id, { subtasks: task.subtasks.map((sub) => sub.id === item.id ? { ...sub, completed: !sub.completed } : sub) })}/><span>{item.title}</span></label>)}</div><div className="subtask-add"><input maxLength={LIMITS.subtask} value={subtask} onChange={(event) => setSubtask(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSubtask(task) } }} placeholder="Añadir subtarea…"/><button type="button" onClick={() => addSubtask(task)}>Añadir</button></div><div className="time-line"><Clock3 size={13}/><span>{task.trackedMinutes} min registrados</span><input aria-label={`Minutos estimados de ${task.title}`} type="number" min="5" max="1440" step="5" value={task.estimatedMinutes ?? 30} onChange={(event) => update(task.id, { estimatedMinutes: Math.min(1440, Math.max(5, Number(event.target.value) || 5)) })}/><span>min estimados</span></div></div>}
      </article>)}
    </div>
  </section>
}
