import { useEffect, useState } from 'react'
import api from '@/services/api'
import { textoMensualidad, type ClavePlan } from '@/config/planesPrecios'

type PlanConPrecio = { nombre: string; precioUsd?: number | null }

/**
 * Mensualidad USD por plan, tal como la publica el backend (`GET /api/planes` → precioUsd). Sin dato (cargando, error o
 * plan sin precio) queda null: nunca se inventa un monto.
 */
export function useMensualidadesPlanes(): Partial<Record<ClavePlan, number>> {
  const [montos, setMontos] = useState<Partial<Record<ClavePlan, number>>>({})
  useEffect(() => {
    let vivo = true
    api.get<PlanConPrecio[]>('/planes')
      .then((r) => {
        if (!vivo || !Array.isArray(r.data)) return
        const siguiente: Partial<Record<ClavePlan, number>> = {}
        for (const p of r.data) {
          const n = Number(p.precioUsd)
          if (Number.isFinite(n) && n > 0) siguiente[p.nombre as ClavePlan] = n
        }
        setMontos(siguiente)
      })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [])
  return montos
}

/** «US$24/mes» o, sin monto, «mensualidad en dólares» (para frases en minúscula como las meta description). */
export function mensualidadMeta(monto?: number | null): string {
  return textoMensualidad(monto).replace(/^M/, 'm')
}
