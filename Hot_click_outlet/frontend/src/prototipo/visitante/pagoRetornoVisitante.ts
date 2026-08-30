import { visitanteRuta } from './visitanteMock'

const KEY = 'hc-pago-retorno-visitante'

/** Marca que el retorno de pasarela debe quedar en `/visitante/*`. */
export function marcarRetornoPagoVisitante(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* private mode */
  }
}

export function esRetornoPagoVisitante(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function limpiarRetornoPagoVisitante(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}

/**
 * Stripe/Onvo siguen devolviendo a `/pago/exito|cancelado` (backend fijo).
 * Si el checkout vino de Visitante, remapear preservando `?order=…`.
 */
export function destinoVisitanteDesdePago(pathname: string, search: string): string | null {
  if (!esRetornoPagoVisitante()) return null
  if (pathname === '/pago/exito') return `${visitanteRuta('compra-confirmada')}${search}`
  if (pathname === '/pago/cancelado') return `${visitanteRuta('pago-fallido')}${search}`
  return null
}

/** Llamar al iniciar pago desde chrome Visitante (path o flag previo). */
export function sincronizarRetornoPagoAlIniciar(pathname: string): void {
  if (pathname.startsWith('/visitante')) {
    marcarRetornoPagoVisitante()
    return
  }
  if (pathname === '/checkout' && esRetornoPagoVisitante()) return
  limpiarRetornoPagoVisitante()
}
