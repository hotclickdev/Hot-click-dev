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

/** Negocio de `GET /api/public/negocios/destacados` (carrusel del inicio): foto ya resuelta, sin contacto. */
export type NegocioDestacado = {
  slug: string
  nombre: string
  categoria: string
  provincia: string
  logoUrl: string
  fotoPortada: string
}

export const negocioService = {
  /** Hasta 5 negocios destacados del catálogo público (empresa ACTIVO y visible). */
  destacados: (limite = 5, signal?: AbortSignal) =>
    api.get<NegocioDestacado[]>('/public/negocios/destacados', { params: { limite }, signal }),
  /** `q`: nombre o slug sin tildes. `plan`: alias del directorio (`emprendimientos`, `pymes`, `negocio-plus`). */
  buscar: (params: { q?: string; plan?: string; limite?: number }, signal?: AbortSignal) =>
    api.get<NegocioPublico[]>('/public/negocios', { params, signal }),
}
