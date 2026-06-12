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
  // Fallback para entornos sin crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
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
