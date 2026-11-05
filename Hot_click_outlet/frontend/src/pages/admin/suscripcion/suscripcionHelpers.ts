import { formatPrice, formatUSD } from '@/utils/format'
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
  // BAJO: siempre en hora de Costa Rica. «YYYY-MM-DD» es una fecha de calendario (new Date la toma como medianoche
  // UTC y en CR mostraba el día anterior); un instante ISO se pasa a America/Costa_Rica, no a la zona del navegador.
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
  const fecha = new Date(soloFecha ? `${dateStr}T12:00:00Z` : dateStr)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleDateString('es-CR', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: soloFecha ? 'UTC' : 'America/Costa_Rica',
  })
}

export function fmtMontoFactura(centavos: number | undefined, moneda: string | undefined): string {
  const unidades = (Number(centavos) || 0) / 100
  if (!moneda || moneda.toUpperCase() === 'USD') return formatUSD(unidades)
  if (moneda.toUpperCase() === 'CRC') return formatPrice(unidades)
  return `${moneda} ${unidades.toFixed(2)}`
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
