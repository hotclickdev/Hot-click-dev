/**
 * Atribución first/last touch (UTM + click ids). Cookie de primera parte, 90 días.
 * Medición propia: no depende del consentimiento de analytics/Meta.
 */

const COOKIE_NAME = 'hc_attr'
const STORAGE_KEY = 'hotclick-attribution'
const TTL_DAYS = 90
const MAX_AGE_SEC = TTL_DAYS * 24 * 60 * 60

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type AttributionTouch = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  fbclid?: string
  gclid?: string
  landingPath?: string
  touchedAt: string
}

export type AttributionSnapshot = {
  first: AttributionTouch | null
  last: AttributionTouch | null
}

function trimParam(value: string | null): string | undefined {
  if (value == null) return undefined
  const t = value.trim()
  return t.length > 0 && t.length <= 500 ? t : undefined
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  if (!match) return null
  try {
    return decodeURIComponent(match.slice(name.length + 1))
  } catch {
    return null
  }
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure}`
}

function parseSnapshot(raw: string | null): AttributionSnapshot {
  if (!raw) return { first: null, last: null }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { first: null, last: null }
    const obj = parsed as { first?: AttributionTouch | null; last?: AttributionTouch | null }
    return {
      first: obj.first ?? null,
      last: obj.last ?? null,
    }
  } catch {
    return { first: null, last: null }
  }
}

function persist(snapshot: AttributionSnapshot) {
  const json = JSON.stringify(snapshot)
  try {
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    /* private mode */
  }
  writeCookie(COOKIE_NAME, json)
}

export function loadAttribution(): AttributionSnapshot {
  try {
    const fromLs = localStorage.getItem(STORAGE_KEY)
    if (fromLs) return parseSnapshot(fromLs)
  } catch {
    /* ignore */
  }
  return parseSnapshot(readCookie(COOKIE_NAME))
}

function touchFromSearch(search: string, pathname: string): AttributionTouch | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const utmSource = trimParam(params.get('utm_source'))
  const utmMedium = trimParam(params.get('utm_medium'))
  const utmCampaign = trimParam(params.get('utm_campaign'))
  const utmContent = trimParam(params.get('utm_content'))
  const utmTerm = trimParam(params.get('utm_term'))
  const fbclid = trimParam(params.get('fbclid'))
  const gclid = trimParam(params.get('gclid'))

  const hasPaidSignal = Boolean(
    utmSource || utmMedium || utmCampaign || utmContent || utmTerm || fbclid || gclid,
  )
  if (!hasPaidSignal) return null

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    fbclid,
    gclid,
    landingPath: pathname.slice(0, 500),
    touchedAt: new Date().toISOString(),
  }
}

/**
 * Lee UTM/click ids de la URL actual y actualiza first + last touch.
 * Solo actualiza last cuando hay señal de campaña (no tráfico directo).
 */
export function captureAttributionFromLocation(
  search: string = globalThis.location?.search ?? '',
  pathname: string = globalThis.location?.pathname ?? '/',
): AttributionSnapshot {
  const touch = touchFromSearch(search, pathname)
  const current = loadAttribution()
  if (!touch) return current

  const next: AttributionSnapshot = {
    first: current.first ?? touch,
    last: touch,
  }
  persist(next)
  return next
}

/** Snapshot para enviar en el checkout (camelCase → backend Jackson). */
export function attributionForCheckout(): AttributionSnapshot | null {
  const snap = loadAttribution()
  if (!snap.first && !snap.last) return null
  return snap
}

/** event_id estable por sesión de toque + acción (dedup pixel/CAPI). */
export function attributionEventId(action: string, productId?: string | number | null): string {
  const snap = loadAttribution()
  const base = snap.last?.touchedAt ?? snap.first?.touchedAt ?? 'na'
  const pid = productId != null ? String(productId) : 'x'
  return `${action}_${pid}_${base}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

export { UTM_KEYS }
