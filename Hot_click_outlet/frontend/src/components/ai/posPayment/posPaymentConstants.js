export const BODEGA_DEFAULT  = 1
export const SINPE_NUMERO    = '8666-7888'
export const SINPE_TITULAR   = 'Andrés Zúñiga (HotClick)'
export const WHATSAPP        = '50686667888'

export const ESTADOS_SUBMITTING = new Set(['loading', 'redirecting'])
export const ESTADOS_PENDING    = new Set(['sinpe_pendiente', 'polling'])

export const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
