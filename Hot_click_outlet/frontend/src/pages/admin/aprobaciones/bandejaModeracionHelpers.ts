import type { ModeracionResumen } from '@/services/moderacionService'

export type ColaModeracion = {
  id: string
  label: string
  count: number
  to: string
  cuerpo: string
}

export const RESUMEN_VACIO: ModeracionResumen = {
  empresas: 0,
  ofertas: 0,
  recolecciones: 0,
  sinpe: 0,
  testimonios: 0,
  payouts: 0,
  reportesProducto: 0,
  total: 0,
}

export function colasDesdeResumen(r: ModeracionResumen): ColaModeracion[] {
  return [
    {
      id: 'empresas',
      label: 'Empresas',
      count: r.empresas,
      to: '/admin/aprobaciones?tab=empresas',
      cuerpo: 'Negocios nuevos esperando activarse',
    },
    {
      id: 'ofertas',
      label: 'Promociones',
      count: r.ofertas,
      to: '/admin/aprobaciones?tab=ofertas',
      cuerpo: 'Ofertas de vendedores en revisión',
    },
    {
      id: 'recolecciones',
      label: 'Recolecciones',
      count: r.recolecciones,
      to: '/admin/recolecciones',
      cuerpo: 'Solicitudes GAM por cotizar o rechazar',
    },
    {
      id: 'sinpe',
      label: 'SINPE',
      count: r.sinpe,
      to: '/admin/pagos',
      cuerpo: 'Comprobantes pendientes de confirmar',
    },
    {
      id: 'testimonios',
      label: 'Reseñas',
      count: r.testimonios,
      to: '/admin/testimonios',
      cuerpo: 'Testimonios y reseñas por publicar',
    },
    {
      id: 'payouts',
      label: 'Retiros',
      count: r.payouts,
      to: '/admin/payouts',
      cuerpo: 'Payouts de billetera pendientes',
    },
    {
      id: 'reportes',
      label: 'Reportes',
      count: r.reportesProducto,
      to: '/admin/reportes-producto',
      cuerpo: 'Productos reportados por clientes',
    },
    // Garantías / Servicios HOT: operación, no van en esta bandeja.
  ]
}

export function formatoColonPayout(monto?: number | null): string {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(monto)
}

