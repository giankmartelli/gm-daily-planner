import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './product.css'
import App from './App.tsx'
import { initializeMonitoring, Sentry } from './lib/monitoring'

initializeMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<main className="fatal-error"><h1>Algo salió mal</h1><p>Tus datos locales permanecen seguros. Recarga la aplicación para continuar.</p><button onClick={() => window.location.reload()}>Recargar</button></main>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Versionar la URL evita que un cliente instalado conserve indefinidamente
    // un worker antiguo entre despliegues de Vercel.
    const registration = await navigator.serviceWorker.register('/sw.js?v=5', { updateViaCache: 'none' })
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) worker.postMessage('SKIP_WAITING')
      })
    })
    await registration.update()
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('gm-pwa-reloaded')) return
    sessionStorage.setItem('gm-pwa-reloaded', '1')
    window.location.reload()
  })
}

// En desarrollo, evita que una versión PWA almacenada intercepte los módulos de Vite.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
  )
  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  }
}
