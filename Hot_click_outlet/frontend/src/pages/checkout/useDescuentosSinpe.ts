import { useEffect, useMemo, useState } from 'react'
import { paymentService } from '@/services/paymentService'
import type { DescuentosSinpe, PaqueteCompra } from './paquetesCompra'
import type { MetodoPago } from './validacionCompra'

const SIN_DESCUENTOS: DescuentosSinpe = {}

/** Convierte `{ "7": 5 }` del API a `{ 7: 5 }`, descartando valores no numéricos. */
export function parseDescuentosSinpe(raw: unknown): DescuentosSinpe {
  if (!raw || typeof raw !== 'object') return {}
  const descuentos: DescuentosSinpe = {}
  for (const [clave, valor] of Object.entries(raw as Record<string, unknown>)) {
    const empresaId = Number(clave)
    const pct = Number(valor)
    if (Number.isFinite(empresaId) && Number.isFinite(pct) && pct > 0) descuentos[empresaId] = pct
  }
  return descuentos
}

/**
 * % de descuento SINPE/efectivo de los negocios del carrito, leído en vivo del servidor para que
 * el total mostrado coincida con el que cobra `OrderPricingService`. Con tarjeta devuelve vacío.
 */
export function useDescuentosSinpe(paquetes: PaqueteCompra[], metodoPago: MetodoPago): DescuentosSinpe {
  const [descuentos, setDescuentos] = useState<DescuentosSinpe>(SIN_DESCUENTOS)
  const clave = useMemo(
    () => paquetes.map((p) => p.empresaId).filter((id): id is number => id != null).sort((a, b) => a - b).join(','),
    [paquetes],
  )

  useEffect(() => {
    if (!clave) return
    let cancelado = false
    paymentService.getDescuentosSinpe(clave.split(',').map(Number))
      .then(({ data }) => { if (!cancelado) setDescuentos(parseDescuentosSinpe(data)) })
      .catch((err: unknown) => console.error('[checkout] no se pudo leer el descuento SINPE', err))
    return () => { cancelado = true }
  }, [clave])

  const aplica = metodoPago === 'SINPE' || metodoPago === 'EFECTIVO'
  return aplica && clave ? descuentos : SIN_DESCUENTOS
}
