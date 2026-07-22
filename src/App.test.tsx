// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { isSupabaseConfigured } from './lib/supabase'

describe('GM Daily Planner Pro', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('crea, clasifica, completa y persiste tareas', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Nueva tarea'), { target: { value: 'Preparar lanzamiento' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'Trabajo' } })
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'alta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(screen.getByText('Preparar lanzamiento')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Completar Preparar lanzamiento' }))
    await waitFor(() => expect(Object.values(localStorage).join('')).toContain('Preparar lanzamiento'))
  })

  it('conserva una tarea al cambiar de vista y simular una recarga', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Nueva tarea'), { target: { value: 'Prueba persistencia 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    fireEvent.click(screen.getByRole('button', { name: 'Inicio' }))
    expect(screen.getByText('Prueba persistencia 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mis tareas/ }))
    expect(screen.getByText('Prueba persistencia 2')).toBeInTheDocument()
    await waitFor(() => expect(Object.values(localStorage).join('')).toContain('Prueba persistencia 2'))

    cleanup()
    render(<App />)
    expect(screen.getByText('Prueba persistencia 2')).toBeInTheDocument()
  })

  it('crea hábitos y guarda notas', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Nuevo hábito'), { target: { value: 'Leer 20 minutos' } })
    fireEvent.submit(screen.getByLabelText('Nuevo hábito').closest('form')!)
    fireEvent.change(screen.getByLabelText('Notas del día'), { target: { value: 'Gran progreso' } })
    expect(screen.getByText('Leer 20 minutos')).toBeInTheDocument()
    await waitFor(() => expect(Object.values(localStorage).join('')).toContain('Gran progreso'))
  })

  it('cambia el tema y navega entre espacios', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    fireEvent.click(screen.getByRole('button', { name: /calendario/i }))
    expect(screen.getByText('Semana')).toBeInTheDocument()
  })

  it('edita tareas y exige confirmación para eliminarlas', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Nueva tarea'), { target: { value: 'Borrador' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar Borrador' }))
    fireEvent.change(screen.getByLabelText('Editar título de tarea'), { target: { value: 'Versión final' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar edición' }))
    expect(screen.getByText('Versión final')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Versión final' }))
    expect(screen.getByText('Versión final')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación de Versión final' }))
    expect(screen.queryByText('Versión final')).not.toBeInTheDocument()
  })

  it('valida duplicados y conserva tareas ocultas durante una búsqueda', () => {
    render(<App />)
    const input = screen.getByLabelText('Nueva tarea')
    fireEvent.change(input, { target: { value: 'Alfa' } }); fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    fireEvent.change(input, { target: { value: 'Beta' } }); fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    fireEvent.change(input, { target: { value: 'Beta' } }); fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe')
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'Alfa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Completar Alfa' }))
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: '' } })
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('guarda la agenda con límites válidos', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Mis tareas/ }))
    const agenda = screen.getByLabelText('Actividad de las 09:00')
    fireEvent.change(agenda, { target: { value: 'Reunión semanal' } })
    expect(agenda).toHaveAttribute('maxlength', '160')
    await waitFor(() => expect(Object.values(localStorage).join('')).toContain('Reunión semanal'))
  })

  it('refleja de forma segura el estado de configuración de Supabase', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Conectar cuenta' }))
    const login = screen.getByRole('button', { name: 'Iniciar sesión' })
    if (isSupabaseConfigured) {
      expect(screen.getByRole('dialog')).toHaveTextContent('Accede desde cualquier dispositivo')
      expect(login).toBeEnabled()
    } else {
      expect(screen.getByRole('dialog')).toHaveTextContent('Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
      expect(login).toBeDisabled()
    }
  })
})
