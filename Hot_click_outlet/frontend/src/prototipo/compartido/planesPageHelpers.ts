import { PLAN_PRECIOS, textoComision, textoMensualidad, type ClavePlan } from '@/config/planesPrecios'
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

export type PlanApiTuPlan = {
  id: Id
  nombre: string
  precioMensual?: number
  /** Mensualidad USD desde config del backend (registro-planes). */
  precioUsd?: number | null
  comisionPorcentaje?: number | string
  comisionMinimaCrc?: number
  maxProductos?: number
  maxBodegas?: number
  maxUsuarios?: number
  maxCajas?: number
  tienePos?: boolean
  tieneReportes?: boolean
  tieneCrm?: boolean
  tieneCompras?: boolean
  tieneAi?: boolean
  tieneGiftCards?: boolean
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
  // Beneficios y límites: solo de las banderas del plan del API, nada escrito a mano.
  if (p.maxUsuarios != null && p.maxUsuarios !== 1) lista.push(p.maxUsuarios < 0 ? 'Usuarios del equipo sin límite' : `Hasta ${p.maxUsuarios} usuarios del equipo`)
  if (p.tienePos && p.maxCajas != null) lista.push(p.maxCajas < 0 ? 'Cajas (POS) sin límite' : p.maxCajas === 1 ? '1 caja (POS)' : `${p.maxCajas} cajas (POS)`)
  if (p.tieneReportes) lista.push('Reportes de ventas')
  if (p.tieneCompras) lista.push('Compras a proveedores')
  if (p.tieneCrm) lista.push('Clientes (CRM)')
  if (p.tieneAi) lista.push('Asistente con IA')
  if (p.tieneGiftCards) lista.push('Tarjetas de regalo')
  return lista
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
    // USD desde config del backend; el precioMensual en colones ya no se muestra.
    precio: textoMensualidad(p.precioUsd),
    beneficios: beneficiosDesdeApi(p),
    cta: CTA_PLAN[p.nombre] ?? `Cambiar a ${p.nombre}`,
  }
}

/** NP-3: antes de confirmar un plan de pago hay que verificar el correo (el backend devuelve 400 si no). */
export function requiereVerificarCorreo(plan: PlanUi | null, correoVerificado: boolean | null | undefined): boolean {
  return plan != null && plan.nombreApi.toUpperCase() !== 'EMPRENDEDOR' && correoVerificado !== true
}

export function validarPasoElegirPlan(
  planElegido: PlanUi | null,
  planActualApi: string,
): string | null {
  if (!planElegido) return 'Elegí un plan para continuar.'
  if (planElegido.nombreApi === planActualApi) return 'Ese ya es tu plan actual.'
  return null
}
