export const FILTERS = [
  { label: 'Todos',        value: undefined },
  { label: 'Disponibles',  value: false },
  { label: 'Usados',       value: true },
] as const

export type FiltroCupon = (typeof FILTERS)[number]['value']

export const PAGE_SIZE = 50

export type CuponAdmin = {
  id?: number | string
  codigo: string
  email: string
  descuentoPorcentaje?: number
  usosActuales?: number
  maxUsos?: number
  usado?: boolean
  fechaCreacion?: string | null
  fechaUso?: string | null
}

export type TipoCuponStat = {
  porcentaje: number
  total: number
  usados: number
}

export type CuponesStats = {
  total: number
  disponibles: number
  usados: number
  tipos?: TipoCuponStat[]
}

export function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}
