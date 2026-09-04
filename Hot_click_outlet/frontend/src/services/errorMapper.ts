/** Shape crudo de un error de negocio devuelto por GlobalExceptionHandler (ver com.hotclick.config). */
type ErrorBody = {
  message?: string
  error?: string
  upgrade?: string
}

export type AccionError = {
  label: string
  ruta: string
}

export type ErrorMapeado = {
  mensaje: string
  tipo: 'error' | 'warning'
  accion?: AccionError
}

function cuerpoError(err: unknown): ErrorBody | undefined {
  if (!err || typeof err !== 'object') return undefined
  const data = (err as { response?: { data?: unknown } }).response?.data
  if (!data || typeof data !== 'object') return undefined
  return data as ErrorBody
}

/**
 * Traduce cualquier error de axios contra la API de HotClick a un mensaje +
 * acción consistente para mostrar en un toast/modal. Cubre tanto el shape
 * estándar de ResponseDTO.error(message) como los shapes ad-hoc de
 * PlanLimitException (campo `upgrade`) e IntegracionExternaException.
 */
export function mapearErrorBackend(err: unknown, fallback: string): ErrorMapeado {
  const body = cuerpoError(err)
  if (!body) return { mensaje: fallback, tipo: 'error' }

  if (body.error === 'LIMIT_REACHED') {
    return {
      mensaje: body.message ?? fallback,
      tipo: 'warning',
      accion: { label: 'Ver planes', ruta: '/admin/billing/planes' },
    }
  }

  return { mensaje: body.message ?? fallback, tipo: 'error' }
}
