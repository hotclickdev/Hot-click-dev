import api from './api'
import type { JsonBody } from '@/types/api'

export type HomepageConfigApi = {
  heroSections: string
  visibleCategoriaIds: string
  maxCategorias: number
}

/** El backend guarda listas como CSV (VARCHAR) — más simple que un JSON column. */
export function csvALista(csv: string | undefined): string[] {
  if (!csv) return []
  return csv.split(',').map(s => s.trim()).filter(Boolean)
}

/** Config del homepage: lectura pública (sin auth) y CRUD admin. */
export const homepageService = {
  getPublico: () => api.get('/homepage/publico'),
  getAdmin: () => api.get('/homepage'),
  actualizar: (data: JsonBody) => api.put('/homepage', data),
}
