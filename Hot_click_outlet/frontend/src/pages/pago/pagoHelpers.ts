export type IconoBeneficioPago = 'garantia' | 'paquete' | 'envio' | 'whatsapp' | 'pago' | 'clientes'

export const BENEFITS: { icono: IconoBeneficioPago; text: string }[] = [
  { icono: 'garantia', text: 'Tu compra está protegida con garantía de 40 días' },
  { icono: 'paquete', text: 'Tu pedido será preparado con cuidado' },
  { icono: 'envio', text: 'Envíos rápidos a todo Costa Rica' },
  { icono: 'whatsapp', text: 'Soporte por WhatsApp disponible 24/7' },
  { icono: 'pago', text: 'Pago 100% seguro y encriptado' },
  { icono: 'clientes', text: 'Miles de clientes satisfechos en Costa Rica' },
]

export type PagoResumen = {
  numeroPedido?: string
  total?: number
  metodoPago?: string
  cardLast4?: string
  cardBrand?: string
  proveedor?: string
}

export function esStripeAprobado(redirectStatus: string | null): boolean {
  return redirectStatus === 'succeeded'
}

export function esCancelacionPago(pathname: string, redirectStatus: string | null): boolean {
  return pathname === '/pago/cancelado' || redirectStatus === 'failed'
}

export function leerParamsPago(params: URLSearchParams, pathname: string) {
  const redirectStatus = params.get('redirect_status')
  return {
    stripeApproved: esStripeAprobado(redirectStatus),
    esCancelacion: esCancelacionPago(pathname, redirectStatus),
  }
}

/** Solo un `order=` no vacío cuenta como retorno de pasarela. */
export function pedidoDesdeBusqueda(search: string): string | null {
  const crudo = typeof search === 'string' && search.startsWith('?') ? search.slice(1) : search
  const bruto = new URLSearchParams(crudo || '').get('order')
  const limpio = (bruto ?? '').trim()
  return limpio.length > 0 ? limpio : null
}

export function estaOcupado(estado: string): boolean {
  return estado === 'idle' || estado === 'polling' || estado === 'capturing'
}

export function mensajeCargaPago(estado: string, stripeApproved: boolean): string {
  if (estado === 'capturing') return 'Confirmando tu pago…'
  if (stripeApproved) return 'Pago aprobado — registrando en el sistema…'
  return 'Verificando el pago con el banco…'
}

export function tituloPendiente(stripeApproved: boolean): string {
  return stripeApproved ? '¡Pago aprobado!' : 'Tu pago está siendo revisado'
}

export function subtituloPendiente(stripeApproved: boolean): string {
  return stripeApproved
    ? 'Tu banco ya confirmó el pago. Estamos registrando tu pedido — recibirás un correo en unos minutos.'
    : 'La confirmación puede tardar unos minutos más. Te enviaremos un correo cuando se procese.'
}
