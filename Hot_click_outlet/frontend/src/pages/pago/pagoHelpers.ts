import type { TFunction } from 'i18next'

export type IconoBeneficioPago = 'garantia' | 'paquete' | 'envio' | 'whatsapp' | 'pago' | 'clientes'

/** Beneficios rotativos de la espera; `clave` es la clave i18n del texto. */
export const BENEFITS: { icono: IconoBeneficioPago; clave: string }[] = [
  { icono: 'garantia', clave: 'payment.carga.beneficios.garantia' },
  { icono: 'paquete', clave: 'payment.carga.beneficios.paquete' },
  { icono: 'envio', clave: 'payment.carga.beneficios.envio' },
  { icono: 'whatsapp', clave: 'payment.carga.beneficios.whatsapp' },
  { icono: 'pago', clave: 'payment.carga.beneficios.pago' },
  { icono: 'clientes', clave: 'payment.carga.beneficios.clientes' },
]

export type PagoResumen = {
  numeroPedido?: string
  total?: number
  metodoPago?: string
  cardLast4?: string
  cardBrand?: string
  proveedor?: string
  /** Token del seguimiento sin cuenta (/seguimiento/:token), si el backend lo devuelve. */
  tokenSeguimiento?: string
}

export function esStripeAprobado(redirectStatus: string | null): boolean {
  return redirectStatus === 'succeeded'
}

export function esCancelacionPago(pathname: string, redirectStatus: string | null): boolean {
  return (
    pathname === '/pago/cancelado'
    || pathname.endsWith('/pago-fallido')
    || redirectStatus === 'failed'
  )
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

export function mensajeCargaPago(estado: string, stripeApproved: boolean, t: TFunction): string {
  if (estado === 'capturing') return t('payment.carga.confirmando')
  if (stripeApproved) return t('payment.carga.aprobadoRegistrando')
  return t('payment.carga.verificando')
}

export function tituloPendiente(stripeApproved: boolean, t: TFunction): string {
  return stripeApproved ? t('payment.pendiente.tituloAprobado') : t('payment.pendiente.tituloRevision')
}

export function subtituloPendiente(stripeApproved: boolean, t: TFunction): string {
  return stripeApproved
    ? t('payment.pendiente.textoAprobado')
    : t('payment.pendiente.textoRevision')
}
