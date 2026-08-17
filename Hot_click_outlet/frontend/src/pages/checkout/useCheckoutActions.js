import { useCallback } from 'react'
import { authService } from '@/services/authService'
import { cuponService } from '@/services/cuponService'
import { giftCardService } from '@/services/giftCardService'
import { paymentService } from '@/services/paymentService'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'
import { BODEGA_DEFAULT, WHATSAPP } from './checkoutHelpers'

/**
 * Handlers de checkout — flujo bit-idéntico al original (pago, SINPE, cupón, gift card).
 * @param {object} deps
 */
export function useCheckoutActions(deps) {
  const {
    token,
    items,
    totalFinal,
    metodoEnvio,
    metodoPago,
    notas,
    telefono,
    direccion,
    guestEmail,
    guestPhone,
    sinpeNombre,
    sinpeCedula,
    sinpeTelefono,
    sinpeEmail,
    sinpeImagen,
    pagoData,
    aceptaDatos,
    bodegaRetiro,
    cuponCodigo,
    gcCodigo,
    gcInput,
    cuponInput,
    SHIPPING_OPTIONS,
    iniciarPago,
    toWhatsAppMessage,
    validatePhone,
    validateAddress,
    validateGuestEmail,
    setGcEstado,
    setGcSaldo,
    setGcCodigo,
    setCuponEstado,
    setCuponError,
    setCuponDescuento,
    setCuponCodigo,
    setDireccionError,
    setDireccionDirty,
    setTelefonoError,
    setTelefonoDirty,
    setGuestEmailError,
    setGuestEmailDirty,
    setSinpeNombreErr,
    setSinpeCedulaErr,
    setSinpeImagenErr,
    setSinpeUploadEstado,
    setSinpeUploadError,
  } = deps

  const validarGiftCard = useCallback(async () => {
    if (!gcInput.trim() || !token) return
    setGcEstado('loading')
    try {
      const { data } = await giftCardService.validar(gcInput.trim().toUpperCase())
      if (data?.valida) {
        setGcSaldo(data.saldoActual ?? 0)
        setGcCodigo(data.codigo ?? gcInput.trim().toUpperCase())
        setGcEstado('valid')
      } else {
        setGcSaldo(0)
        setGcCodigo(null)
        setGcEstado('invalid')
      }
    } catch {
      setGcSaldo(0)
      setGcCodigo(null)
      setGcEstado('invalid')
    }
  }, [gcInput, token, setGcEstado, setGcSaldo, setGcCodigo])

  const validarCupon = useCallback(async () => {
    if (!cuponInput.trim()) return
    setCuponEstado('loading')
    setCuponError('')
    try {
      const { data } = await cuponService.validar(cuponInput.trim())
      const pct = data?.data?.descuento ?? data?.descuento ?? 0
      const cod = data?.data?.codigo ?? data?.codigo ?? cuponInput.trim().toUpperCase()
      setCuponDescuento(pct)
      setCuponCodigo(cod)
      setCuponEstado('valid')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Código inválido o no disponible'
      setCuponDescuento(0)
      setCuponCodigo(null)
      setCuponError(msg)
      setCuponEstado('invalid')
    }
  }, [cuponInput, setCuponEstado, setCuponError, setCuponDescuento, setCuponCodigo])

  const validateDomicilio = useCallback(() => {
    const op = SHIPPING_OPTIONS.find((o) => o.value === metodoEnvio)
    if (!op?.needsAddress) return true
    const dErr = validateAddress(direccion)
    setDireccionError(dErr)
    setDireccionDirty(true)
    if (token) {
      const tErr = validatePhone(telefono)
      setTelefonoError(tErr)
      setTelefonoDirty(true)
      return !tErr && !dErr
    }
    return !dErr
  }, [
    SHIPPING_OPTIONS,
    metodoEnvio,
    direccion,
    token,
    telefono,
    validateAddress,
    validatePhone,
    setDireccionError,
    setDireccionDirty,
    setTelefonoError,
    setTelefonoDirty,
  ])

  const handlePagar = useCallback(() => {
    if (!aceptaDatos) return
    if (!validateDomicilio()) return

    if (!token) {
      const eErr = validateGuestEmail(guestEmail)
      setGuestEmailError(eErr)
      setGuestEmailDirty(true)
      if (eErr) return
    }

    if (metodoPago === 'SINPE') {
      let valid = true
      if (sinpeNombre.trim()) {
        setSinpeNombreErr('')
      } else {
        setSinpeNombreErr('El nombre completo es requerido')
        valid = false
      }
      if (sinpeCedula.trim()) {
        setSinpeCedulaErr('')
      } else {
        setSinpeCedulaErr('El número de cédula es requerido')
        valid = false
      }
      if (!valid) return
    }

    authService.registrarConsentimiento('CHECKOUT')

    const phoneEfectivo = token ? telefono : guestPhone
    const opEnvio = SHIPPING_OPTIONS.find((o) => o.value === metodoEnvio)
    const notasFull = [
      notas.trim(),
      opEnvio?.needsAddress && phoneEfectivo ? `Teléfono: ${phoneEfectivo}` : '',
      opEnvio?.needsAddress && direccion ? `Dirección: ${direccion}` : '',
      metodoPago === 'SINPE' && sinpeCedula ? `Cédula: ${sinpeCedula}` : '',
      opEnvio ? `Envío: ${opEnvio.label}` : '',
    ].filter(Boolean).join(' | ')

    const isManual = metodoPago === 'SINPE' || metodoPago === 'EFECTIVO'
    analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
    iniciarPago(
      {
        bodegaId: metodoEnvio === 'RETIRO_EN_TIENDA' && bodegaRetiro ? bodegaRetiro.id : BODEGA_DEFAULT,
        metodoEnvio,
        notas: notasFull || null,
        provider: metodoPago,
        items: items.map((i) => ({ productoId: i.id, cantidad: i.cantidad })),
        codigoCupon: cuponCodigo || null,
        codigoGiftCard: gcCodigo || null,
        ...(token
          ? {}
          : {
              guestEmail: metodoPago === 'SINPE' ? (sinpeEmail.trim() || guestEmail.trim()) : guestEmail.trim(),
              guestPhone: guestPhone || sinpeTelefono || null,
            }),
      },
      !token,
      isManual,
    )
  }, [
    aceptaDatos,
    validateDomicilio,
    token,
    validateGuestEmail,
    guestEmail,
    setGuestEmailError,
    setGuestEmailDirty,
    metodoPago,
    sinpeNombre,
    sinpeCedula,
    setSinpeNombreErr,
    setSinpeCedulaErr,
    telefono,
    guestPhone,
    SHIPPING_OPTIONS,
    metodoEnvio,
    notas,
    direccion,
    sinpeEmail,
    totalFinal,
    items,
    bodegaRetiro,
    cuponCodigo,
    gcCodigo,
    sinpeTelefono,
    iniciarPago,
  ])

  const handleSinpeWhatsApp = useCallback(() => {
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
  }, [pagoData, sinpeNombre, sinpeCedula, sinpeTelefono, totalFinal])

  const handleSubirComprobante = useCallback(async () => {
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
  }, [
    sinpeImagen,
    sinpeNombre,
    sinpeCedula,
    sinpeTelefono,
    pagoData,
    token,
    sinpeEmail,
    guestEmail,
    setSinpeImagenErr,
    setSinpeUploadEstado,
    setSinpeUploadError,
  ])

  const handleWhatsApp = useCallback(() => {
    analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
    const msg = toWhatsAppMessage()
    globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }, [totalFinal, items, toWhatsAppMessage])

  return {
    validarGiftCard,
    validarCupon,
    validateDomicilio,
    handlePagar,
    handleSinpeWhatsApp,
    handleSubirComprobante,
    handleWhatsApp,
  }
}
