/** Formatea un monto en colones costarricenses. */
export const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const METODOS = [
  { id: 'EFECTIVO', label: 'Efectivo', desc: 'Calcula vuelto' },
  { id: 'SINPE',    label: 'SINPE',    desc: 'Al número del negocio' },
  { id: 'TARJETA',  label: 'Tarjeta',  desc: 'QR a la pasarela' },
]

export const SEG_COLOR: Record<string, string> = { NUEVO: '#6490EA', FRECUENTE: '#34d399', VIP: '#fbbf24', INACTIVO: '#A7B0BC' }

export type ClienteCobroPos = {
  id: number | string
  nombre?: string
  apellidoPaterno?: string
  correo?: string
  telefono?: string
  segmento?: string
  puntosFidelidad?: number
}

export type PayloadPagoPanel = {
  clienteId: number | string | null
  metodoPago: string
  montoRecibido: number | null
  confirmacionSinpe: string | null
}
