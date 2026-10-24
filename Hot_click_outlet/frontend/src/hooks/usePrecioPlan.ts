import { useEffect, useState } from 'react'
import api from '@/services/api'
import { PLAN_PRECIOS, textoComision, textoMensualidad, type ClavePlan } from '@/config/planesPrecios'

type PlanApi = { nombre: string; precioUsd?: number | null; comisionPorcentaje?: number | null }

/**
 * Precio público de un plan con la mensualidad real en USD de `GET /api/planes` (p. ej. «US$24/mes + 7,5% por venta»).
 * Mientras carga o si falla, cae al texto genérico de config/planesPrecios (nunca inventa un monto).
 */
export function usePrecioPlan(clave: ClavePlan): { mensualidad: string; comision: string; texto: string } {
  const [plan, setPlan] = useState<PlanApi | null>(null)

  useEffect(() => {
    let vivo = true
    api.get<PlanApi[]>('/planes')
      .then((r) => {
        if (!vivo || !Array.isArray(r.data)) return
        setPlan(r.data.find((p) => p.nombre === clave) ?? null)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [clave])

  const comisionPct = plan?.comisionPorcentaje != null ? Number(plan.comisionPorcentaje) : PLAN_PRECIOS[clave].comisionPct
  const mensualidad = textoMensualidad(plan?.precioUsd)
  const comision = textoComision(comisionPct)
  return { mensualidad, comision, texto: `${mensualidad} + ${comision}` }
}
