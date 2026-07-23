import { BarChart3, CalendarDays, Focus, Home, ListTodo, Moon, Plus, Search, Sun, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ViewMode } from '../domain/models'

type Props = {
  open: boolean
  onClose: () => void
  onNavigate: (view: ViewMode) => void
  onNewTask: () => void
  onToggleTheme: () => void
}

export function CommandPalette({ open, onClose, onNavigate, onNewTask, onToggleTheme }: Props) {
  const [query, setQuery] = useState('')
  const commands = useMemo(() => [
    { label: 'Crear una tarea', hint: 'N', icon: Plus, action: onNewTask },
    { label: 'Ir a Inicio', hint: 'G I', icon: Home, action: () => onNavigate('dashboard') },
    { label: 'Ir a Mis tareas', hint: 'G T', icon: ListTodo, action: () => onNavigate('tasks') },
    { label: 'Abrir Calendario', hint: 'G C', icon: CalendarDays, action: () => onNavigate('calendar') },
    { label: 'Entrar en Enfoque', hint: 'G F', icon: Focus, action: () => onNavigate('focus') },
    { label: 'Ver Informes', hint: 'G R', icon: BarChart3, action: () => onNavigate('reports') },
    { label: 'Cambiar apariencia', hint: 'T', icon: document.documentElement.dataset.theme === 'dark' ? Sun : Moon, action: onToggleTheme },
  ], [onNavigate, onNewTask, onToggleTheme])
  const filtered = commands.filter((command) => command.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  if (!open) return null
  const run = (action: () => void) => { action(); setQuery(''); onClose() }
  return <div className="command-shade" onMouseDown={onClose}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Comandos rápidos" onMouseDown={(event) => event.stopPropagation()}>
      <header><Search size={17}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribe un comando…" aria-label="Buscar comando"/><button onClick={onClose} aria-label="Cerrar comandos"><X size={15}/></button></header>
      <div>{filtered.map(({ label, hint, icon: Icon, action }) => <button key={label} onClick={() => run(action)}><span><Icon size={16}/>{label}</span><kbd>{hint}</kbd></button>)}{!filtered.length && <p>No encontramos ese comando.</p>}</div>
      <footer><span><kbd>↑↓</kbd> navegar</span><span><kbd>↵</kbd> ejecutar</span><span><kbd>esc</kbd> cerrar</span></footer>
    </section>
  </div>
}
