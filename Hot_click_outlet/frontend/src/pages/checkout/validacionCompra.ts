import { validateAddress, validateGuestEmail, validatePhone } from './checkoutHelpers'
import { requiereDireccion } from './paquetesCompra'

export type PasoCompra = 1 | 2 | 3
export type MetodoPago = 'SINPE' | 'TILOPAY' | 'EFECTIVO'
export type DatosCompra = { correo: string; telefono: string; nombre: string }
export type DireccionCompra = { provincia: string; canton: string; senas: string; distrito?: string }
export type CampoCompra = keyof DatosCompra | keyof DireccionCompra | 'comprobante'
export type ErroresCompra = Partial<Record<CampoCompra, string>>

type Traductor = (clave: string) => string

function sinVacios(errores: ErroresCompra): ErroresCompra {
  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje)) as ErroresCompra
}

export function erroresDatos(datos: DatosCompra, t: Traductor): ErroresCompra {
  return sinVacios({
    correo: validateGuestEmail(datos.correo, t),
    telefono: validatePhone(datos.telefono, t),
    nombre: datos.nombre.trim() ? '' : t('compra.datos.nombreRequerido'),
  })
}

/** Sin dirección cuando todos los paquetes se retiran en tienda. */
export function erroresDireccion(direccion: DireccionCompra, envios: Record<string, string>, t: Traductor): ErroresCompra {
  if (!requiereDireccion(envios)) return {}
  return sinVacios({
    provincia: direccion.provincia ? '' : t('compra.entrega.provinciaRequerida'),
    canton: direccion.canton ? '' : t('compra.entrega.cantonRequerido'),
    senas: validateAddress(direccion.senas, t),
  })
}

/** SINPE pide el comprobante antes de pagar: se sube apenas se crea el pedido. */
export function erroresPago(metodoPago: MetodoPago, comprobante: File | null, t: Traductor): ErroresCompra {
  return metodoPago === 'SINPE' && !comprobante ? { comprobante: t('compra.pago.comprobanteRequerido') } : {}
}

export function textoDireccion(direccion: DireccionCompra): string {
  return [direccion.senas.trim(), direccion.distrito?.trim(), direccion.canton, direccion.provincia].filter(Boolean).join(', ')
}

/** Con varios paquetes el backend devuelve `<compra>-1`; al cliente se le muestra el número de la compra. */
export function numeroCompraVisible(numeroPedido: string | undefined, cantidadPaquetes: number): string {
  if (!numeroPedido) return ''
  return cantidadPaquetes > 1 ? numeroPedido.replace(/-\d+$/, '') : numeroPedido
}
