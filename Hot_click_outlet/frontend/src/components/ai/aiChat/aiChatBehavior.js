/**
 * Cookie compacta de comportamiento del chat (sin PII, sin historial de mensajes).
 * Las conversaciones viven en localStorage por superficie.
 */
const COOKIE = 'hc_ai_beh'
const MAX_AGE_SEC = 60 * 60 * 24 * 180

function leer() {
  try {
    const raw = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE}=`))
    if (!raw) return vacio()
    const parsed = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)))
    return { ...vacio(), ...parsed }
  } catch {
    return vacio()
  }
}

function vacio() {
  return { v: 1, h: 0, c: 0, p: 0, o: 0, m: 0, lp: '', s: '' }
}

function escribir(data) {
  try {
    const value = encodeURIComponent(JSON.stringify(data))
    document.cookie = `${COOKIE}=${value}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`
  } catch (err) {
    console.error(err)
  }
}

/**
 * @param {'home'|'catalogo'|'producto'|'carrito'|'otra'} surface
 * @param {string} [productoId]
 */
export function trackAiPage(surface, productoId) {
  const d = leer()
  if (surface === 'home') d.h += 1
  else if (surface === 'catalogo') d.c += 1
  else if (surface === 'producto') d.p += 1
  else d.o += 1
  d.s = surface
  if (productoId) d.lp = String(productoId)
  escribir(d)
}

/**
 * @param {'home'|'catalogo'|'producto'|'carrito'|'otra'} surface
 */
export function trackAiUserMsg(surface) {
  const d = leer()
  d.m += 1
  d.s = surface
  escribir(d)
}

export function readAiBehavior() {
  return leer()
}
