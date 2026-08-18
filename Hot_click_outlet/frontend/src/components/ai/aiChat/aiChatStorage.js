/**
 * Chat de tienda: sessionStorage (se pierde al cerrar la pestaña).
 * Asesor de ficha / carrito / post-pago: localStorage.
 * @param {string} storageKey
 */
function esChatDeTienda(storageKey) {
  return storageKey === 'hc-chat-msgs-hotclick'
    || storageKey === 'hc-chat-msgs-tienda-home'
    || storageKey === 'hc-chat-msgs-tienda-catalogo'
}

function bucket(storageKey) {
  return esChatDeTienda(storageKey) ? sessionStorage : localStorage
}

/**
 * @param {string} storageKey
 * @returns {object[]}
 */
export function loadMensajes(storageKey) {
  return parseMensajes(bucket(storageKey), storageKey)
}

function parseMensajes(store, storageKey) {
  try {
    const raw = store.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(m => !m.typing && !m.failed) : []
  } catch (err) {
    console.error(err)
    return []
  }
}

/**
 * @param {string} searchKey
 * @returns {string[]}
 */
export function loadSessionSearches(searchKey) {
  try {
    const raw = sessionStorage.getItem(searchKey)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error(err)
    return []
  }
}

/** @param {string} storageKey @param {object[]} mensajes */
export function persistMensajes(storageKey, mensajes) {
  const toSave = mensajes.filter(m => !m.typing && !m.failed).slice(-30)
  try { bucket(storageKey).setItem(storageKey, JSON.stringify(toSave)) } catch (err) { console.error(err) }
}

/** @param {string} searchKey @param {string[]} sessionSearches */
export function persistSessionSearches(searchKey, sessionSearches) {
  try { sessionStorage.setItem(searchKey, JSON.stringify(sessionSearches.slice(-6))) } catch (err) { console.error(err) }
}
