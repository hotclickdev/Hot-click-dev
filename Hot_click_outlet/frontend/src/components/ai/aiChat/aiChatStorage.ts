import type { AiChatMensaje } from './aiChatHelpers'

/**
 * Chat de tienda: sessionStorage (se pierde al cerrar la pestaña).
 * Asesor de ficha / carrito / post-pago: localStorage.
 */
function esChatDeTienda(storageKey: string) {
  return storageKey === 'hc-chat-msgs-hotclick'
    || storageKey === 'hc-chat-msgs-tienda-home'
    || storageKey === 'hc-chat-msgs-tienda-catalogo'
}

function bucket(storageKey: string) {
  return esChatDeTienda(storageKey) ? sessionStorage : localStorage
}

export function loadMensajes(storageKey: string): AiChatMensaje[] {
  return parseMensajes(bucket(storageKey), storageKey)
}

function parseMensajes(store: Storage, storageKey: string): AiChatMensaje[] {
  try {
    const raw = store.getItem(storageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AiChatMensaje[]).filter(m => !m.typing && !m.failed) : []
  } catch (err: unknown) {
    console.error(err)
    return []
  }
}

export function loadSessionSearches(searchKey: string): string[] {
  try {
    const raw = sessionStorage.getItem(searchKey)
    return raw ? JSON.parse(raw) as string[] : []
  } catch (err: unknown) {
    console.error(err)
    return []
  }
}

export function persistMensajes(storageKey: string, mensajes: AiChatMensaje[]) {
  const toSave = mensajes.filter(m => !m.typing && !m.failed).slice(-30)
  try { bucket(storageKey).setItem(storageKey, JSON.stringify(toSave)) } catch (err: unknown) { console.error(err) }
}

export function persistSessionSearches(searchKey: string, sessionSearches: string[]) {
  try { sessionStorage.setItem(searchKey, JSON.stringify(sessionSearches.slice(-6))) } catch (err: unknown) { console.error(err) }
}
