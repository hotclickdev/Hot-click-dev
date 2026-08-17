import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { authService } from '@/services/authService'
import { cuponService } from '@/services/cuponService'
import { giftCardService } from '@/services/giftCardService'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import { paymentService } from '@/services/paymentService'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'
import CheckoutEmpty from './checkout/CheckoutEmpty'
import CheckoutLoading from './checkout/CheckoutLoading'
import CheckoutNotes from './checkout/CheckoutNotes'
import CheckoutPaidGiftCard from './checkout/CheckoutPaidGiftCard'
import CheckoutPayError from './checkout/CheckoutPayError'
import CheckoutSinpePending from './checkout/CheckoutSinpePending'
import CheckoutSummary from './checkout/CheckoutSummary'
import ExpressCheckout from './checkout/ExpressCheckout'
import GuestContactSection from './checkout/GuestContactSection'
import PaymentMethods from './checkout/PaymentMethods'
import ShippingSection from './checkout/ShippingSection'
import {
  BODEGA_DEFAULT,
  SHIPPING_COSTS,
  WHATSAPP,
  bodegaRetiroDesdeItems,
  opcionesEnvio,
  validateAddress as mensajeDireccion,
  validateGuestEmail as mensajeEmailInvitado,
  validatePhone as mensajeTelefono,
} from './checkout/checkoutHelpers'

