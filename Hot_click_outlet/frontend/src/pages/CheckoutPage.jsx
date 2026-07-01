import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { registrarConsentimiento } from '@/services/api'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import { paymentService } from '@/services/paymentService'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'
import PhoneField from '@/components/ui/PhoneField'
import { isValidEmail } from '@/utils/validators'

const BODEGA_DEFAULT = 1
const WHATSAPP = '50686667888'
const SINPE_NUMERO = '8666-7888'
const SINPE_TITULAR = 'Andrés Zúñiga (HotClick)'

function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length >= 5 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
}

// ── SmartField component ────────────────────────────────────────────────────
function SmartField({ label, id, value, onChange, onBlur, error, success, placeholder, type = 'text', maxLength, multiline, rows = 3, helpText }) {
  const Tag = multiline ? 'textarea' : 'input'
  const labelSuccessColor = success ? '#34d399' : 'var(--hc-muted)'
  const labelColor = error ? '#f87171' : labelSuccessColor
  const autoCompleteForEmail = type === 'email' ? 'email' : 'off'
  const autoCompleteValue = type === 'tel' ? 'tel' : autoCompleteForEmail
  const borderSuccess = success ? '1.5px solid #34d399' : '1.5px solid var(--hc-border)'
  const borderColor = error ? '1.5px solid #f87171' : borderSuccess
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium" style={{ color: labelColor }}>
        {label}
      </label>
      <div className="relative">
        <Tag
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={multiline ? rows : undefined}
          autoComplete={autoCompleteValue}
          className="w-full rounded-xl px-4 py-3 text-sm bg-white/5 outline-none transition-all duration-200 resize-none"
          style={{
            color: 'var(--hc-text)',
            border: borderColor,
          }}
          onFocus={(e) => { e.target.style.borderColor = error ? '#f87171' : 'var(--hc-accent)'; e.target.style.boxShadow = error ? '0 0 0 3px rgba(248,113,113,0.1)' : '0 0 0 3px rgba(23,71,168,0.12)' }}
          onBlurCapture={(e) => { e.target.style.boxShadow = '' }}
        />
        {!multiline && (success || error) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {success && !error && (
              <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </motion.svg>
            )}
            {error && (
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {error && (
          <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-xs text-red-400 flex items-center gap-1">
            {error}
          </motion.p>
        )}
        {!error && helpText && (
          <motion.p key="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {helpText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CheckoutPage() {
  const { items, total, toWhatsAppMessage } = useCartStore()
  const { token }                    = useAuthStore()
  const { estado, pagoData, error, intentos, maxIntentos, iniciarPago } = usePayment()
  const errorBannerRef = useRef(null)
  const { t } = useTranslation()

  const SHIPPING_COSTS = {
    RETIRO_EN_TIENDA:       0,
    ENCOMIENDA_PROPIA:   2500,
    ENVIO_NORMAL_GAM:    4000,
    ENVIO_NORMAL_FUERA_GAM: 4000,
    ENVIO_RAPIDO:        5000,
  }

  const SHIPPING_OPTIONS = [
    {
      value: 'RETIRO_EN_TIENDA',
      label: 'Retiro en punto HotClick',
      sub: 'Gratis · Coordinamos el punto de entrega',
      precio: 0,
      badge: null,
      needsAddress: false,
    },
    {
      value: 'ENCOMIENDA_PROPIA',
      label: 'Tu encomienda preferida',
      sub: 'Te entregamos en el punto de tu mensajero o encomienda favorita',
      precio: 2500,
      badge: null,
      needsAddress: true,
    },
    {
      value: 'ENVIO_NORMAL_GAM',
      label: 'Envío Normal — GAM',
      sub: '2–4 días hábiles · Incluye número de rastreo',
      precio: 4000,
      badge: null,
      needsAddress: true,
    },
    {
      value: 'ENVIO_NORMAL_FUERA_GAM',
      label: 'Envío Normal — Fuera de la GAM',
      sub: '3–4 días hábiles · Incluye número de rastreo',
      precio: 4000,
      badge: null,
      needsAddress: true,
    },
    {
      value: 'ENVIO_RAPIDO',
      label: 'Envío Rápido (Express)',
      sub: '30 min – 2 horas en la GAM · Pago previo obligatorio',
      precio: 5000,
      badge: 'Pago previo',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      needsAddress: true,
    },
  ]

  const [metodoEnvio,  setMetodoEnvio]  = useState('RETIRO_EN_TIENDA')
  const [metodoPago,   setMetodoPago]   = useState('SINPE')

  // SINPE Móvil siempre primero, con su beneficio explícito (Brand Book §15.4)
  const METODOS_PAGO = [
    {
      id: 'SINPE',
      label: 'SINPE Móvil',
      descripcion: 'Transferencia directa · Se verifica en minutos',
      badge: 'Sin comisión',
      badgeColor: 'bg-[var(--hc-success)]/15 text-[var(--hc-success)] border-[var(--hc-success)]/30',
      icon: SinpeIcon,
      disabled: false,
    },
    {
      id: 'EFECTIVO',
      label: 'Efectivo contra entrega',
      descripcion: 'Pagás en efectivo al recibir tu pedido',
      badge: 'Sin costo extra',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: EfectivoIcon,
      disabled: metodoEnvio === 'ENVIO_RAPIDO',
      disabledReason: 'El envío rápido requiere pago previo',
    },
    {
      id: 'STRIPE',
      label: 'Visa / Mastercard',
      descripcion: 'Pagos con tarjeta · Próximamente disponible',
      badge: 'Próximamente',
      badgeColor: 'bg-[var(--hc-blue-500)]/20 text-[var(--hc-blue-400)] border-[var(--hc-blue-500)]/30',
      icon: CardIcon,
      disabled: true,
      disabledReason: 'Disponible próximamente',
    },
  ]

  function validatePhone(v) {
    const d = v.replace(/\D/g, '')
    if (!v.trim()) return t('checkout.phoneRequired')
    if (d.length < 8) return t('checkout.phoneInvalid')
    return ''
  }
  function validateAddress(v) {
    if (!v.trim()) return t('checkout.addressRequired')
    if (v.trim().length < 10) return t('checkout.addressMin')
    return ''
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
    if (!v.trim()) return t('checkout.guestEmailRequired')
    if (!isValidEmail(v)) return t('checkout.guestEmailInvalid')
    return ''
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
      const { data } = await import('@/services/api').then(m => m.default.get(`/gift-cards/validar?codigo=${encodeURIComponent(gcInput.trim().toUpperCase())}`))
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
      const { data } = await import('@/services/api').then(m => m.default.get(`/cupones/validar?codigo=${encodeURIComponent(cuponInput.trim())}`))
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

    registrarConsentimiento('CHECKOUT')

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
      bodegaId:    BODEGA_DEFAULT,
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

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-[#e8e8ed] text-lg mb-4">{t('checkout.cartEmpty')}</p>
          <Link to="/productos" className="px-6 py-2.5 rounded-xl bg-[#4f7cff] text-white font-medium">
            {t('checkout.continueShopping')}
          </Link>
        </div>
      </MainLayout>
    )
  }

  if (estado === 'sinpe_pendiente') {
    const esEfectivo = pagoData?.proveedor === 'EFECTIVO'
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto px-4 py-14">
          <CheckoutStepper activeStep="checkout" />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-7 space-y-6 mt-8"
            style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>
                  {esEfectivo ? '¡Pedido registrado!' : 'Pedido registrado — realizá tu SINPE'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {esEfectivo
                    ? 'Pagás en efectivo cuando recibas tu pedido — monto exacto'
                    : 'Transferí el monto exacto y subí la foto del comprobante'}
                </p>
              </div>
            </div>

            {/* Efectivo contra entrega — pantalla simplificada */}
            {esEfectivo && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="rounded-xl p-5 space-y-3" style={{ background: 'color-mix(in srgb, #f59e0b 6%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
                  <p className="text-xs font-semibold text-amber-400">DETALLES DEL PAGO</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--hc-muted)' }}>💵 Método</span>
                    <span className="font-semibold text-amber-300">Efectivo contra entrega</span>
                  </div>
                  {pagoData?.numeroPedido && (
                    <div className="flex justify-between items-center text-sm">
                      <span style={{ color: 'var(--hc-muted)' }}>🔖 Pedido</span>
                      <span className="font-mono font-semibold text-[#4f7cff]">{pagoData.numeroPedido}</span>
                    </div>
                  )}
                  <div className="border-t pt-3" style={{ borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold" style={{ color: 'var(--hc-muted)' }}>💰 Monto EXACTO a pagar</span>
                      <span className="font-bold text-2xl text-amber-300">{formatPrice(totalFinal)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5 p-3.5 rounded-xl" style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}>
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs leading-relaxed text-emerald-300/90">
                    Nuestro repartidor llevará tu pedido y cobrará el monto exacto en efectivo. Te avisamos por WhatsApp antes de salir.
                  </p>
                </div>
                <button
                  onClick={handleSinpeWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/18"
                >
                  <WhatsAppIcon />
                  Notificar también por WhatsApp
                </button>
                <a href="/mis-pedidos" className="block text-xs text-center text-[#4f7cff] hover:underline mt-1">
                  Ver mis pedidos →
                </a>
              </motion.div>
            )}

            {/* SINPE flow — solo si no es efectivo */}
            {!esEfectivo && <>

            {/* Datos del remitente */}
            <div className="rounded-xl p-4 space-y-1.5 text-sm" style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>TUS DATOS DE TRANSFERENCIA</p>
              {sinpeNombre   && <div className="flex justify-between"><span style={{ color: 'var(--hc-muted)' }}>👤 Nombre</span><span style={{ color: 'var(--hc-text)' }}>{sinpeNombre}</span></div>}
              {sinpeCedula   && <div className="flex justify-between"><span style={{ color: 'var(--hc-muted)' }}>🪪 Cédula</span><span style={{ color: 'var(--hc-text)' }}>{sinpeCedula}</span></div>}
              {sinpeTelefono && <div className="flex justify-between"><span style={{ color: 'var(--hc-muted)' }}>📞 Teléfono</span><span style={{ color: 'var(--hc-text)' }}>{sinpeTelefono}</span></div>}
            </div>

            {/* SINPE Info card */}
            <div className="rounded-xl p-5 space-y-3" style={{ background: 'color-mix(in srgb, #10b981 6%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}>
              <p className="text-xs font-semibold text-emerald-400">REALIZÁ LA TRANSFERENCIA A:</p>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--hc-muted)' }}>📱 Número SINPE</span>
                <span className="font-bold text-xl tracking-widest text-emerald-300">{SINPE_NUMERO}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--hc-muted)' }}>👤 Titular</span>
                <span className="font-medium" style={{ color: 'var(--hc-text)' }}>{SINPE_TITULAR}</span>
              </div>
              {pagoData?.numeroPedido && (
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--hc-muted)' }}>🔖 Referencia</span>
                  <span className="font-mono font-semibold text-[#4f7cff]">{pagoData.numeroPedido}</span>
                </div>
              )}
              <div className="border-t pt-3" style={{ borderColor: 'color-mix(in srgb, #10b981 20%, transparent)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold" style={{ color: 'var(--hc-muted)' }}>💰 Monto EXACTO</span>
                  <span className="font-bold text-2xl text-emerald-300">{formatPrice(totalFinal)}</span>
                </div>
              </div>
            </div>

            {/* Subir comprobante obligatorio */}
            {sinpeUploadEstado !== 'done' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">!</span>
                  <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                    Subir comprobante <span className="text-red-400">*</span>
                  </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  Adjuntá una foto o captura del comprobante SINPE. Solo imágenes (JPG, PNG, WebP).
                </p>

                <input
                  ref={sinpeInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    setSinpeImagen(e.target.files?.[0] ?? null)
                    setSinpeImagenErr('')
                    setSinpeUploadEstado('idle')
                    setSinpeUploadError('')
                  }}
                />
                <button
                  onClick={() => sinpeInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-medium transition-all border-dashed border-2"
                  style={sinpeImagen
                    ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                    : { borderColor: sinpeImagenErr ? '#f87171' : 'var(--hc-border)', color: sinpeImagenErr ? '#f87171' : 'var(--hc-muted)' }}
                >
                  {sinpeImagen ? (
                    <>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {sinpeImagen.name}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Seleccionar imagen del comprobante
                    </>
                  )}
                </button>
                {sinpeImagenErr && <p className="text-xs text-red-400">{sinpeImagenErr}</p>}

                {/* Preview de imagen seleccionada */}
                {sinpeImagen && (
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--hc-border)' }}>
                    <img
                      src={URL.createObjectURL(sinpeImagen)}
                      alt="Vista previa del comprobante"
                      className="w-full max-h-48 object-contain bg-black/20"
                    />
                  </div>
                )}

                {sinpeUploadError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {sinpeUploadError}
                  </p>
                )}

                <button
                  onClick={handleSubirComprobante}
                  disabled={sinpeUploadEstado === 'uploading'}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'var(--hc-accent)', color: '#fff' }}
                >
                  {sinpeUploadEstado === 'uploading' ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Subiendo comprobante…</>
                  ) : (
                    <><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Enviar comprobante</>
                  )}
                </button>
              </div>
            ) : (
              /* Estado: comprobante subido con éxito */
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-5 space-y-3 text-center"
                style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-emerald-400">¡Comprobante recibido!</p>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  Un administrador verificará tu pago y activará tu pedido. Te avisamos por correo.
                </p>
                <button
                  onClick={handleSinpeWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/18"
                >
                  <WhatsAppIcon />
                  Notificar también por WhatsApp
                </button>
                <a href="/mis-pedidos" className="block text-xs text-[#4f7cff] hover:underline mt-1">
                  Ver mis pedidos →
                </a>
              </motion.div>
            )}

            {/* Nota — solo para SINPE */}
            {!esEfectivo && (
              <div className="flex gap-2.5 p-3.5 rounded-xl" style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs leading-relaxed text-amber-300/90">
                  Tu pago será <strong>verificado por un administrador</strong>. El pedido expira en 72 horas si no se confirma.
                </p>
              </div>
            )}
            </>}
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  if (estado === 'gift_card_paid') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>¡Pedido confirmado!</p>
            <p className="text-sm mt-2" style={{ color: 'var(--hc-muted)' }}>Tu pedido fue pagado en su totalidad con la gift card.</p>
          </div>
          {pagoData?.numeroPedido && (
            <div className="rounded-2xl p-5 w-full" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Número de pedido</p>
              <p className="text-xl font-bold mt-1 text-[#4f7cff]">{pagoData.numeroPedido}</p>
            </div>
          )}
          <a href="/mis-pedidos" className="px-6 py-3 rounded-xl font-semibold text-sm bg-[#4f7cff] text-white hover:bg-[#3d6ee0] transition-colors">
            Ver mis pedidos
          </a>
        </div>
      </MainLayout>
    )
  }

  if (estado === 'redirecting' || estado === 'loading') {
    const msg = estado === 'redirecting'
      ? t('checkout.redirectingPayment', { defaultValue: 'Redirigiendo al pago seguro…' })
      : t('checkout.preparing')
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
          <p className="text-[#e8e8ed] text-lg font-medium">{msg}</p>
          <p className="text-[#8e8e9a] text-sm">{t('checkout.dontClose')}</p>
        </div>
      </MainLayout>
    )
  }

  const gcInvalidBorder = gcEstado === 'invalid' ? '#f87171' : 'var(--hc-border)'
  const gcBorderColor = gcEstado === 'valid' ? '#10b981' : gcInvalidBorder
  const cuponInvalidBorder = cuponEstado === 'invalid' ? '#f87171' : 'var(--hc-border)'
  const cuponBorderColor = cuponEstado === 'valid' ? '#10b981' : cuponInvalidBorder
  const payMethodIconFallback = metodoPago === 'EFECTIVO' ? <EfectivoIcon selected /> : <LockIcon />
  const payMethodIcon = metodoPago === 'SINPE' ? <SinpeIcon selected /> : payMethodIconFallback
  const payEfectivoLabel = `Confirmar pedido · ${formatPrice(totalFinal)} en efectivo`
  const payLabelFallback = metodoPago === 'EFECTIVO' ? payEfectivoLabel : `Pagá ${formatPrice(totalFinal)}`
  const payLabel = metodoPago === 'SINPE' ? `Pagá con SINPE · ${formatPrice(totalFinal)}` : payLabelFallback

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

            {/* ── Datos de contacto (solo invitados) ── */}
            {!token && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
                style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-accent)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.guestSection')}</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('checkout.guestSectionSub')}</p>
                  </div>
                  <Link
                    to="/login"
                    className="text-xs font-medium text-[#4f7cff] hover:underline shrink-0 ml-4"
                  >
                    {t('checkout.guestLoginLink')}
                  </Link>
                </div>

                <SmartField
                  id="guestEmail"
                  label={t('checkout.guestEmail')}
                  type="email"
                  value={guestEmail}
                  placeholder="tu@correo.com"
                  error={guestEmailDirty ? guestEmailError : ''}
                  success={guestEmailDirty && !guestEmailError && guestEmail.trim().length > 0}
                  onChange={(e) => {
                    setGuestEmail(e.target.value)
                    if (guestEmailDirty) setGuestEmailError(validateGuestEmail(e.target.value))
                  }}
                  onBlur={() => { setGuestEmailDirty(true); setGuestEmailError(validateGuestEmail(guestEmail)) }}
                />

                <PhoneField
                  label={t('checkout.guestPhone')}
                  value={guestPhone}
                  onChange={setGuestPhone}
                  hint={t('checkout.guestPhoneHelp')}
                />
              </motion.div>
            )}

            {/* Express Checkout */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{t('checkout.expressPayment')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* WhatsApp — functional */}
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-all bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/18 hover:border-emerald-500/40"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </button>

                {/* Apple Pay — placeholder */}
                <div className="relative flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border cursor-not-allowed opacity-40"
                  style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}
                  title={t('checkout.comingSoon')}
                >
                  <ApplePayIcon />
                  Apple Pay
                  <span className="absolute -top-2 -right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30">
                    {t('checkout.comingSoon')}
                  </span>
                </div>

                {/* Google Pay — placeholder */}
                <div className="relative flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border cursor-not-allowed opacity-40"
                  style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}
                  title={t('checkout.comingSoon')}
                >
                  <GooglePayIcon />
                  Google Pay
                  <span className="absolute -top-2 -right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30">
                    {t('checkout.comingSoon')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('checkout.orPayWith')}</span>
                <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
              </div>
            </motion.div>

            {/* Método de envío */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.deliveryMethod')}</h2>
              <div className="space-y-2">
                {SHIPPING_OPTIONS.map((op) => (
                  <label
                    key={op.value}
                    className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200"
                    style={metodoEnvio === op.value
                      ? { borderColor: 'var(--hc-accent)', background: 'color-mix(in srgb, var(--hc-accent) 6%, transparent)' }
                      : { borderColor: 'var(--hc-border)' }}
                  >
                    <input
                      type="radio" name="envio" value={op.value}
                      checked={metodoEnvio === op.value}
                      onChange={() => {
                        setMetodoEnvio(op.value)
                        if (op.value === 'ENVIO_RAPIDO' && metodoPago === 'EFECTIVO') setMetodoPago('SINPE')
                      }}
                      className="accent-[#4f7cff]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>{op.label}</p>
                        {op.badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${op.badgeColor}`}>
                            {op.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{op.sub}</p>
                    </div>
                    <span className={`font-semibold text-sm shrink-0 ${op.precio === 0 ? 'text-[#4f7cff]' : ''}`}
                      style={op.precio === 0 ? {} : { color: 'var(--hc-text)' }}>
                      {op.precio === 0 ? 'Gratis' : formatPrice(op.precio)}
                    </span>
                  </label>
                ))}

                {/* Internacional — enlace a WhatsApp */}
                <a
                  href="https://wa.me/50686667888?text=Hola%20HotClick%2C%20quiero%20realizar%20un%20env%C3%ADo%20internacional"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:opacity-80"
                  style={{ borderColor: 'var(--hc-border)', borderStyle: 'dashed' }}
                >
                  <span className="text-lg">✈️</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>Envío Internacional</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Disponible · Consultá precio por WhatsApp</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#25D366' }}>Consultar →</span>
                </a>
              </div>

              {/* Domicilio fields — animate in */}
              <AnimatePresence>
                {SHIPPING_OPTIONS.find(o => o.value === metodoEnvio)?.needsAddress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden pt-2"
                  >
                    <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />
                    <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
                      {t('checkout.deliveryData')}
                    </p>
                    {token && (
                      <PhoneField
                        label={t('checkout.phoneContact')}
                        value={telefono}
                        onChange={(val) => {
                          setTelefono(val)
                          if (telefonoDirty) setTelefonoError(validatePhone(val))
                        }}
                        error={telefonoDirty ? telefonoError : ''}
                        hint={t('checkout.phoneHelp')}
                        required
                      />
                    )}
                    <SmartField
                      id="direccion"
                      label={t('checkout.addressLabel')}
                      multiline
                      rows={3}
                      value={direccion}
                      placeholder={t('checkout.addressPlaceholder')}
                      error={direccionDirty ? direccionError : ''}
                      success={direccionDirty && !direccionError && direccion.trim().length >= 10}
                      helpText={t('checkout.charCount', { count: direccion.length, max: 200 })}
                      maxLength={200}
                      onChange={(e) => {
                        setDireccion(e.target.value)
                        if (direccionDirty) setDireccionError(validateAddress(e.target.value))
                      }}
                      onBlur={() => { setDireccionDirty(true); setDireccionError(validateAddress(direccion)) }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Método de pago */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.paymentMethod')}</h2>
              <div className="space-y-3">
                {METODOS_PAGO.map((mp) => {
                  const Icon = mp.icon
                  const selected = metodoPago === mp.id
                  return (
                    <label
                      key={mp.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${mp.disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={selected && !mp.disabled
                        ? { borderColor: 'var(--hc-accent)', boxShadow: 'inset 0 0 0 1px var(--hc-accent)', background: 'var(--hc-info-bg)' }
                        : { borderColor: 'var(--hc-border)' }}
                      title={mp.disabled ? mp.disabledReason : undefined}
                    >
                      <input
                        type="radio" name="pago" value={mp.id}
                        checked={selected}
                        disabled={mp.disabled}
                        onChange={() => !mp.disabled && setMetodoPago(mp.id)}
                        className="accent-[var(--hc-accent)] shrink-0"
                      />
                      <div className="w-10 h-7 flex items-center justify-center shrink-0">
                        <Icon selected={selected} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>{mp.label}</p>
                          {mp.badge && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mp.badgeColor}`}>
                              {mp.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{mp.descripcion}</p>
                      </div>
                      {selected && !mp.disabled && (
                        <div className="w-4 h-4 rounded-full bg-[var(--hc-accent)] flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>

              {metodoPago === 'EFECTIVO' && (
                <div className="p-3 rounded-xl" style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
                  <p className="text-xs leading-relaxed text-amber-300/90">
                    💵 Tenés que tener el monto exacto disponible al recibir el pedido. Nuestro repartidor no maneja cambio.
                  </p>
                </div>
              )}


              <AnimatePresence>
                {metodoPago === 'SINPE' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-1">
                      {/* Datos del remitente — requeridos antes de pagar */}
                      <div className="rounded-xl p-4 space-y-3" style={{ background: 'color-mix(in srgb, #10b981 5%, transparent)', border: '1px solid color-mix(in srgb, #10b981 20%, transparent)' }}>
                        <p className="text-xs font-semibold text-emerald-400">DATOS DEL REMITENTE <span className="text-red-400 font-normal">(requerido)</span></p>

                        {/* Nombre completo */}
                        <div className="space-y-1">
                          <label htmlFor="sinpe-nombre" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Nombre completo <span className="text-red-400">*</span></label>
                          <input
                            id="sinpe-nombre"
                            type="text"
                            value={sinpeNombre}
                            onChange={(e) => { setSinpeNombre(e.target.value); if (sinpeNombreErr) setSinpeNombreErr('') }}
                            placeholder="Ej: María González Solano"
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                            style={{ background: 'var(--hc-bg)', border: `1.5px solid ${sinpeNombreErr ? '#f87171' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                          />
                          {sinpeNombreErr && <p className="text-xs text-red-400">{sinpeNombreErr}</p>}
                        </div>

                        {/* Cédula */}
                        <div className="space-y-1">
                          <label htmlFor="sinpe-cedula" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Número de cédula <span className="text-red-400">*</span></label>
                          <input
                            id="sinpe-cedula"
                            type="text"
                            value={sinpeCedula}
                            onChange={(e) => { setSinpeCedula(e.target.value.replace(/\D/g, '')); if (sinpeCedulaErr) setSinpeCedulaErr('') }}
                            placeholder="Ej: 123456789"
                            maxLength={12}
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                            style={{ background: 'var(--hc-bg)', border: `1.5px solid ${sinpeCedulaErr ? '#f87171' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                          />
                          {sinpeCedulaErr && <p className="text-xs text-red-400">{sinpeCedulaErr}</p>}
                        </div>

                        {/* Teléfono del remitente */}
                        <div className="space-y-1">
                          <label htmlFor="sinpe-telefono" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Teléfono del SINPE</label>
                          <input
                            id="sinpe-telefono"
                            type="tel"
                            value={sinpeTelefono}
                            onChange={(e) => setSinpeTelefono(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="Ej: 88887777"
                            maxLength={8}
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                            style={{ background: 'var(--hc-bg)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
                          />
                        </div>

                        {/* Correo (siempre requerido para SINPE, incluso autenticado) */}
                        {!token && (
                          <div className="space-y-1">
                            <label htmlFor="sinpe-email" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Correo electrónico</label>
                            <input
                              id="sinpe-email"
                              type="email"
                              value={sinpeEmail}
                              onChange={(e) => setSinpeEmail(e.target.value)}
                              placeholder="tu@correo.com"
                              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                              style={{ background: 'var(--hc-bg)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Preview destino SINPE */}
                      <div className="rounded-xl p-3.5 space-y-1.5" style={{ background: 'color-mix(in srgb, #10b981 6%, transparent)', border: '1px solid color-mix(in srgb, #10b981 20%, transparent)' }}>
                        <p className="text-[10px] font-semibold text-emerald-400 mb-1.5">DESTINO DEL SINPE</p>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--hc-muted)' }}>📱 Número</span>
                          <span className="font-bold tracking-wider" style={{ color: 'var(--hc-text)' }}>{SINPE_NUMERO}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--hc-muted)' }}>👤 Titular</span>
                          <span style={{ color: 'var(--hc-text)' }}>{SINPE_TITULAR}</span>
                        </div>
                        <p className="text-[10px] pt-1" style={{ color: 'var(--hc-muted)' }}>
                          Al confirmar, deberás subir una foto del comprobante.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Notas opcionales */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-2xl p-6"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold mb-4" style={{ color: 'var(--hc-text)' }}>
                {t('checkout.notes')} <span className="font-normal text-sm" style={{ color: 'var(--hc-muted)' }}>({t('checkout.optional')})</span>
              </h2>
              <SmartField
                id="notas"
                label=""
                multiline
                rows={3}
                value={notas}
                placeholder={t('checkout.notesPh')}
                helpText={t('checkout.charCount', { count: notas.length, max: 300 })}
                maxLength={300}
                onChange={(e) => setNotas(e.target.value)}
                onBlur={() => {}}
              />
            </motion.div>

            {/* Error */}
            {estado === 'failed' && error && (() => {
              const errorStr = typeof error === 'string' ? error : JSON.stringify(error)
              const isStockError = /stock insuficiente|stock\s*=\s*0|disponible=0/i.test(errorStr)
              // Extrae nombre del producto del mensaje "Stock insuficiente para 'X': ..."
              const stockMatch = errorStr.match(/para\s+'([^']+)'/)
              const productoBloqueado = stockMatch?.[1] ?? null
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  ref={errorBannerRef}
                  className="space-y-3"
                  role="alert"
                >
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
                    <p className="font-medium mb-1">{t('checkout.payError')}</p>
                    {isStockError ? (
                      <div className="space-y-2">
                        <p>
                          {productoBloqueado
                            ? <>El producto <strong className="text-red-300">"{productoBloqueado}"</strong> ya no tiene stock disponible.</>
                            : 'Uno o más productos ya no tienen stock disponible.'
                          }
                        </p>
                        <p className="text-xs text-red-300/80">
                          Retirá ese producto del carrito y volvé a intentarlo.
                        </p>
                        <Link
                          to="/carrito"
                          className="inline-block mt-1 text-xs font-semibold text-white bg-red-500/60 hover:bg-red-500/80 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Ir al carrito →
                        </Link>
                      </div>
                    ) : (
                      <>
                        <p>{errorStr}</p>
                        {intentos < maxIntentos && (
                          <button onClick={handlePagar} className="mt-3 text-[#4f7cff] hover:underline text-xs">
                            {t('checkout.retry', { remaining: maxIntentos - intentos })}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Intervención del agente — el error es nuestro, no del usuario */}
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                        style={{ background: 'var(--hc-accent)', color: '#fff' }}
                      >✦</div>
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--hc-text)' }}>HotClick AI</p>
                        <p className="text-sm leading-snug" style={{ color: 'var(--hc-muted)' }}>
                          {isStockError
                            ? 'Si querés ese producto podés consultarnos por WhatsApp — a veces tenemos unidades en bodega no publicadas.'
                            : 'Un agente puede ayudarte a completar tu compra ahora mismo por WhatsApp con solo un clic.'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${WHATSAPP}?text=${toWhatsAppMessage()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
                      style={{ background: '#25D366', color: '#fff' }}
                    >
                      <WhatsAppIcon />
                      {isStockError ? 'Consultar disponibilidad por WhatsApp' : 'Continuar compra por WhatsApp'}
                    </a>
                  </div>
                </motion.div>
              )
            })()}
          </div>

          {/* ── Resumen ── */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="sticky top-24 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.orderSummary')}</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
                    <span className="truncate mr-2">{item.nombre} ×{item.cantidad}</span>
                    <span className="shrink-0">{formatPrice((item.precio ?? item.precioVenta ?? 0) * item.cantidad)}</span>
                  </div>
                ))}
              </div>

              {/* Gift card — solo para usuarios autenticados */}
              {token && (
                <div className="pt-2">
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--hc-muted)' }}>¿Tenés una gift card?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gcInput}
                      onChange={(e) => { setGcInput(e.target.value.toUpperCase()); setGcEstado('idle'); setGcSaldo(0); setGcCodigo(null) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validarGiftCard() } }}
                      placeholder="GC-XXXX-XXXX-XXXX"
                      maxLength={30}
                      className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all"
                      style={{
                        background: 'var(--hc-bg)',
                        border: `1.5px solid ${gcBorderColor}`,
                        color: 'var(--hc-text)',
                        letterSpacing: '0.04em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={validarGiftCard}
                      disabled={gcEstado === 'loading' || !gcInput.trim()}
                      className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                    >
                      {gcEstado === 'loading' ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  <AnimatePresence mode="wait">
                    {gcEstado === 'valid' && (
                      <motion.p key="gc-ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Gift card válida · saldo ₡{new Intl.NumberFormat('es-CR').format(gcSaldo)}
                      </motion.p>
                    )}
                    {gcEstado === 'invalid' && (
                      <motion.p key="gc-err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-xs text-red-400 mt-1">
                        Código inválido, vencido o sin saldo
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Campo de cupón */}
              <div className="pt-2">
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--hc-muted)' }}>¿Tenés un cupón?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cuponInput}
                    onChange={(e) => { setCuponInput(e.target.value.toUpperCase()); setCuponEstado('idle'); setCuponDescuento(0); setCuponCodigo(null); setCuponError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validarCupon() } }}
                    placeholder="Ej: ABCDEFGHIJ"
                    maxLength={20}
                    className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all"
                    style={{
                      background: 'var(--hc-bg)',
                      border: `1.5px solid ${cuponBorderColor}`,
                      color: 'var(--hc-text)',
                      letterSpacing: '0.05em',
                    }}
                  />
                  <button
                    type="button"
                    onClick={validarCupon}
                    disabled={cuponEstado === 'loading' || !cuponInput.trim()}
                    className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }}
                  >
                    {cuponEstado === 'loading' ? '...' : 'Aplicar'}
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  {cuponEstado === 'valid' && (
                    <motion.p key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      {cuponDescuento}% de descuento aplicado
                    </motion.p>
                  )}
                  {cuponEstado === 'invalid' && (
                    <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs text-red-400 mt-1">
                      {cuponError || 'Código inválido o no disponible'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-3 border-t space-y-2 text-sm" style={{ borderColor: 'var(--hc-border)' }}>
                <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
                  <span>{t('checkout.subtotal')}</span>
                  <span>{formatPrice(subtotalCart)}</span>
                </div>
                {descuentoMonto > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Descuento ({cuponDescuento}%)</span>
                    <span>-{formatPrice(descuentoMonto)}</span>
                  </div>
                )}
                {gcAplicado > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Gift card ({gcCodigo})</span>
                    <span>-{formatPrice(gcAplicado)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
                  <span>{t('checkout.shippingCost')}</span>
                  <span className={costoEnvio === 0 ? 'text-emerald-400 font-medium' : ''}>
                    {costoEnvio === 0 ? t('checkout.free') : formatPrice(costoEnvio)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-between font-bold" style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
                <span>{t('checkout.total')}</span>
                <span className="text-lg text-[#4f7cff]">{formatPrice(totalFinal)}</span>
              </div>

              {metodoPago === 'SINPE' && (
                <div className="text-[10px] leading-relaxed rounded-lg p-2.5 space-y-0.5" style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 20%, transparent)', color: 'var(--hc-muted)' }}>
                  <p>📱 SINPE: <strong className="text-emerald-400">{SINPE_NUMERO}</strong></p>
                  <p>💰 Monto: <strong style={{ color: 'var(--hc-text)' }}>{formatPrice(totalFinal)}</strong></p>
                </div>
              )}

              {/* Trust mini badges */}
              <div className="flex items-center justify-center gap-4 py-2.5 px-3 rounded-xl text-[11px]"
                style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                <span>{t('checkout.trustWarranty')}</span>
                <span>{t('checkout.trustSecure')}</span>
                <span>{t('checkout.trustReturns')}</span>
              </div>

              {/* Consentimiento de datos — Ley 8968 */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem', borderRadius: 10, border: `1px solid ${aceptaDatos ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: aceptaDatos ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'transparent', transition: 'all 0.15s' }}>
                <input
                  type="checkbox"
                  checked={aceptaDatos}
                  onChange={e => setAceptaDatos(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--hc-accent)', width: 15, height: 15, flexShrink: 0 }}
                />
                <span style={{ fontSize: 11.5, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
                  Autorizo el tratamiento de mis datos y su transferencia al vendedor con el único fin de coordinar la entrega del pedido, conforme a la{' '}
                  <Link to="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Privacidad</Link>
                  {' '}y la{' '}
                  <Link to="/cookies" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Cookies</Link>.
                </span>
              </label>

              {/* CTA único rojo del checkout — el botón repite el monto (§5.6 / voseo 15.3) */}
              <button
                onClick={handlePagar}
                disabled={!aceptaDatos || estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos}
                className="hc-btn hc-btn-primary w-full !h-12 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {payMethodIcon}
                {payLabel}
              </button>

              <p className="text-[10px] text-center leading-relaxed flex items-center justify-center gap-1" style={{ color: 'var(--hc-muted)' }}>
                <LockIcon /> Pago cifrado · Protección al comprador incluida
              </p>
              <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                {t('checkout.terms')} <Link to="/informacion" className="hover:underline">{t('checkout.termsLink')}</Link>.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

// ── Íconos ──────────────────────────────────────────────────────────────────

function StripeIcon({ selected }) {
  return (
    <svg viewBox="0 0 32 16" className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-60'}`} fill="none">
      <text x="0" y="13" fontSize="11" fontWeight="800" fontFamily="sans-serif" fill="#6772e5">stripe</text>
    </svg>
  )
}


function CardIcon({ selected }) {
  return (
    <svg className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-50'}`} viewBox="0 0 32 20" fill="none">
      <rect width="32" height="20" rx="3" fill="#1E242E" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      <rect y="4" width="32" height="4" fill="rgba(255,255,255,0.15)" />
      <rect x="4" y="12" width="10" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

function ApplePayIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function EfectivoIcon({ selected }) {
  return (
    <svg className={`w-7 h-5 ${selected ? 'opacity-100' : 'opacity-70'}`} viewBox="0 0 36 20" fill="none">
      <rect width="36" height="20" rx="4" fill={selected ? '#78350f' : '#451a03'} />
      <rect x="2" y="5" width="32" height="10" rx="2" fill={selected ? '#d97706' : '#92400e'} opacity="0.5" />
      <circle cx="18" cy="10" r="3.5" stroke={selected ? '#fbbf24' : '#d97706'} strokeWidth="1.2" />
      <text x="4" y="8" fontSize="5" fontWeight="800" fontFamily="sans-serif" fill={selected ? '#fbbf24' : '#d97706'}>₡</text>
    </svg>
  )
}

function SinpeIcon({ selected }) {
  return (
    <svg className={`w-7 h-5 ${selected ? 'opacity-100' : 'opacity-70'}`} viewBox="0 0 36 20" fill="none">
      <rect width="36" height="20" rx="4" fill={selected ? '#065f46' : '#064e3b'} />
      <text x="4" y="14" fontSize="9" fontWeight="800" fontFamily="sans-serif" fill="#34d399">SINPE</text>
      <rect x="26" y="5" width="7" height="10" rx="1.5" fill="#34d399" opacity="0.8" />
      <rect x="27.5" y="3.5" width="4" height="1.5" rx="0.75" fill="#34d399" opacity="0.5" />
    </svg>
  )
}

function GooglePayIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
