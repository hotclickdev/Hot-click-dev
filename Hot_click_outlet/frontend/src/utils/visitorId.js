const COOKIE_NAME = 'hotclick_visitor_id'
const COOKIE_DAYS = 365

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback usando crypto.getRandomValues (seguro, soportado en todos los browsers modernos)
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return [...bytes].map((b, i) =>
    ([4,6,8,10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')
  ).join('')
}

/**
 * Lee la cookie hotclick_visitor_id.
 * Si no existe, genera un UUID v4 y la persiste por 365 días.
 * Llamar en cualquier punto del ciclo de vida del visitante.
 */
export function getOrCreateVisitorId() {
  let id = getCookie(COOKIE_NAME)
  if (!id) {
    id = generateUUID()
    setCookie(COOKIE_NAME, id, COOKIE_DAYS)
  }
  return id
}
