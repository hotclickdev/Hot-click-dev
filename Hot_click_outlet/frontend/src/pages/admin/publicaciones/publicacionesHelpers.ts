import type { Id } from '@/types/api'
import type { BadgeProps } from '@/components/ui/Badge'

/** Tipo de cambio CRC/USD por defecto si el API no responde. */
export const TC_DEFAULT = 530

/** IVA + impuestos + margen aproximado sobre el promedio de mercado. */
export const FACTOR_PRECIO_SUGERIDO = 1.58

/** Variante de Badge por estado de publicación FB. */
export const ESTADO_COLOR: Record<string, NonNullable<BadgeProps['variant']>> = {
  PENDIENTE: 'warning',
  LISTO: 'accent',
  PUBLICADO: 'success',
  ERROR: 'danger',
}

/** Filtros de la cola FB; string vacío = todos. */
export const FILTROS_ESTADO_COLA = ['', 'PENDIENTE', 'LISTO', 'PUBLICADO', 'ERROR']

export type PrecioFuente = {
  fuente?: string
  precioCrc: number
  precioUsd?: number
}

export type ResultadoVision = {
  todasEtiquetas?: string[]
  precios?: PrecioFuente[]
  promedioCrc?: number
  error?: string
}

export type PublicacionFb = {
  id: Id
  fkIdProducto?: Id
  tituloFb?: string
  textoFb?: string
  estadoPublicacion?: string
  precioPublicar?: number
  condicionFb?: string
  categoriaFb?: string
  producto?: { nombreProducto?: string }
}

export type ProductoPublicacion = {
  id: Id
  nombre?: string
  precioVenta?: number
  stock?: number
  imagenUrl?: string
}

export type ModoAnalisis = 'nombre' | 'foto'
export type TabPublicaciones = 'analizar' | 'cola'
