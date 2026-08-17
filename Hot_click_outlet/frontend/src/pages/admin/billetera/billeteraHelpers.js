export const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const TIPO_LABEL = {
  CREDITO_VENTA:    { text: 'Venta',           color: 'text-green-400'  },
  DEBITO_PAYOUT:    { text: 'Retiro pagado',    color: 'text-red-400'    },
  RETENCION_PAYOUT: { text: 'Retiro retenido',  color: 'text-yellow-400' },
  LIBERACION_PAYOUT:{ text: 'Retiro liberado',  color: 'text-blue-400'   },
  DEVOLUCION:       { text: 'Devolución',        color: 'text-orange-400' },
  AJUSTE_MANUAL:    { text: 'Ajuste manual',     color: 'text-gray-400'   },
}

export const ESTADO_BADGE = {
  PENDIENTE:  'bg-yellow-500/15 text-yellow-300',
  EN_PROCESO: 'bg-blue-500/15 text-blue-300',
  PAGADO:     'bg-green-500/15 text-green-300',
  RECHAZADO:  'bg-red-500/15 text-red-300',
}
