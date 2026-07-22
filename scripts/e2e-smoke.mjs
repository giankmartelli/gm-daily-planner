const base = (process.env.E2E_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '')
const get = async (path) => {
  const response = await fetch(`${base}${path}`)
  if (!response.ok) throw new Error(`${path} respondió ${response.status}`)
  return response
}

const home = await (await get('/')).text()
if (!home.includes('GM Daily Planner') || !home.includes('id="root"')) throw new Error('El documento principal no contiene la aplicación')
await Promise.all(['/features', '/pricing', '/privacy', '/terms', '/contact', '/about', '/app'].map(get))
const manifest = await (await get('/manifest.webmanifest')).json()
if (manifest.display !== 'standalone' || !manifest.icons?.some((icon) => icon.purpose === 'maskable')) throw new Error('Manifiesto PWA incompleto')
const worker = await (await get('/sw.js')).text()
if (!worker.includes('SKIP_WAITING') || !worker.includes('caches.open')) throw new Error('Service worker incompleto')
await Promise.all(['/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png'].map(get))
await Promise.all(['/brand/logo-mark.svg', '/brand/logo-mark-dark.svg', '/brand/logo-mark-light.svg', '/brand/logo-mark-mono.svg', '/robots.txt', '/sitemap.xml'].map(get))
console.log(`E2E smoke aprobado en ${base}`)
