import type { ErrorEvent } from '@sentry/react'
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

const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi
const TOKEN_BOT = /(?<![0-9])\d{6,12}:[A-Za-z0-9_-]{30,}/g
const BASIC = /\bBasic\s+[A-Za-z0-9+/]{8,}={0,2}/gi
const CLAVE_SK_PK = /\b[sp]k_[A-Za-z0-9_]{10,}/g
const TOKEN_GITHUB = /\bghp_[A-Za-z0-9]{20,}/g
const AWS_KEY_ID = /\bAKIA[0-9A-Z]{16}\b/g
const TOKEN_SLACK = /\bxox[abposr]-[A-Za-z0-9-]{10,}/g
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
const CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const CEDULA = /\b\d{1,2}-\d{3,4}-\d{4,6}\b|\b\d{9,12}\b/g
const TELEFONO = /(?:\+\d{1,3}[\s-]?)?\b\d{4}[\s-]?\d{4}\b/g

/** Quita tokens (Bearer, Basic, bot, sk_/pk_, ghp_, AKIA, Slack, JWT), correos, cédulas y teléfonos de un texto antes de mandarlo a Sentry. */
export function redactarTexto(s: string | undefined | null): string | undefined {
  if (s == null) return undefined
  return String(s)
    .replace(BEARER, 'Bearer [token]')
    .replace(BASIC, 'Basic [token]')
    .replace(TOKEN_BOT, '[token]')
    .replace(CLAVE_SK_PK, '[token]')
    .replace(TOKEN_GITHUB, '[token]')
    .replace(AWS_KEY_ID, '[token]')
    .replace(TOKEN_SLACK, '[token]')
    .replace(JWT, '[token]')
    .replace(CORREO, '[correo]')
    .replace(CEDULA, '[cedula]')
    .replace(TELEFONO, '[telefono]')
}

function redactarRegistro(obj: Record<string, unknown> | undefined) {
  if (!obj) return obj
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === 'string' ? redactarTexto(v) : v == null ? v : redactarTexto(JSON.stringify(v))
  }
  return out
}

/**
 * Depura datos personales del evento: sin usuario (salvo id), sin headers,
 * cookies, cuerpo ni query string; textos con correo/cédula/teléfono redactados.
 * Si algo falla, el evento se descarta (falla cerrado).
 */
export function depurarPii(event: ErrorEvent): ErrorEvent | null {
  try {
    if (event.user) event.user = event.user.id != null ? { id: String(event.user.id) } : undefined
    if (event.request) {
      delete event.request.headers
      delete event.request.cookies
      delete event.request.data
      delete event.request.query_string
      if (event.request.url) event.request.url = redactarTexto(event.request.url.split('?')[0])
    }
    if (event.message) event.message = redactarTexto(event.message)
    for (const ex of event.exception?.values ?? []) {
      if (ex.value) ex.value = redactarTexto(ex.value)
    }
    for (const b of event.breadcrumbs ?? []) {
      if (b.message) b.message = redactarTexto(b.message)
      if (b.data) b.data = redactarRegistro(b.data as Record<string, unknown>)
    }
    if (event.extra) event.extra = redactarRegistro(event.extra as Record<string, unknown>)
    if (event.tags) {
      for (const k of Object.keys(event.tags)) {
        const v = event.tags[k]
        if (typeof v === 'string') event.tags[k] = redactarTexto(v) as string
      }
    }
    return event
  } catch {
    return null
  }
}

export function beforeSend(event: ErrorEvent): ErrorEvent | null {
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
  return hasAppFrame ? depurarPii(event) : null
}

/** Devuelve true solo si inicializó Sentry (requiere VITE_SENTRY_DSN no vacío). */
export function initSentry(dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN): boolean {
  if (!dsn || !String(dsn).trim()) return false
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE || undefined,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    ignoreErrors: IGNORE_ERRORS,
    denyUrls: DENY_URLS,
    beforeSend,
  })
  return true
}

export function syncSentryUser(identity: {
  userId?: number | string | null
  empresaId?: number | null
  rol?: string | null
} = {}) {
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
