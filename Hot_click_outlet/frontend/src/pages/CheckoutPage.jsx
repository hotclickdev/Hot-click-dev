import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'

const BODEGA_DEFAULT = 1
const WHATSAPP = '50689745370'

const METODOS_PAGO = [
  {
    id: 'PAYPAL',
    label: 'PayPal',
    descripcion: 'Paga con tu cuenta PayPal o tarjeta vía PayPal',
    badge: 'Recomendado',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: PayPalIcon,
  },
  {
    id: 'PAYXPERT',
    label: 'Tarjeta de crédito / débito',
    descripcion: 'Visa, Mastercard, Amex · 3D Secure',
    badge: null,
    badgeColor: '',
    icon: CardIcon,
  },
]

// ── Inline field validation ─────────────────────────────────────────────────
function validatePhone(v) {
  const d = v.replace(/\D/g, '')
  if (!v.trim()) return 'Teléfono requerido para envío a domicilio'
  if (d.length < 8) return 'Ingresa un número válido (8 dígitos)'
  return ''
}
function validateAddress(v) {
  if (!v.trim()) return 'Dirección requerida para envío a domicilio'
  if (v.trim().length < 10) return 'Ingresa la dirección completa (provincia, cantón, señas)'
  return ''
}
function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length >= 5 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
}

