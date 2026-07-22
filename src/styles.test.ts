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
    expect(index).toContain('@tailwind base;')
    expect(index).toContain('@tailwind components;')
    expect(index).toContain('@tailwind utilities;')
    expect(main.indexOf("./index.css")).toBeLessThan(main.indexOf("./product.css"))
  })

  it('permite los estilos inyectados por Vite sin abrir la CSP a scripts inline', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).toContain("style-src 'self' 'unsafe-inline'")
    expect(html).toContain("script-src 'self'")
    expect(html).not.toContain("script-src 'self' 'unsafe-inline'")
  })
})
