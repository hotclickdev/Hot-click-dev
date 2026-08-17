export const RECENT_KEY = 'hotclick-recent-searches'
export const MAX_RECENT = 6

let _productCache = null
let _brandCache = null

export function getProductCache() { return _productCache }
export function setProductCache(v) { _productCache = v }
export function getBrandCache() { return _brandCache }
export function setBrandCache(v) { _brandCache = v }

export function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export function saveRecent(query) {
  if (!query.trim()) return
  const next = [query.trim(), ...getRecent().filter((s) => s !== query.trim())].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}