// ── SmartField component ────────────────────────────────────────────────────
function SmartField({ label, id, value, onChange, onBlur, error, success, placeholder, type = 'text', maxLength, multiline, rows = 3, helpText }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium" style={{ color: error ? '#f87171' : success ? '#34d399' : 'var(--hc-muted)' }}>
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
          autoComplete={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'off'}
          className="w-full rounded-xl px-4 py-3 text-sm bg-white/5 outline-none transition-all duration-200 resize-none"
          style={{
            color: 'var(--hc-text)',
            border: error   ? '1.5px solid #f87171' :
                    success ? '1.5px solid #34d399' :
                              '1.5px solid var(--hc-border)',
          }}
          onFocus={(e) => { e.target.style.borderColor = error ? '#f87171' : 'var(--hc-accent)'; e.target.style.boxShadow = error ? '0 0 0 3px rgba(248,113,113,0.1)' : '0 0 0 3px rgba(79,124,255,0.12)' }}
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
  const { items, total, clearCart, toWhatsAppMessage } = useCartStore()
  const { token }                    = useAuthStore()
  const navigate                     = useNavigate()
  const { estado, error, intentos, maxIntentos, iniciarPago } = usePayment()
  const { t } = useTranslation()

  const [metodoEnvio,  setMetodoEnvio]  = useState('RETIRO_EN_TIENDA')
  const [metodoPago,   setMetodoPago]   = useState('PAYPAL')
  const [notas,        setNotas]        = useState('')

  // Domicilio fields
  const [telefono,       setTelefono]       = useState('')
  const [telefonoError,  setTelefonoError]  = useState('')
  const [telefonoDirty,  setTelefonoDirty]  = useState(false)
  const [direccion,      setDireccion]      = useState('')
  const [direccionError, setDireccionError] = useState('')
  const [direccionDirty, setDireccionDirty] = useState(false)

  const costoEnvio = metodoEnvio === 'ENVIO_A_DOMICILIO' ? 2000 : 0
  const totalFinal = total() + costoEnvio

  // Validate domicilio fields before pay
  const validateDomicilio = useCallback(() => {
    if (metodoEnvio !== 'ENVIO_A_DOMICILIO') return true
    const tErr = validatePhone(telefono)
    const dErr = validateAddress(direccion)
    setTelefonoError(tErr)
    setDireccionError(dErr)
    setTelefonoDirty(true)
    setDireccionDirty(true)
    return !tErr && !dErr
  }, [metodoEnvio, telefono, direccion])

  if (!token) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-[#e8e8ed] text-lg mb-4">Debes iniciar sesión para pagar.</p>
          <Link to="/login" className="px-6 py-2.5 rounded-xl bg-[#4f7cff] text-white font-medium">
            {t('register.login')}
          </Link>
        </div>
      </MainLayout>
    )
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-[#e8e8ed] text-lg mb-4">Tu carrito está vacío.</p>
          <Link to="/productos" className="px-6 py-2.5 rounded-xl bg-[#4f7cff] text-white font-medium">
            {t('checkout.continueShopping')}
          </Link>
        </div>
      </MainLayout>
    )
  }

  if (estado === 'redirecting' || estado === 'loading') {
    const msg = estado === 'redirecting'
      ? `Redirigiendo a ${metodoPago === 'PAYPAL' ? 'PayPal' : 'la pasarela de pago'}…`
      : 'Preparando tu pago…'
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
          <p className="text-[#e8e8ed] text-lg font-medium">{msg}</p>
          <p className="text-[#8e8e9a] text-sm">No cierres esta ventana</p>
        </div>
      </MainLayout>
    )
  }

  const handlePagar = () => {
    if (!validateDomicilio()) return
    const notasFull = [
      notas.trim(),
      metodoEnvio === 'ENVIO_A_DOMICILIO' && telefono ? `Teléfono: ${telefono}` : '',
      metodoEnvio === 'ENVIO_A_DOMICILIO' && direccion ? `Dirección: ${direccion}` : '',
    ].filter(Boolean).join(' | ')

    analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
    iniciarPago({
      bodegaId:    BODEGA_DEFAULT,
      metodoEnvio,
      notas:       notasFull || null,
      provider:    metodoPago,
      items: items.map((i) => ({ productoId: i.id, cantidad: i.cantidad })),
    })
  }

  const handleWhatsApp = () => {
    analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + i.cantidad, 0))
    const msg = toWhatsAppMessage()
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Stepper */}
        <CheckoutStepper activeStep="checkout" />

        {/* Header */}
        <div className="mb-8">
          <Link to="/carrito" className="text-sm transition-colors hover:text-[#4f7cff]" style={{ color: 'var(--hc-muted)' }}>
            ← {t('checkout.backToCart')}
          </Link>
          <h1 className="text-3xl font-bold mt-3" style={{ color: 'var(--hc-text)' }}>{t('checkout.title')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Formulario ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Express Checkout */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Pago exprés</h2>
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
                  title="Próximamente"
                >
                  <ApplePayIcon />
                  Apple Pay
                  <span className="absolute -top-2 -right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30">
                    Pronto
                  </span>
                </div>

                {/* Google Pay — placeholder */}
                <div className="relative flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border cursor-not-allowed opacity-40"
                  style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}
                  title="Próximamente"
                >
                  <GooglePayIcon />
                  Google Pay
                  <span className="absolute -top-2 -right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30">
                    Pronto
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>o paga con</span>
                <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
              </div>
            </motion.div>

            {/* Método de envío */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>Método de entrega</h2>
              <div className="space-y-3">
                {[
                  { value: 'RETIRO_EN_TIENDA', label: 'Retiro en tienda', sub: 'Gratis · Coordinar vía WhatsApp', precio: '₡0' },
                  { value: 'ENVIO_A_DOMICILIO', label: 'Envío a domicilio', sub: 'Correos de Costa Rica · 2-3 días hábiles', precio: formatPrice(2000) },
                ].map((op) => (
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
                      onChange={() => setMetodoEnvio(op.value)}
                      className="accent-[#4f7cff]"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>{op.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{op.sub}</p>
                    </div>
                    <span className={`font-semibold text-sm ${op.value === 'RETIRO_EN_TIENDA' ? 'text-[#4f7cff]' : ''}`}
                      style={op.value !== 'RETIRO_EN_TIENDA' ? { color: 'var(--hc-text)' } : {}}>
                      {op.precio}
                    </span>
                  </label>
                ))}
              </div>

              {/* Domicilio fields — animate in */}
              <AnimatePresence>
                {metodoEnvio === 'ENVIO_A_DOMICILIO' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden pt-2"
                  >
                    <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />
                    <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
                      Datos de entrega
                    </p>
                    <SmartField
                      id="telefono"
                      label="Teléfono de contacto *"
                      type="tel"
                      value={telefono}
                      placeholder="8888-8888"
                      error={telefonoDirty ? telefonoError : ''}
                      success={telefonoDirty && !telefonoError && telefono.length >= 8}
                      helpText="Para coordinar la entrega con Correos CR"
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value)
                        setTelefono(formatted)
                        if (telefonoDirty) setTelefonoError(validatePhone(formatted))
                      }}
                      onBlur={() => { setTelefonoDirty(true); setTelefonoError(validatePhone(telefono)) }}
                    />
                    <SmartField
                      id="direccion"
                      label="Dirección completa *"
                      multiline
                      rows={3}
                      value={direccion}
                      placeholder="Provincia, cantón, distrito, señas adicionales…"
                      error={direccionDirty ? direccionError : ''}
                      success={direccionDirty && !direccionError && direccion.trim().length >= 10}
                      helpText={`${direccion.length}/200 caracteres`}
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
              className="rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>Método de pago</h2>
              <div className="space-y-3">
                {METODOS_PAGO.map((mp) => {
                  const Icon = mp.icon
                  const selected = metodoPago === mp.id
                  return (
                    <label
                      key={mp.id}
                      className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200"
                      style={selected
                        ? { borderColor: 'var(--hc-accent)', background: 'color-mix(in srgb, var(--hc-accent) 6%, transparent)' }
                        : { borderColor: 'var(--hc-border)' }}
                    >
                      <input
                        type="radio" name="pago" value={mp.id}
                        checked={selected}
                        onChange={() => setMetodoPago(mp.id)}
                        className="accent-[#4f7cff] shrink-0"
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
                      {selected && (
                        <div className="w-4 h-4 rounded-full bg-[#4f7cff] flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>

              <div className="p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)' }}>
                {metodoPago === 'PAYPAL' ? (
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                    Serás redirigido a <strong style={{ color: 'var(--hc-text)' }}>PayPal</strong> para aprobar el pago.
                    El monto se convierte a USD al tipo de cambio oficial del BCCR.
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                    Serás redirigido a la página segura de <strong style={{ color: 'var(--hc-text)' }}>PayXpert</strong>.
                    Tus datos bancarios nunca pasan por nuestros servidores.
                  </p>
                )}
              </div>
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
                {t('checkout.notes')} <span className="font-normal text-sm" style={{ color: 'var(--hc-muted)' }}>(opcional)</span>
              </h2>
              <SmartField
                id="notas"
                label=""
                multiline
                rows={3}
                value={notas}
                placeholder="Instrucciones especiales, horario preferido, etc."
                helpText={`${notas.length}/300 caracteres`}
                maxLength={300}
                onChange={(e) => setNotas(e.target.value)}
                onBlur={() => {}}
              />
            </motion.div>

            {/* Error */}
            {estado === 'failed' && error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400"
                role="alert"
              >
                <p className="font-medium mb-1">Error al procesar el pago</p>
                <p>{error}</p>
                {intentos < maxIntentos && (
                  <button onClick={handlePagar} className="mt-3 text-[#4f7cff] hover:underline text-xs">
                    Intentar de nuevo ({maxIntentos - intentos} intentos restantes)
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* ── Resumen ── */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="sticky top-24 rounded-2xl p-6 space-y-4"
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

              <div className="pt-3 border-t space-y-2 text-sm" style={{ borderColor: 'var(--hc-border)' }}>
                <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(total())}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
                  <span>Envío</span>
                  <span className={costoEnvio === 0 ? 'text-emerald-400 font-medium' : ''}>
                    {costoEnvio === 0 ? 'Gratis' : formatPrice(costoEnvio)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-between font-bold" style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
                <span>{t('checkout.total')}</span>
                <span className="text-lg text-[#4f7cff]">{formatPrice(totalFinal)}</span>
              </div>

              {metodoPago === 'PAYPAL' && (
                <p className="text-[10px] leading-relaxed rounded-lg p-2.5 bg-blue-500/8 border border-blue-500/20" style={{ color: 'var(--hc-muted)' }}>
                  El monto se convertirá a USD al tipo de cambio del BCCR al momento del pago.
                </p>
              )}

              {/* Trust mini badges */}
              <div className="flex items-center justify-center gap-4 py-2.5 px-3 rounded-xl text-[11px]"
                style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                <span>🛡 Garantía</span>
                <span>🔒 Seguro</span>
                <span>↩ Devoluciones</span>
              </div>

              <button
                onClick={handlePagar}
                disabled={estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos}
                className="w-full py-3.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm
                           transition-all shadow-[0_0_20px_rgba(79,124,255,0.3)] hover:shadow-[0_0_32px_rgba(79,124,255,0.45)]
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LockIcon />
                {metodoPago === 'PAYPAL' ? 'Pagar con PayPal' : t('checkout.payNow')} · {formatPrice(totalFinal)}
              </button>

              <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                Al hacer clic aceptas nuestros <Link to="/informacion" className="hover:underline">términos y condiciones</Link>.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

// ── Íconos ──────────────────────────────────────────────────────────────────

function PayPalIcon({ selected }) {
  return (
    <svg viewBox="0 0 24 16" className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-60'}`} fill="none">
      <text x="0" y="13" fontSize="10" fontWeight="800" fontFamily="sans-serif" fill="#003087">Pay</text>
      <text x="9" y="13" fontSize="10" fontWeight="800" fontFamily="sans-serif" fill="#009cde">Pal</text>
    </svg>
  )
}

function CardIcon({ selected }) {
  return (
    <svg className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-50'}`} viewBox="0 0 32 20" fill="none">
      <rect width="32" height="20" rx="3" fill="#1a1a2e" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
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
