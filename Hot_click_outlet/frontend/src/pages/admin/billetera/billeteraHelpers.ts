export const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const TIPO_LABEL: Record<string, { text: string; color: string }> = {
  CREDITO_VENTA:    { text: 'Venta',           color: 'text-green-400'  },
  DEBITO_PAYOUT:    { text: 'Retiro pagado',    color: 'text-red-400'    },
  RETENCION_PAYOUT: { text: 'Retiro retenido',  color: 'text-yellow-400' },
  LIBERACION_PAYOUT:{ text: 'Retiro liberado',  color: 'text-blue-400'   },
  DEVOLUCION:       { text: 'Devolución',        color: 'text-orange-400' },
  AJUSTE_MANUAL:    { text: 'Ajuste manual',     color: 'text-gray-400'   },
}

export const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  'bg-yellow-500/15 text-yellow-300',
  EN_PROCESO: 'bg-blue-500/15 text-blue-300',
  PAGADO:     'bg-green-500/15 text-green-300',
  RECHAZADO:  'bg-red-500/15 text-red-300',
}

export type WalletSaldo = {
  saldoDisponible?: number
  saldoRetenido?: number
  totalAcreditado?: number
  totalRetirado?: number
}

export type WalletTx = {
  id: number | string
  tipo: string
  descripcion?: string
  monto: number
  saldoTrasMovimiento?: number
  fechaCreacion: string
  totalBruto?: number
  comisionSaas?: number
  comisionGw?: number
}

export type WalletPayout = {
  id: number | string
  fechaSolicitud: string
  monto: number
  metodo: string
  destinoSinpe?: string
  destinoIban?: string
  estado: string
  notasAdmin?: string
}

export type PayoutForm = {
  monto: string
  metodo: string
  destinoSinpe: string
  destinoIban: string
  nombreTitular: string
  bancoDestino: string
  notas: string
}

export function mensajeErrorBilletera(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : fallback
}