export default function CheckoutPage() {
  const { items, total, toWhatsAppMessage } = useCartStore()
  const { token }                    = useAuthStore()
  const { estado, pagoData, error, intentos, maxIntentos, iniciarPago } = usePayment()
  const errorBannerRef = useRef(null)
  const { t } = useTranslation()

  // "Retiro en tienda" solo se ofrece cuando el carrito completo pertenece a
  // una única bodega y ese negocio habilitó retiro de clientes — evita
  // prometer un punto de entrega cuando el pedido mezcla varios negocios.
  const bodegaRetiro = bodegaRetiroDesdeItems(items)
  const SHIPPING_OPTIONS = opcionesEnvio(bodegaRetiro)

  const [metodoEnvio,  setMetodoEnvio]  = useState(bodegaRetiro ? 'RETIRO_EN_TIENDA' : 'ENVIO_NORMAL_GAM')
  const [metodoPago,   setMetodoPago]   = useState('SINPE')

  // Si el carrito cambia (se agrega un producto de otro negocio, se quita el
  // único ítem, etc.) y el método elegido deja de estar disponible, recae en
  // la primera opción restante.
  useEffect(() => {
    if (!SHIPPING_OPTIONS.some((o) => o.value === metodoEnvio)) {
      // Recae al primer método disponible si el carrito ya no ofrece el elegido.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMetodoEnvio(SHIPPING_OPTIONS[0]?.value ?? 'ENVIO_NORMAL_GAM')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  function validatePhone(v) {
    return mensajeTelefono(v, t)
  }
  function validateAddress(v) {
    return mensajeDireccion(v, t)
  }

  const [notas,        setNotas]        = useState('')

  // SINPE — datos del remitente (se capturan ANTES del pago)
  const [sinpeNombre,     setSinpeNombre]     = useState('')
  const [sinpeCedula,     setSinpeCedula]     = useState('')
  const [sinpeTelefono,   setSinpeTelefono]   = useState('')
  const [sinpeEmail,      setSinpeEmail]      = useState('')
  const [sinpeNombreErr,  setSinpeNombreErr]  = useState('')
  const [sinpeCedulaErr,  setSinpeCedulaErr]  = useState('')

  // SINPE — comprobante (se sube DESPUÉS de crear el pedido)
  const [sinpeImagen,         setSinpeImagen]         = useState(null)
  const [sinpeImagenErr,      setSinpeImagenErr]      = useState('')
  const [sinpeUploadEstado,   setSinpeUploadEstado]   = useState('idle') // idle | uploading | done | error
  const [sinpeUploadError,    setSinpeUploadError]    = useState('')
  const sinpeInputRef = useRef(null)

  // Domicilio fields
  const [telefono,       setTelefono]       = useState('')
  const [telefonoError,  setTelefonoError]  = useState('')
  const [telefonoDirty,  setTelefonoDirty]  = useState(false)
  const [direccion,      setDireccion]      = useState('')
  const [direccionError, setDireccionError] = useState('')
  const [direccionDirty, setDireccionDirty] = useState(false)

  // Invitado — datos de contacto cuando no hay sesión
  const [guestEmail,      setGuestEmail]      = useState('')
  const [guestEmailError, setGuestEmailError] = useState('')
  const [guestEmailDirty, setGuestEmailDirty] = useState(false)
  const [guestPhone,      setGuestPhone]      = useState('')

  // Cupón de descuento
  const [cuponInput,    setCuponInput]    = useState('')
  const [cuponEstado,   setCuponEstado]   = useState('idle') // idle | loading | valid | invalid
  const [cuponDescuento, setCuponDescuento] = useState(0)   // porcentaje aplicado
  const [cuponCodigo,   setCuponCodigo]   = useState(null)  // código validado
  const [cuponError,    setCuponError]    = useState('')    // mensaje de error del servidor

  // Gift card
  const [gcInput,     setGcInput]     = useState('')
  const [gcEstado,    setGcEstado]    = useState('idle') // idle | loading | valid | invalid
  const [gcSaldo,     setGcSaldo]     = useState(0)      // saldo disponible
  const [gcCodigo,    setGcCodigo]    = useState(null)   // código validado
  const [aceptaDatos, setAceptaDatos] = useState(false)

  function validateGuestEmail(v) {
    return mensajeEmailInvitado(v, t)
  }

  // Limpiar carrito al confirmar pedido (gift card o SINPE registrado)
  const { clearCart: clearCartFn } = useCartStore()
  useEffect(() => {
    if (estado === 'gift_card_paid' || estado === 'sinpe_pendiente') clearCartFn()
  }, [estado, clearCartFn])

  // Scroll al inicio al llegar desde /carrito (React Router no lo hace automáticamente)
  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Scroll al inicio solo cuando se cambia a una PANTALLA COMPLETA diferente.
  // Para 'failed' el usuario permanece en el formulario — desplazamos al banner de error.
  useEffect(() => {
    if (estado === 'sinpe_pendiente' || estado === 'gift_card_paid') {
      globalThis.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (estado === 'failed') {
      // Llevar el foco al banner de error, no al inicio de la página
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [estado])

  const costoEnvio     = SHIPPING_COSTS[metodoEnvio] ?? 0
  const subtotalCart   = total()
  const descuentoMonto = cuponDescuento > 0 ? Math.round(subtotalCart * cuponDescuento / 100) : 0
  const baseConCupon   = subtotalCart - descuentoMonto + costoEnvio
  const gcAplicado     = gcSaldo > 0 ? Math.min(gcSaldo, baseConCupon) : 0
  const totalFinal     = baseConCupon - gcAplicado

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
        setGcSaldo(0); setGcCodigo(null); setGcEstado('invalid')
      }
    } catch {
      setGcSaldo(0); setGcCodigo(null); setGcEstado('invalid')
    }
  }, [gcInput, token])

  const validarCupon = useCallback(async () => {
    if (!cuponInput.trim()) return
    setCuponEstado('loading')
    setCuponError('')
    try {
      const { data } = await cuponService.validar(cuponInput.trim())
      const pct = data?.data?.descuento ?? data?.descuento ?? 0
      const cod = data?.data?.codigo    ?? data?.codigo    ?? cuponInput.trim().toUpperCase()
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
  }, [cuponInput])

  // Validate domicilio fields before pay
  const validateDomicilio = useCallback(() => {
    const op = SHIPPING_OPTIONS.find(o => o.value === metodoEnvio)
    if (!op?.needsAddress) return true
    const dErr = validateAddress(direccion)
    setDireccionError(dErr)
    setDireccionDirty(true)
    // Teléfono solo se valida para usuarios con sesión; invitados usan guestPhone
    if (token) {
      const tErr = validatePhone(telefono)
      setTelefonoError(tErr)
      setTelefonoDirty(true)
      return !tErr && !dErr
    }
    return !dErr
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SHIPPING_OPTIONS y validadores se derivan del render actual
  }, [metodoEnvio, telefono, direccion, token])

  const handlePagar = () => {
    if (!aceptaDatos) return
    if (!validateDomicilio()) return

    // Validar email de invitado si no hay sesión
    if (!token) {
      const eErr = validateGuestEmail(guestEmail)
      setGuestEmailError(eErr)
      setGuestEmailDirty(true)
      if (eErr) return
    }

    // Validar datos requeridos para SINPE
    if (metodoPago === 'SINPE') {
      let valid = true
      if (sinpeNombre.trim()) { setSinpeNombreErr('') }
      else { setSinpeNombreErr('El nombre completo es requerido'); valid = false }
      if (sinpeCedula.trim()) { setSinpeCedulaErr('') }
      else { setSinpeCedulaErr('El número de cédula es requerido'); valid = false }
      if (!valid) return
    }

    authService.registrarConsentimiento('CHECKOUT')

    const phoneEfectivo = token ? telefono : guestPhone
    const opEnvio = SHIPPING_OPTIONS.find(o => o.value === metodoEnvio)
    const notasFull = [
      notas.trim(),
      opEnvio?.needsAddress && phoneEfectivo ? `Teléfono: ${phoneEfectivo}` : '',
      opEnvio?.needsAddress && direccion ? `Dirección: ${direccion}` : '',
      metodoPago === 'SINPE' && sinpeCedula ? `Cédula: ${sinpeCedula}` : '',
      opEnvio ? `Envío: ${opEnvio.label}` : '',
    ].filter(Boolean).join(' | ')

    const isManual = metodoPago === 'SINPE' || metodoPago === 'EFECTIVO'
    analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
    iniciarPago({
      bodegaId:    metodoEnvio === 'RETIRO_EN_TIENDA' && bodegaRetiro ? bodegaRetiro.id : BODEGA_DEFAULT,
      metodoEnvio,
      notas:       notasFull || null,
      provider:    metodoPago,
      items: items.map((i) => ({ productoId: i.id, cantidad: i.cantidad })),
      codigoCupon:    cuponCodigo || null,
      codigoGiftCard: gcCodigo   || null,
      ...(token ? {} : {
        guestEmail: metodoPago === 'SINPE'
          ? (sinpeEmail.trim() || guestEmail.trim())
          : guestEmail.trim(),
        guestPhone: guestPhone || sinpeTelefono || null,
      }),
    }, !token, isManual)
  }

  const handleSinpeWhatsApp = () => {
    const numeroPedido = pagoData?.numeroPedido ?? ''
    const msg = encodeURIComponent(
      `Hola HotClick 👋\n\n*Comprobante SINPE Móvil*\n\n` +
      `Nombre: ${sinpeNombre || '(sin nombre)'}\n` +
      (sinpeCedula ? `Cédula: ${sinpeCedula}\n` : '') +
      (sinpeTelefono ? `Teléfono: ${sinpeTelefono}\n` : '') +
      (numeroPedido ? `Pedido: ${numeroPedido}\n` : '') +
      `Monto: ${formatPrice(totalFinal)}\n\n` +
      `_Ya subí el comprobante en la web. ¡Gracias!_`
    )
    globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  const handleSubirComprobante = async () => {
    if (!sinpeImagen) { setSinpeImagenErr('Debes adjuntar una imagen del comprobante'); return }
    setSinpeImagenErr('')
    setSinpeUploadEstado('uploading')
    setSinpeUploadError('')

    const fd = new FormData()
    fd.append('imagen', sinpeImagen)
    fd.append('nombreRemitente', sinpeNombre)
    if (sinpeCedula)   fd.append('cedulaRemitente',   sinpeCedula)
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

  const handleWhatsApp = () => {
    analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
    const msg = toWhatsAppMessage()
    globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  if (items.length === 0) return <CheckoutEmpty />

  if (estado === 'sinpe_pendiente') {
    return (
      <CheckoutSinpePending
        pagoData={pagoData}
        totalFinal={totalFinal}
        sinpeNombre={sinpeNombre}
        sinpeCedula={sinpeCedula}
        sinpeTelefono={sinpeTelefono}
        sinpeImagen={sinpeImagen}
        setSinpeImagen={setSinpeImagen}
        sinpeImagenErr={sinpeImagenErr}
        setSinpeImagenErr={setSinpeImagenErr}
        sinpeUploadEstado={sinpeUploadEstado}
        setSinpeUploadEstado={setSinpeUploadEstado}
        sinpeUploadError={sinpeUploadError}
        setSinpeUploadError={setSinpeUploadError}
        sinpeInputRef={sinpeInputRef}
        onSubirComprobante={handleSubirComprobante}
        onSinpeWhatsApp={handleSinpeWhatsApp}
      />
    )
  }

  if (estado === 'gift_card_paid') return <CheckoutPaidGiftCard pagoData={pagoData} />

  if (estado === 'redirecting' || estado === 'loading') {
    return <CheckoutLoading estado={estado} />
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Stepper */}
        <CheckoutStepper activeStep="checkout" />

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link to="/carrito" className="text-sm transition-colors hover:text-[#4f7cff]" style={{ color: 'var(--hc-muted)' }}>
            ← {t('checkout.backToCart')}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2" style={{ color: 'var(--hc-text)' }}>{t('checkout.title')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ── Formulario ── */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">

            {!token && (
              <GuestContactSection
                guestEmail={guestEmail}
                setGuestEmail={setGuestEmail}
                guestEmailError={guestEmailError}
                setGuestEmailError={setGuestEmailError}
                guestEmailDirty={guestEmailDirty}
                setGuestEmailDirty={setGuestEmailDirty}
                guestPhone={guestPhone}
                setGuestPhone={setGuestPhone}
              />
            )}

            <ExpressCheckout onWhatsApp={handleWhatsApp} />

            <ShippingSection
              opciones={SHIPPING_OPTIONS}
              metodoEnvio={metodoEnvio}
              setMetodoEnvio={setMetodoEnvio}
              metodoPago={metodoPago}
              setMetodoPago={setMetodoPago}
              token={token}
              telefono={telefono}
              setTelefono={setTelefono}
              telefonoError={telefonoError}
              setTelefonoError={setTelefonoError}
              telefonoDirty={telefonoDirty}
              direccion={direccion}
              setDireccion={setDireccion}
              direccionError={direccionError}
              setDireccionError={setDireccionError}
              direccionDirty={direccionDirty}
              setDireccionDirty={setDireccionDirty}
            />

            <PaymentMethods
              metodoEnvio={metodoEnvio}
              metodoPago={metodoPago}
              setMetodoPago={setMetodoPago}
              token={token}
              sinpeNombre={sinpeNombre}
              setSinpeNombre={setSinpeNombre}
              sinpeNombreErr={sinpeNombreErr}
              setSinpeNombreErr={setSinpeNombreErr}
              sinpeCedula={sinpeCedula}
              setSinpeCedula={setSinpeCedula}
              sinpeCedulaErr={sinpeCedulaErr}
              setSinpeCedulaErr={setSinpeCedulaErr}
              sinpeTelefono={sinpeTelefono}
              setSinpeTelefono={setSinpeTelefono}
              sinpeEmail={sinpeEmail}
              setSinpeEmail={setSinpeEmail}
            />

            <CheckoutNotes notas={notas} setNotas={setNotas} />

            <CheckoutPayError
              estado={estado}
              error={error}
              intentos={intentos}
              maxIntentos={maxIntentos}
              onPagar={handlePagar}
              toWhatsAppMessage={toWhatsAppMessage}
              errorBannerRef={errorBannerRef}
            />
          </div>

          {/* ── Resumen ── */}
          <div className="lg:col-span-1">
            <CheckoutSummary
              items={items}
              token={token}
              gcInput={gcInput}
              setGcInput={setGcInput}
              gcEstado={gcEstado}
              setGcEstado={setGcEstado}
              setGcSaldo={setGcSaldo}
              setGcCodigo={setGcCodigo}
              gcSaldo={gcSaldo}
              gcCodigo={gcCodigo}
              validarGiftCard={validarGiftCard}
              cuponInput={cuponInput}
              setCuponInput={setCuponInput}
              cuponEstado={cuponEstado}
              setCuponEstado={setCuponEstado}
              setCuponDescuento={setCuponDescuento}
              setCuponCodigo={setCuponCodigo}
              setCuponError={setCuponError}
              cuponDescuento={cuponDescuento}
              cuponError={cuponError}
              validarCupon={validarCupon}
              subtotalCart={subtotalCart}
              descuentoMonto={descuentoMonto}
              gcAplicado={gcAplicado}
              costoEnvio={costoEnvio}
              totalFinal={totalFinal}
              metodoPago={metodoPago}
              aceptaDatos={aceptaDatos}
              setAceptaDatos={setAceptaDatos}
              estado={estado}
              intentos={intentos}
              maxIntentos={maxIntentos}
              onPagar={handlePagar}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
