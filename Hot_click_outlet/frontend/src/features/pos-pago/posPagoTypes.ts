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
  /** Métodos que la caja habilitó; el cliente elige entre ellos (V147). */
  metodosHabilitados?: string[]
  /** Número de cobro visible ("P-3391"). */
  numeroCobro?: string | null
  /** Nombre de la caja o sucursal que cobra. */
  caja?: string | null
}

export type MetodoQr = 'SINPE' | 'TARJETA'

/** Comprobante del cobro pagado (`GET /pos/qr/pago/:token/comprobante`). */
export type QrComprobante = {
  numeroCobro?: string | null
  empresaNombre?: string
  logoUrl?: string | null
  caja?: string | null
  metodoPago?: string
  total?: number
  items?: QrPagoItem[]
  fechaPago?: string | null
  referencia?: string
}

export type PosPagoVista =
  | 'cargando'
  | 'resumen'
  | 'exito'
  | 'cancelado'
  | 'error'
  | 'pagado'
  | 'vencido'
