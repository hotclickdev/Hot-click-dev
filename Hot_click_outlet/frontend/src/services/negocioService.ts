import api from './api'

/** Plan que el backend publica de cada negocio (nunca el nombre interno del plan). */
export type PlanPublico = 'EMPRENDEDOR' | 'PYME' | 'NEGOCIO_PLUS'

/** Negocio de `GET /api/public/negocios`: solo vitrina, sin contacto del vendedor. */
export type NegocioPublico = {
  slug: string
  nombre: string
  logoUrl: string
  categoria: string
  plan: PlanPublico
  productos: number
}

export const negocioService = {
  /** `q`: nombre o slug sin tildes. `plan`: alias del directorio (`emprendimientos`, `pymes`, `negocio-plus`). */
  buscar: (params: { q?: string; plan?: string; limite?: number }, signal?: AbortSignal) =>
    api.get<NegocioPublico[]>('/public/negocios', { params, signal }),
}
