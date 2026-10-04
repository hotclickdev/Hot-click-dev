import api from './api'

export type TiendaSeo = {
  slug: string
  nombre: string
  tagline?: string
  logoUrl?: string
  provincia?: string
}

export type ProductoSeo = {
  id: number
  nombre: string
  precio: number
  imagenUrl?: string
}

export type SectorResumen = {
  slug: string
  nombre: string
  cantidad: number
}

export type SectorDetalle = SectorResumen & {
  descripcion: string
  productos: ProductoSeo[]
}

export type ProvinciaSeo = {
  slug: string
  nombre: string
  tiendas: TiendaSeo[]
}

function lista<T>(data: unknown): T[] {
  return Array.isArray(data) ? data as T[] : []
}

export const seoService = {
  sectores: () => api.get('/public/seo/sectores').then(r => lista<SectorResumen>(r.data)),
  sector: (slug: string) => api.get(`/public/seo/sectores/${encodeURIComponent(slug)}`).then(r => r.data as SectorDetalle),
  tiendas: () => api.get('/public/seo/tiendas').then(r => lista<TiendaSeo>(r.data)),
  provincia: (slug: string) => api.get(`/public/seo/provincias/${encodeURIComponent(slug)}`).then(r => r.data as ProvinciaSeo),
}
