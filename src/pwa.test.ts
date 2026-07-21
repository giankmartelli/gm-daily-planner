import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PWA', () => {
  it('declara instalación, iconos adaptativos y modo standalone', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true)
    expect(manifest.start_url).toBe('/')
  })

  it('mantiene caché offline y actualización de versiones', () => {
    const worker = readFileSync('public/sw.js', 'utf8')
    expect(worker).toContain("caches.open(CACHE)")
    expect(worker).toContain("SKIP_WAITING")
    expect(worker).toContain("event.request.mode === 'navigate'")
  })
})
