import * as Sentry from '@sentry/react'

const IGNORE_ERRORS = [
  'ResizeObserver loop',
  'ChunkLoadError',
  'Failed to fetch dynamically imported module',
  'Loading chunk',
  'Failed to fetch',
  'Load failed',
  'NetworkError',
  'AbortError',
  'The operation was aborted',
  'Script error.',
  'Non-Error promise rejection captured',
  'Failed to load Clerk',
  'ClerkJS',
  'Failed to load Stripe.js',
]

const DENY_URLS = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
]

/**
 * @param {import('@sentry/react').ErrorEvent} event
 * @returns {import('@sentry/react').ErrorEvent | null}
 */
export function beforeSend(event) {
  if (import.meta.env.MODE !== 'production') return null
  const frames = event.exception?.values?.[0]?.stacktrace?.frames
  if (!frames?.length) return null
  const origin = globalThis.location?.origin
  const hasAppFrame = frames.some((frame) => {
    const file = frame.filename || ''
    if (!file) return false
    if (origin && file.startsWith(origin)) return true
    return file.includes('/assets/') || file.includes('/src/')
  })
  return hasAppFrame ? event : null
}

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE || undefined,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    ignoreErrors: IGNORE_ERRORS,
    denyUrls: DENY_URLS,
    beforeSend,
  })
}

/**
 * @param {{ userId?: number|string|null, empresaId?: number|null, rol?: string|null }} identity
 */
export function syncSentryUser(identity = {}) {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  const { userId, empresaId, rol } = identity
  if (!userId) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({ id: String(userId) })
  if (empresaId != null) Sentry.setTag('empresaId', String(empresaId))
  if (rol) Sentry.setTag('rol', rol)
}
