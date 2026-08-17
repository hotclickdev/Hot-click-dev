/**
 * Carga mensajes persistidos del chat AI.
 * @param {string} storageKey
 * @returns {object[]}
 */
export function loadMensajes(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
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
  try { localStorage.setItem(storageKey, JSON.stringify(toSave)) } catch (err) { console.error(err) }
}

/** @param {string} searchKey @param {string[]} sessionSearches */
export function persistSessionSearches(searchKey, sessionSearches) {
  try { sessionStorage.setItem(searchKey, JSON.stringify(sessionSearches.slice(-6))) } catch (err) { console.error(err) }
}
