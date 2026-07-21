import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, TimerReset } from 'lucide-react'

type Mode = 'pomodoro' | 'temporizador' | 'cronometro'
type Props = { onComplete: (minutes: number) => void }

const pad = (value: number) => String(value).padStart(2, '0')

export function ProductivityTimer({ onComplete }: Props) {
  const [mode, setMode] = useState<Mode>('pomodoro')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const startedAt = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setSeconds((value) => {
      if (mode === 'cronometro') return value + 1
      if (value <= 1) { setRunning(false); onComplete(Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))); return 0 }
      return value - 1
    }), 1000)
    return () => window.clearInterval(id)
  }, [mode, onComplete, running])

  const reset = (nextMode = mode) => {
    setRunning(false)
    setSeconds(nextMode === 'pomodoro' ? 25 * 60 : nextMode === 'temporizador' ? 10 * 60 : 0)
  }
  const changeMode = (next: Mode) => { setMode(next); reset(next) }
  const toggle = () => { if (!running) startedAt.current = Date.now(); setRunning((value) => !value) }

  return <section className="timer-card panel">
    <div className="panel-title"><div><span className="icon-box purple"><TimerReset size={17} /></span><div><h2>Centro de enfoque</h2><p>Protege tu tiempo más valioso</p></div></div></div>
    <div className="timer-tabs">{(['pomodoro','temporizador','cronometro'] as Mode[]).map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => changeMode(item)}>{item === 'cronometro' ? 'Cronómetro' : item[0].toUpperCase() + item.slice(1)}</button>)}</div>
    <div className="timer-display" aria-live="polite">{pad(Math.floor(seconds / 60))}<span>:</span>{pad(seconds % 60)}</div>
    <div className="timer-controls"><button className="timer-primary" onClick={toggle}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? 'Pausar' : 'Comenzar'}</button><button onClick={() => reset()} aria-label="Reiniciar"><RotateCcw size={16} /></button></div>
  </section>
}
