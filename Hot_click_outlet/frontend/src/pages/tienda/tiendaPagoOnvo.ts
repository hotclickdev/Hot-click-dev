import type { CheckoutPayload } from '@/types/pedido'
import { METODO_ENVIO_DOMICILIO } from './tiendaCheckoutValidacion'

/** Pago de la tienda pública. ONVO es el procesador; SINPE manual solo si el backend lo publica. */
export const PAGO_TIENDA_ONVO = 'ONVO'
export const PAGO_TIENDA_SINPE_MANUAL = 'SINPE'
export const PAGO_TIENDA_EFECTIVO = 'EFECTIVO'

/** Valor del `provider` para /payments/checkout; null = no hay pago posible (fail-closed, sin pedido). */
export function proveedorTienda(metodo: string, tarjetaOnvo: boolean, sinpeManual: boolean): string | null {
  if (metodo === PAGO_TIENDA_ONVO) return tarjetaOnvo ? 'ONVO' : null
  if (metodo === PAGO_TIENDA_SINPE_MANUAL) return sinpeManual ? 'SINPE' : null
  return null
}

/** Método con el que abre el checkout: ONVO siempre; SINPE manual nunca es el predeterminado. */
export function metodoInicialTienda(): string {
  return PAGO_TIENDA_ONVO
}

type DatosTienda = {
  correoCliente: string
  telefonoCliente: string
  direccionEntrega: string
  metodoEnvio: string
  provincia?: string
  canton?: string
  notas: string
  items: { productoId: unknown; cantidad: number }[]
}

/** Mismo payload que el checkout del marketplace (/payments/checkout), sin flujo propio. */
export function payloadCheckoutTienda(d: DatosTienda, provider: string, invitado: boolean): CheckoutPayload {
  const domicilio = d.metodoEnvio === METODO_ENVIO_DOMICILIO
  return {
    // El servidor reclasifica GAM / fuera del GAM con provincia y cantón.
    metodoEnvio: domicilio ? 'ENVIO_NORMAL_GAM' : 'RETIRO_EN_TIENDA',
    notas: d.notas || null,
    direccionEntrega: domicilio && d.direccionEntrega ? d.direccionEntrega.slice(0, 500) : null,
    provincia: d.provincia?.trim() || undefined,
    canton: d.canton?.trim() || undefined,
    provider,
    items: d.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
    ...(invitado ? { guestEmail: d.correoCliente.trim(), guestPhone: d.telefonoCliente || null } : {}),
  }
}
