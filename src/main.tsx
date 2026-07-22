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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js')
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) worker.postMessage('SKIP_WAITING')
      })
    })
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('gm-pwa-reloaded')) return
    sessionStorage.setItem('gm-pwa-reloaded', '1')
    window.location.reload()
  })
}
