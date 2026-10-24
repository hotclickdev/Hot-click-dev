import { formatoColon } from '@/theme/formatoColon'
import { PLAN_PRECIOS, textoComision, type ClavePlan } from '@/config/planesPrecios'
import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'
import type { Id } from '@/types/api'
import type { PlanId } from './plan'

export type PlanUi = {
  id: Id
  nombreApi: string
  nombre: string
  precio: string
  beneficios: readonly string[]
  cta: string | null
}

/** Beneficios sin montos: la comisión, los productos y las bodegas salen del plan del API (NP-1/NP-2). */
export const BENEFICIOS_PLAN: Record<string, readonly string[]> = {
  EMPRENDEDOR: ['Reportes básicos'],
  PYME: ['Gestión de equipo (varios usuarios)', 'Reportes avanzados'],
  NEGOCIO_PLUS: ['Todo lo de PYME', 'Multi-sucursal', 'Soporte prioritario'],
}

export type PlanApiTuPlan = {
  id: Id
  nombre: string
  precioMensual?: number
  comisionPorcentaje?: number | string
  comisionMinimaCrc?: number
  maxProductos?: number
  maxBodegas?: number
}

function beneficiosDesdeApi(p: PlanApiTuPlan): string[] {
  const respaldo = PLAN_PRECIOS[p.nombre as ClavePlan]
  const pct = p.comisionPorcentaje != null ? Number(p.comisionPorcentaje) : respaldo?.comisionPct
  const lista: string[] = []
  if (p.maxProductos != null) lista.push(p.maxProductos < 0 ? 'Productos ilimitados' : `Hasta ${p.maxProductos} productos publicados`)
  if (pct != null && !Number.isNaN(pct)) {
    const c = textoComision(pct, 0) // V185: sin mínimo por venta
    lista.push(`Comisión ${c}`)
  }
  if (p.maxBodegas != null) lista.push(p.maxBodegas < 0 ? 'Bodegas sin límite' : p.maxBodegas === 1 ? '1 bodega' : `${p.maxBodegas} bodegas`)
  return [...lista, ...(BENEFICIOS_PLAN[p.nombre] ?? [])]
}

export const CTA_PLAN: Record<string, string> = {
  EMPRENDEDOR: 'Bajar a Emprendedor',
  PYME: 'Mejorar a PYME',
  NEGOCIO_PLUS: 'Mejorar a Negocio Plus',
}

export const PASOS_CAMBIAR_PLAN: readonly PasoFormulario[] = [
  { id: 'elegir', titulo: 'Elegí tu plan' },
  { id: 'confirmar', titulo: 'Confirmá el cambio' },
]

export const TOTAL_PASOS_PLAN = 3

export function etiquetaPlan(nombre: string): string {
  if (nombre === 'NEGOCIO_PLUS') return 'Negocio Plus'
  if (nombre === 'EMPRENDEDOR') return 'Emprendedor'
  return nombre
}

export function mapSellerPlanIdToApi(id: PlanId): string {
  if (id === 'pyme') return 'PYME'
  if (id === 'negocioPlus') return 'NEGOCIO_PLUS'
  return 'EMPRENDEDOR'
}

export function mapApiPlanToUi(p: PlanApiTuPlan): PlanUi {
  return {
    id: p.id,
    nombreApi: p.nombre,
    nombre: etiquetaPlan(p.nombre),
    precio: Number(p.precioMensual ?? 0) === 0
      ? 'Gratis'
      : `${formatoColon(Number(p.precioMensual))}/mes`,
    beneficios: beneficiosDesdeApi(p),
    cta: CTA_PLAN[p.nombre] ?? `Cambiar a ${p.nombre}`,
  }
}

/** NP-3: antes de confirmar un plan de pago hay que verificar el correo (el backend devuelve 400 si no). */
export function requiereVerificarCorreo(plan: PlanUi | null, correoVerificado: boolean | null | undefined): boolean {
  return plan != null && plan.precio !== 'Gratis' && correoVerificado !== true
}

export function validarPasoElegirPlan(
  planElegido: PlanUi | null,
  planActualApi: string,
): string | null {
  if (!planElegido) return 'Elegí un plan para continuar.'
  if (planElegido.nombreApi === planActualApi) return 'Ese ya es tu plan actual.'
  return null
}
