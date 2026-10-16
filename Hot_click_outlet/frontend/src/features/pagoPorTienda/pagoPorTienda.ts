import { useEffect, useState } from 'react'
import { paymentService } from '@/services/paymentService'

/**
 * S2-27 · Carrito con varias tiendas (Pago 1 de N) — CONTRATO SUPUESTO.
 * Hoy el checkout cobra un solo pago. Con ONVO Marketplace habrá un cargo por tienda. El backend avisará
 * con `pagoPorTienda: true` en GET /api/public/checkout-config (campo que todavía no existe). Hasta
 * entonces el aviso no se muestra, para no prometer algo que no pasa.
 */
export const AVISO_CARGO_POR_TIENDA = 'Vas a ver un cargo por cada tienda.'

export function debeAvisarCargoPorTienda(pagoPorTienda: boolean, cantidadTiendas: number): boolean {
  return pagoPorTienda && cantidadTiendas >= 2
}

export function usePagoPorTienda(): boolean {
  const [activo, setActivo] = useState(false)
  useEffect(() => {
    let vivo = true
    paymentService.getCheckoutConfig()
      .then(({ data }) => { if (vivo) setActivo((data as { pagoPorTienda?: boolean } | undefined)?.pagoPorTienda === true) })
      .catch(() => { /* sin config: un solo pago, sin aviso */ })
    return () => { vivo = false }
  }, [])
  return activo
}
