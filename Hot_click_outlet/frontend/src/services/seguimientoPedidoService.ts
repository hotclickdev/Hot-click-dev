import api from './api'

/** Producto de un paquete: solo lo que el comprador necesita ver (sin precios, sku ni ids). */
export type SeguimientoProducto = {
  nombre?: string | null
  imagenUrl?: string | null
  cantidad?: number | null
}

/** Un paquete por vendedor/bodega de origen del mismo pago. */
export type SeguimientoPaquete = {
  tienda?: string | null
  origen?: string | null
  estado?: string | null
  retiroEnTienda?: boolean
  fechaEntrega?: string | null
  numeroGuia?: string | null
  courier?: 'CORREOS_CR' | 'ENTREGA_DIRECTA' | null
  urlRastreo?: string | null
  productos?: SeguimientoProducto[]
}

export type SeguimientoPedido = {
  numeroPedido: string
  fechaPedido?: string | null
  total?: number | null
  invitarCrearCuenta?: boolean
  paquetes: SeguimientoPaquete[]
}

export const seguimientoPedidoService = {
  /** Público: el token viene del enlace del correo. 404 si no existe (mensaje genérico). */
  porToken: (token: string) =>
    api.get(`/public/pedidos/seguimiento/${encodeURIComponent(token)}`),
}
