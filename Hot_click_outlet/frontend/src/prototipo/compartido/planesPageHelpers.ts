import { formatoColon } from '@/theme/formatoColon'
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

export const BENEFICIOS_PLAN: Record<string, readonly string[]> = {
  EMPRENDEDOR: [
    'Hasta 20 productos publicados',
    'Reportes básicos',
    'Comisión 8% por venta (mín. ₡400)',
    '1 bodega',
  ],
  PYME: [
    'Productos ilimitados',
    'Gestión de equipo (varios usuarios)',
    '₡9.900/mes + 4% por venta',
    'Reportes avanzados',
  ],
  NEGOCIO_PLUS: [
    'Todo lo de PYME',
    'Multi-sucursal',
    '₡24.900/mes + 4% por venta',
    'Soporte prioritario',
  ],
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

export function mapApiPlanToUi(p: {
  id: Id
  nombre: string
  precioMensual?: number
}): PlanUi {
  return {
    id: p.id,
    nombreApi: p.nombre,
    nombre: etiquetaPlan(p.nombre),
    precio: Number(p.precioMensual ?? 0) === 0
      ? 'Gratis'
      : `${formatoColon(Number(p.precioMensual))}/mes`,
    beneficios: BENEFICIOS_PLAN[p.nombre] ?? [],
    cta: CTA_PLAN[p.nombre] ?? `Cambiar a ${p.nombre}`,
  }
}

export function validarPasoElegirPlan(
  planElegido: PlanUi | null,
  planActualApi: string,
): string | null {
  if (!planElegido) return 'Elegí un plan para continuar.'
  if (planElegido.nombreApi === planActualApi) return 'Ese ya es tu plan actual.'
  return null
}
