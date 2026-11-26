import { useEffect, useState } from 'react'
import api from '@/services/api'
import { diasPruebaPlanes, monedaDePlanes, textoMensualidad, type ClavePlan, type MonedaPlan } from '@/config/planesPrecios'

type PlanConPrecio = { nombre: string; precioUsd?: number | null; moneda?: string | null; diasPrueba?: number | null }

export type MensualidadesPlanes = {
  montos: Partial<Record<ClavePlan, number>>
  moneda: string | null
  /** Días gratis por plan (`diasPrueba` del backend); ausente o 0 = sin oferta. */
  diasPrueba: Partial<Record<ClavePlan, number>>
}

/**
 * Mensualidad por plan y su moneda, tal como las publica el backend (`GET /api/planes` → precioUsd + moneda; el monto
 * está en la moneda de PLANES_MONEDA). Sin dato (cargando, error o plan sin precio) queda vacío: nunca se inventa un monto.
 */
let cache: Promise<PlanConPrecio[] | null> | null = null

/** Una sola llamada a /planes por carga de página (hero, comparativa y tarjetas la comparten). */
export function cargarPlanesCompartido(): Promise<PlanConPrecio[] | null> {
  if (!cache) {
    cache = api.get<PlanConPrecio[]>('/planes')
      .then((r) => (Array.isArray(r.data) ? r.data : null))
      .catch(() => { cache = null; return null })
  }
  return cache
}

/** Solo para pruebas: olvida la respuesta guardada. */
export function reiniciarCachePlanes(): void { cache = null }

export function useMensualidadesPlanes(): MensualidadesPlanes {
  const [estado, setEstado] = useState<MensualidadesPlanes>({ montos: {}, moneda: null, diasPrueba: {} })
  useEffect(() => {
    let vivo = true
    cargarPlanesCompartido()
      .then((planes) => {
        if (!vivo || !planes) return
        const montos: Partial<Record<ClavePlan, number>> = {}
        for (const p of planes) {
          const n = Number(p.precioUsd)
          if (Number.isFinite(n) && n > 0) montos[p.nombre as ClavePlan] = n
        }
        setEstado({ montos, moneda: monedaDePlanes(planes), diasPrueba: diasPruebaPlanes(planes) })
      })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [])
  return estado
}

/** «₡12.900/mes», «US$24/mes» o, sin monto, «mensualidad del plan» (para frases en minúscula como las meta description). */
export function mensualidadMeta(monto?: number | null, moneda?: MonedaPlan): string {
  return textoMensualidad(monto, false, moneda).replace(/^M/, 'm')
}

/** Cierre de las meta description: «Productos en colones; mensualidad en colones.» según la moneda del backend. */
export function notaMonedaMeta(moneda?: MonedaPlan): string {
  const c = typeof moneda === 'string' ? moneda.trim().toUpperCase() : ''
  if (c === 'CRC') return 'Productos y mensualidad en colones.'
  if (c === 'USD') return 'Productos en colones; mensualidad en dólares.'
  return 'Productos en colones; mensualidad con tarjeta.'
}
