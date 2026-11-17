/**
 * El token de una invitación de equipo es una CREDENCIAL: no puede quedar en analítica (GA4, PostHog, Clarity),
 * en Sentry del navegador ni en logs. El enlace del correo lo lleva en el fragmento (`/equipo/invitacion#t=<token>`);
 * estas funciones cubren además un enlace viejo (token en el path o en `?t=`/`?token=`) o un `replaceState` fallido.
 */

export const RUTA_INVITACION = '/equipo/invitacion'

const MARCA = '[token]'
/** Segmentos fijos de las APIs nuevas (sin token): no se tocan. */
const FIJOS_AUTH = new Set(['consultar', 'aceptar-cuenta-nueva'])

/** Ruta (solo path, sin query ni hash) con el token de invitación enmascarado. */
export function sanitizarPath(path: string): string {
  return path
    // SPA vieja: /equipo/invitacion/<token>
    .replace(/(\/equipo\/invitacion)\/[^/?#]+/g, '$1')
    // API vieja: /api/auth/equipo-invitacion/<token>[/aceptar-cuenta-nueva]
    .replace(/(\/equipo-invitacion\/)([^/?#]+)/g, (m, pre: string, seg: string) => (FIJOS_AUTH.has(seg) ? m : pre + MARCA))
    // API vieja: /api/equipo-invitaciones/<token>/aceptar
    .replace(/(\/equipo-invitaciones\/)([^/?#]+)/g, (m, pre: string, seg: string) => (seg === 'aceptar' ? m : pre + MARCA))
}

function esRutaInvitacion(path: string): boolean {
  return /\/(equipo\/invitacion|equipo-invitacion|equipo-invitaciones)(\/|$)/.test(path)
}

/**
 * URL (absoluta o relativa) apta para mandar a analítica o a Sentry: sin hash (ahí viaja `#t=`), con el token del
 * path enmascarado y, en rutas de invitación, sin query (`?t=`, `?token=`). En el resto conserva la query.
 */
export function sanitizarUrl(url: string): string {
  const sinHash = url.split('#')[0]
  const i = sinHash.indexOf('?')
  const path = i === -1 ? sinHash : sinHash.slice(0, i)
  const query = i === -1 ? '' : sinHash.slice(i)
  const limpio = sanitizarPath(path)
  return esRutaInvitacion(path) ? limpio : limpio + query
}

/** `{ page_path, page_location }` de la página actual, ya sanitizados (para GA4: se mandan los dos). */
export function ubicacionSegura(loc: Pick<Location, 'pathname' | 'search' | 'href'> = globalThis.location): {
  page_path: string
  page_location: string
} {
  return { page_path: sanitizarUrl(`${loc.pathname}${loc.search}`), page_location: sanitizarUrl(loc.href) }
}

/** true si la URL todavía lleva un token de invitación (path viejo, `?t=`/`?token=` o `#t=`). */
export function llevaTokenInvitacion(url: string): boolean {
  if (/[#?&](?:t|token)=/.test(url) && /invitacion/.test(url)) return true
  return sanitizarPath(url.split(/[?#]/)[0]) !== url.split(/[?#]/)[0]
}

type EventoConUrl = {
  request?: { url?: string; headers?: Record<string, string> }
  transaction?: string
  spans?: Array<{ description?: string; data?: Record<string, unknown> }>
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>
  contexts?: Record<string, unknown>
  tags?: Record<string, unknown>
  extra?: Record<string, unknown>
}

const CLAVES_URL = ['url', 'http.url', 'http.query', 'http.fragment', 'from', 'to', 'url.full', 'server.address.path']

function limpiarDatos(data: Record<string, unknown> | undefined) {
  if (!data) return
  for (const k of Object.keys(data)) {
    const v = data[k]
    if (typeof v !== 'string') continue
    if (k === 'http.query' || k === 'http.fragment') delete data[k]
    else if (CLAVES_URL.includes(k)) data[k] = sanitizarUrl(v)
  }
}

/**
 * Sanitiza in situ las URLs de un evento o transacción de Sentry: request.url, el nombre de la transacción
 * (pageload / navegación), la descripción y los datos de los spans XHR/fetch, y los breadcrumbs de navegación.
 */
export function sanitizarEventoSentry<T extends EventoConUrl>(ev: T): T {
  if (ev.request?.url) ev.request.url = sanitizarUrl(ev.request.url)
  if (ev.request?.headers) {
    for (const k of Object.keys(ev.request.headers)) {
      if (/^(referer|referrer)$/i.test(k)) ev.request.headers[k] = sanitizarUrl(ev.request.headers[k])
    }
  }
  if (ev.transaction) ev.transaction = sanitizarDescripcion(ev.transaction)
  for (const s of ev.spans ?? []) {
    if (s.description) s.description = sanitizarDescripcion(s.description)
    limpiarDatos(s.data)
  }
  for (const b of ev.breadcrumbs ?? []) {
    if (b.message) b.message = sanitizarPath(b.message)
    limpiarDatos(b.data)
  }
  const trace = (ev.contexts as { trace?: { data?: Record<string, unknown>; description?: string } } | undefined)?.trace
  if (trace) {
    limpiarDatos(trace.data)
    if (trace.description) trace.description = sanitizarDescripcion(trace.description)
  }
  return ev
}

/** Descripción de span: "GET /api/..." o una URL sola. */
function sanitizarDescripcion(d: string): string {
  const m = /^([A-Z]+)\s+(.*)$/.exec(d)
  return m ? `${m[1]} ${sanitizarUrl(m[2])}` : sanitizarUrl(d)
}
