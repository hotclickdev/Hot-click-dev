export type QrPagoItem = {
  productoId?: number
  nombre?: string
  nombreProducto?: string
  cantidad?: number
  precioUnitario?: number
  imagen?: string | null
}

export type QrPagoInfo = {
  token?: string
  estado?: string
  metodoPago?: string
  total?: number
  items?: QrPagoItem[]
  empresaNombre?: string
  logoUrl?: string | null
  colorPrimario?: string | null
  sinpeNumero?: string
  sinpeRef?: string
  expiracion?: string
}

export type PosPagoVista = 'cargando' | 'resumen' | 'exito' | 'cancelado' | 'error' | 'pagado'
