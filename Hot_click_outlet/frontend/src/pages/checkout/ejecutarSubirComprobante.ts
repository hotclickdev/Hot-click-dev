import { paymentService } from '@/services/paymentService'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'
import { WHATSAPP } from './checkoutHelpers'
import type { ItemCheckout } from './checkoutHelpers'

type PagoDataSinpe = {
  numeroPedido?: string
}

type SubirComprobanteDeps = {
  sinpeImagen: File | null
  sinpeNombre: string
  sinpeCedula: string
  sinpeTelefono: string
  pagoData: PagoDataSinpe | null
  token: string | null
  sinpeEmail: string
  guestEmail: string
  setSinpeImagenErr: (msg: string) => void
  setSinpeUploadEstado: (estado: string) => void
  setSinpeUploadError: (msg: string) => void
}

function mensajeErrorComprobante(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return 'Error al subir el comprobante. Intentá de nuevo.'
  }
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : 'Error al subir el comprobante. Intentá de nuevo.'
}

/**
 * Sube el comprobante SINPE — mismo orden token/guest que el original.
 */
export async function ejecutarSubirComprobante({
  sinpeImagen, sinpeNombre, sinpeCedula, sinpeTelefono, pagoData,
  token, sinpeEmail, guestEmail,
  setSinpeImagenErr, setSinpeUploadEstado, setSinpeUploadError,
}: SubirComprobanteDeps) {
  if (!sinpeImagen) {
    setSinpeImagenErr('Debes adjuntar una imagen del comprobante')
    return
  }
  setSinpeImagenErr('')
  setSinpeUploadEstado('uploading')
  setSinpeUploadError('')

  const fd = new FormData()
  fd.append('imagen', sinpeImagen)
  fd.append('nombreRemitente', sinpeNombre)
  if (sinpeCedula) fd.append('cedulaRemitente', sinpeCedula)
  if (sinpeTelefono) fd.append('telefonoRemitente', sinpeTelefono)

  try {
    const numeroPedido = pagoData?.numeroPedido as string
    if (token) {
      await paymentService.subirComprobanteSinpe(numeroPedido, fd)
    } else {
      const correo = sinpeEmail.trim() || guestEmail.trim()
      fd.append('correoUsuario', correo)
      await paymentService.guestSubirComprobanteSinpe(numeroPedido, fd)
    }
    setSinpeUploadEstado('done')
  } catch (err: unknown) {
    const msg = mensajeErrorComprobante(err)
    setSinpeUploadError(msg)
    setSinpeUploadEstado('error')
  }
}

type SinpeWhatsAppDeps = {
  pagoData: PagoDataSinpe | null
  sinpeNombre: string
  sinpeCedula: string
  sinpeTelefono: string
  totalFinal: number
}

/**
 * Abre WhatsApp con el comprobante SINPE.
 */
export function ejecutarSinpeWhatsApp({ pagoData, sinpeNombre, sinpeCedula, sinpeTelefono, totalFinal }: SinpeWhatsAppDeps) {
  const numeroPedido = pagoData?.numeroPedido ?? ''
  const msg = encodeURIComponent(
    `Hola HotClick\n\n*Comprobante SINPE Móvil*\n\n` +
      `Nombre: ${sinpeNombre || '(sin nombre)'}\n` +
      (sinpeCedula ? `Cédula: ${sinpeCedula}\n` : '') +
      (sinpeTelefono ? `Teléfono: ${sinpeTelefono}\n` : '') +
      (numeroPedido ? `Pedido: ${numeroPedido}\n` : '') +
      `Monto: ${formatPrice(totalFinal)}\n\n` +
      `_Ya subí el comprobante en la web. ¡Gracias!_`,
  )
  globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
}

type CheckoutWhatsAppDeps = {
  totalFinal: number
  items: ItemCheckout[]
  toWhatsAppMessage: () => string
}

/**
 * Abre WhatsApp con el mensaje del carrito.
 */
export function ejecutarCheckoutWhatsApp({ totalFinal, items, toWhatsAppMessage }: CheckoutWhatsAppDeps) {
  analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + (i.cantidad as number), 0))
  const msg = toWhatsAppMessage()
  globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
}
