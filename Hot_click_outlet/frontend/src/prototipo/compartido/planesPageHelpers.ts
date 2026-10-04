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

/**
 * Beneficios por plan = textos finales de Producto (`planes.{plan}.punto.*`, 3-oct-2026). Límites = los que aplica
 * el backend (DataSeeder), provisionales. Sin montos: mensualidad y comisión los fija HOT_CLICK ([PENDIENTE]).
 */
export const BENEFICIOS_PLAN: Record<string, readonly string[]> = {
  EMPRENDEDOR: [
    'Hasta 50 productos',
    '1 bodega',
    'Punto de venta con 1 caja',
    'Equipo de 2 usuarios',
    'Tus clientes te compran a través de HotClick',
    'Mensualidad y comisión: [PENDIENTE]',
  ],
  PYME: [
    'Tu contacto visible en tu tienda',
    'Hasta 500 productos',
    '2 bodegas',
    'Punto de venta con 2 cajas',
    'Equipo de 5 usuarios',
    'Compras a proveedores y gift cards',
    '80 consultas de IA al mes',
    'Mensualidad y comisión: [PENDIENTE]',
  ],
  NEGOCIO_PLUS: [
    'Tu contacto visible en tu tienda',
    'Productos, bodegas, cajas y usuarios sin límite',
    'Consultas de IA sin límite',
    'Todo lo de Pyme',
    'Mensualidad y comisión: [PENDIENTE]',
  ],
}

/** Monto mostrado en la tarjeta de plan: lo fija HOT_CLICK, mientras tanto [PENDIENTE] (sin «Gratis»). */
export const PRECIO_PENDIENTE = '[PENDIENTE]'

export const CTA_PLAN: Record<string, string> = {
  EMPRENDEDOR: 'Bajar a Emprendedor',
  PYME: 'Mejorar a Pyme',
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
  if (nombre === 'PYME') return 'Pyme'
  return nombre
}

/** Nombre de plan de `tenantStore` (puede ser `FREE` o `Sin plan` antes de cargar) → plan de la API. */
export function normalizarPlanApi(nombre: string | null | undefined): string {
  const plan = (nombre ?? '').toUpperCase()
  return plan === 'PYME' || plan === 'NEGOCIO_PLUS' ? plan : 'EMPRENDEDOR'
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
    precio: PRECIO_PENDIENTE,
    beneficios: BENEFICIOS_PLAN[p.nombre] ?? [],
    cta: CTA_PLAN[p.nombre] ?? `Cambiar a ${p.nombre}`,
  }
}

export function validarPasoElegirPlan(
  planElegido: PlanUi | null,
  planActualApi: string,
): string | null {
  if (!planElegido) return 'Elegí un plan para continuar.'
  if (planElegido.nombreApi === planActualApi) return 'Ese ya es tu plan.'
  return null
}
