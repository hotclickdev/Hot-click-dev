/** Tipo de cambio CRC/USD por defecto si el API no responde. */
export const TC_DEFAULT = 530

/** IVA + impuestos + margen aproximado sobre el promedio de mercado. */
export const FACTOR_PRECIO_SUGERIDO = 1.58

/** Variante de Badge por estado de publicación FB. */
export const ESTADO_COLOR = {
  PENDIENTE: 'warning',
  LISTO: 'accent',
  PUBLICADO: 'success',
  ERROR: 'danger',
}

/** Filtros de la cola FB; string vacío = todos. */
export const FILTROS_ESTADO_COLA = ['', 'PENDIENTE', 'LISTO', 'PUBLICADO', 'ERROR']
