import type { Id } from '@/types/api'
import type { ReactNode } from 'react'

export const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  TRIAL:    { label: 'Trial activo',   color: '#fbbf24' },
  ACTIVO:   { label: 'Activo',         color: '#22c55e' },
  PAST_DUE: { label: 'Pago pendiente', color: '#f87171' },
  VENCIDO:  { label: 'Vencido',        color: '#9ca3af' },
  CANCELADO:{ label: 'Cancelado',      color: '#9ca3af' },
  SIN_SUSCRIPCION: { label: 'Sin suscripción', color: '#9ca3af' },
}

export type SuscripcionInfo = {
  estado?: string
  trialEnd?: string
  fechaFin?: string
  cancelarAlVencer?: boolean
  tieneStripe?: boolean
}

export type FacturaBilling = {
  id: Id
  periodoInicio?: string
  periodoFin?: string
  montoCentavos?: number
  moneda?: string
  estado?: string
  urlPdf?: string | null
}

export type KpiCardProps = {
  label: string
  value: ReactNode
  sub?: ReactNode
}

export function fmtFechaSuscripcion(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function fmtMontoFactura(centavos: number | undefined, moneda: string | undefined): string {
  return `${moneda?.toUpperCase() === 'USD' ? 'US$' : moneda} ${(Number(centavos) / 100).toFixed(2)}`
}

export function estiloEstadoFactura(estado: string | undefined): { backgroundColor: string; color: string } {
  const pagado = estado === 'PAGADO'
  return {
    backgroundColor: pagado ? '#16a34a22' : '#f8717122',
    color: pagado ? '#22c55e' : '#f87171',
  }
}

export function etiquetaEstadoFactura(estado: string | undefined): string {
  return estado === 'PAGADO' ? 'Pagado' : (estado ?? '')
}
