import { paymentService } from '@/services/paymentService'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'
import { WHATSAPP } from './checkoutHelpers'

/**
 * Sube el comprobante SINPE — mismo orden token/guest que el original.
 * @param {object} deps
 */
export async function ejecutarSubirComprobante({
  sinpeImagen, sinpeNombre, sinpeCedula, sinpeTelefono, pagoData,
  token, sinpeEmail, guestEmail,
  setSinpeImagenErr, setSinpeUploadEstado, setSinpeUploadError,
}) {
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
    const numeroPedido = pagoData?.numeroPedido
    if (token) {
      await paymentService.subirComprobanteSinpe(numeroPedido, fd)
    } else {
      const correo = sinpeEmail.trim() || guestEmail.trim()
      fd.append('correoUsuario', correo)
      await paymentService.guestSubirComprobanteSinpe(numeroPedido, fd)
    }
    setSinpeUploadEstado('done')
  } catch (err) {
    const msg = err?.response?.data?.message || 'Error al subir el comprobante. Intentá de nuevo.'
    setSinpeUploadError(msg)
    setSinpeUploadEstado('error')
  }
}

/**
 * Abre WhatsApp con el comprobante SINPE.
 * @param {object} deps
 */
export function ejecutarSinpeWhatsApp({ pagoData, sinpeNombre, sinpeCedula, sinpeTelefono, totalFinal }) {
  const numeroPedido = pagoData?.numeroPedido ?? ''
  const msg = encodeURIComponent(
    `Hola HotClick 👋\n\n*Comprobante SINPE Móvil*\n\n` +
      `Nombre: ${sinpeNombre || '(sin nombre)'}\n` +
      (sinpeCedula ? `Cédula: ${sinpeCedula}\n` : '') +
      (sinpeTelefono ? `Teléfono: ${sinpeTelefono}\n` : '') +
      (numeroPedido ? `Pedido: ${numeroPedido}\n` : '') +
      `Monto: ${formatPrice(totalFinal)}\n\n` +
      `_Ya subí el comprobante en la web. ¡Gracias!_`,
  )
  globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
}

/**
 * Abre WhatsApp con el mensaje del carrito.
 * @param {object} deps
 */
export function ejecutarCheckoutWhatsApp({ totalFinal, items, toWhatsAppMessage }) {
  analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
  const msg = toWhatsAppMessage()
  globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
}
