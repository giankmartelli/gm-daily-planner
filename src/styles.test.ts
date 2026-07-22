import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('pipeline de estilos', () => {
  it('configura Tailwind y PostCSS para todos los componentes', () => {
    const tailwind = readFileSync('tailwind.config.js', 'utf8')
    const postcss = readFileSync('postcss.config.js', 'utf8')
    expect(tailwind).toContain("./src/**/*.{js,ts,jsx,tsx}")
    expect(postcss).toContain('tailwindcss')
    expect(postcss).toContain('autoprefixer')
  })

  it('carga las capas de Tailwind antes del diseño del producto', () => {
    const index = readFileSync('src/index.css', 'utf8')
    const main = readFileSync('src/main.tsx', 'utf8')
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(index).toContain('@tailwind base;')
    expect(index).toContain('@tailwind components;')
    expect(index).toContain('@tailwind utilities;')
    expect(app).toContain("./product.css")
    expect(main).toContain("./design/system.css")
  })

  it('centraliza los fundamentos visuales en el design system', () => {
    const tokens = readFileSync('src/design/tokens.ts', 'utf8')
    const product = readFileSync('src/product.css', 'utf8')
    const premium = readFileSync('src/design/product-system.css', 'utf8')
    const colors = readFileSync('src/design/colors.ts', 'utf8')
    expect(tokens).toContain('colors')
    expect(tokens).toContain('spacing')
    expect(product).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(premium).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(colors).toContain("500: '#4F6BFF'")
    expect(colors).toContain("500: '#7C5CFF'")
  })

  it('permite los estilos inyectados por Vite sin abrir la CSP a scripts inline', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).toContain("style-src 'self' 'unsafe-inline'")
    expect(html).toContain("script-src 'self'")
    expect(html).not.toContain("script-src 'self' 'unsafe-inline'")
  })
})
