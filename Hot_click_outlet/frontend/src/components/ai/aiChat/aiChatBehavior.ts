import type { AiChatSurface } from './chatSurface'

/**
 * Cookie compacta de comportamiento del chat (sin PII, sin historial de mensajes).
 * Las conversaciones viven en localStorage por superficie.
 */
const COOKIE = 'hc_ai_beh'
const MAX_AGE_SEC = 60 * 60 * 24 * 180

type AiBehavior = {
  v: number
  h: number
  c: number
  p: number
  o: number
  m: number
  lp: string
  s: string
}

function leer(): AiBehavior {
  try {
    const raw = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE}=`))
    if (!raw) return vacio()
    const parsed: unknown = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)))
    return { ...vacio(), ...(parsed as Partial<AiBehavior>) }
  } catch {
    return vacio()
  }
}

function vacio(): AiBehavior {
  return { v: 1, h: 0, c: 0, p: 0, o: 0, m: 0, lp: '', s: '' }
}

function escribir(data: AiBehavior) {
  try {
    const value = encodeURIComponent(JSON.stringify(data))
    document.cookie = `${COOKIE}=${value}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`
  } catch (err: unknown) {
    console.error(err)
  }
}

export function trackAiPage(surface: AiChatSurface, productoId?: string) {
  const d = leer()
  if (surface === 'home') d.h += 1
  else if (surface === 'catalogo') d.c += 1
  else if (surface === 'producto') d.p += 1
  else d.o += 1
  d.s = surface
  if (productoId) d.lp = String(productoId)
  escribir(d)
}

export function trackAiUserMsg(surface: AiChatSurface) {
  const d = leer()
  d.m += 1
  d.s = surface
  escribir(d)
}

export function readAiBehavior() {
  return leer()
}
