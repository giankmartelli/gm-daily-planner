// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarketingSite } from './MarketingSite'

describe('MarketingSite', () => {
  afterEach(cleanup)

  it('presenta la propuesta principal y acceso a la aplicación', () => {
    window.history.replaceState({}, '', '/')
    render(<MarketingSite/>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu día, diseñado')
    expect(screen.getAllByRole('link', { name: /Abrir aplicación/i }).length).toBeGreaterThan(0)
  })

  it('renderiza páginas legales sin afectar la aplicación', () => {
    window.history.replaceState({}, '', '/privacy')
    render(<MarketingSite/>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Política de privacidad')
    expect(screen.getByText('Cómo protegemos tus datos')).toBeInTheDocument()
  })
})
