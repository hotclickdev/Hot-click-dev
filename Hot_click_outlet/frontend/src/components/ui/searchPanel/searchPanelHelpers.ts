import type { Producto } from '@/types/producto'

export const RECENT_KEY = 'hotclick-recent-searches'
export const MAX_RECENT = 6

export type MarcaBusqueda = {
  id?: number | string
  nombreMarca?: string
  logoUrl?: string | null
}

let _productCache: Producto[] | null = null
let _brandCache: MarcaBusqueda[] | null = null

export function getProductCache() { return _productCache }
export function setProductCache(v: Producto[] | null) { _productCache = v }
export function getBrandCache() { return _brandCache }
export function setBrandCache(v: MarcaBusqueda[] | null) { _brandCache = v }

export function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[] } catch { return [] }
}

export function saveRecent(query: string) {
  if (!query.trim()) return
  const next = [query.trim(), ...getRecent().filter((s) => s !== query.trim())].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}
