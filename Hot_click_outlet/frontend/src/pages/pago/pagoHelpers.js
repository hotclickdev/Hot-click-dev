export const BENEFITS = [
  { icono: 'garantia', text: 'Tu compra está protegida con garantía de 40 días' },
  { icono: 'paquete', text: 'Tu pedido será preparado con cuidado' },
  { icono: 'envio', text: 'Envíos rápidos a todo Costa Rica' },
  { icono: 'whatsapp', text: 'Soporte por WhatsApp disponible 24/7' },
  { icono: 'pago', text: 'Pago 100% seguro y encriptado' },
  { icono: 'clientes', text: 'Miles de clientes satisfechos en Costa Rica' },
]

/** @param {string | null} redirectStatus */
export function esStripeAprobado(redirectStatus) {
  return redirectStatus === 'succeeded'
}

/** @param {string} pathname @param {string | null} redirectStatus */
export function esCancelacionPago(pathname, redirectStatus) {
  return pathname === '/pago/cancelado' || redirectStatus === 'failed'
}

/**
 * @param {URLSearchParams} params
 * @param {string} pathname
 */
export function leerParamsPago(params, pathname) {
  const numeroPedido = params.get('order')
  const provider = params.get('provider')
  const paypalToken = params.get('token')
  const redirectStatus = params.get('redirect_status')
  return {
    numeroPedido,
    provider,
    paypalToken,
    stripeApproved: esStripeAprobado(redirectStatus),
    esCancelacion: esCancelacionPago(pathname, redirectStatus),
  }
}

/** @param {string} estado */
export function estaOcupado(estado) {
  return estado === 'idle' || estado === 'polling' || estado === 'capturing'
}

/**
 * @param {string} estado
 * @param {boolean} stripeApproved
 */
export function mensajeCargaPago(estado, stripeApproved) {
  if (estado === 'capturing') return 'Confirmando tu pago…'
  if (stripeApproved) return 'Pago aprobado — registrando en el sistema…'
  return 'Verificando el pago con el banco…'
}

/** @param {boolean} stripeApproved */
export function tituloPendiente(stripeApproved) {
  return stripeApproved ? '¡Pago aprobado!' : 'Tu pago está siendo revisado'
}

/** @param {boolean} stripeApproved */
export function subtituloPendiente(stripeApproved) {
  return stripeApproved
    ? 'Tu banco ya confirmó el pago. Estamos registrando tu pedido — recibirás un correo en unos minutos.'
    : 'La confirmación puede tardar unos minutos más. Te enviaremos un correo cuando se procese.'
}
