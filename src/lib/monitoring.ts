import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()

export function initializeMonitoring() {
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) delete event.request.cookies
      return event
    },
  })
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (dsn) Sentry.captureException(error, { extra: context })
  else if (import.meta.env.DEV) console.error(error)
}

export { Sentry }
