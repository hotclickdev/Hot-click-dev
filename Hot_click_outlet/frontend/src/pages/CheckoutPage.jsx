import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'

const BODEGA_DEFAULT = 1

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

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const { token }                   = useAuthStore()
  const navigate                    = useNavigate()
  const { estado, error, intentos, maxIntentos, iniciarPago } = usePayment()
  const { t } = useTranslation()

  const [metodoEnvio,  setMetodoEnvio]  = useState('RETIRO_EN_TIENDA')
  const [metodoPago,   setMetodoPago]   = useState('PAYPAL')
  const [notas,        setNotas]        = useState('')

  const costoEnvio = metodoEnvio === 'ENVIO_A_DOMICILIO' ? 2000 : 0
  const totalFinal = total() + costoEnvio

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

  const handlePagar = () => {
    iniciarPago({
      bodegaId:    BODEGA_DEFAULT,
      metodoEnvio,
      notas:       notas.trim() || null,
      provider:    metodoPago,
      items: items.map((i) => ({
        productoId: i.id,
        cantidad:   i.cantidad,
      })),
    })
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

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link to="/carrito" className="text-sm text-[#8e8e9a] hover:text-[#4f7cff] transition-colors">
            ← {t('checkout.backToCart')}
          </Link>
          <h1 className="text-3xl font-bold text-[#e8e8ed] mt-3">{t('checkout.title')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario izquierda */}
          <div className="lg:col-span-2 space-y-6">

            {/* Método de envío */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111114] border border-white/8 rounded-2xl p-6"
            >
              <h2 className="font-semibold text-[#e8e8ed] mb-4">Método de entrega</h2>
              <div className="space-y-3">
                {[
                  { value: 'RETIRO_EN_TIENDA', label: 'Retiro en tienda', sub: 'Gratis · Coordinar vía WhatsApp', precio: '₡0' },
                  { value: 'ENVIO_A_DOMICILIO', label: 'Envío a domicilio', sub: 'Correos de Costa Rica · 2-3 días hábiles', precio: formatPrice(2000) },
                ].map((op) => (
                  <label
                    key={op.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
                      ${metodoEnvio === op.value
                        ? 'border-[#4f7cff] bg-[#4f7cff]/8'
                        : 'border-white/10 hover:border-white/20'}`}
                  >
                    <input
                      type="radio" name="envio" value={op.value}
                      checked={metodoEnvio === op.value}
                      onChange={() => setMetodoEnvio(op.value)}
                      className="accent-[#4f7cff]"
                    />
                    <div className="flex-1">
                      <p className="text-[#e8e8ed] font-medium text-sm">{op.label}</p>
                      <p className="text-[#8e8e9a] text-xs mt-0.5">{op.sub}</p>
                    </div>
                    <span className={`font-semibold text-sm ${op.value === 'RETIRO_EN_TIENDA' ? 'text-[#4f7cff]' : 'text-[#e8e8ed]'}`}>
                      {op.precio}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>

            {/* Método de pago */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="bg-[#111114] border border-white/8 rounded-2xl p-6"
            >
              <h2 className="font-semibold text-[#e8e8ed] mb-4">Método de pago</h2>
              <div className="space-y-3">
                {METODOS_PAGO.map((mp) => {
                  const Icon = mp.icon
                  const selected = metodoPago === mp.id
                  return (
                    <label
                      key={mp.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
                        ${selected
                          ? 'border-[#4f7cff] bg-[#4f7cff]/8'
                          : 'border-white/10 hover:border-white/20'}`}
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
                          <p className="text-[#e8e8ed] font-medium text-sm">{mp.label}</p>
                          {mp.badge && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mp.badgeColor}`}>
                              {mp.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[#8e8e9a] text-xs mt-0.5">{mp.descripcion}</p>
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

              {/* Info contextual según proveedor */}
              <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/6">
                {metodoPago === 'PAYPAL' ? (
                  <p className="text-xs text-[#8e8e9a] leading-relaxed">
                    Serás redirigido a <strong className="text-[#e8e8ed]">PayPal</strong> para aprobar el pago.
                    Puedes usar tu saldo PayPal o tarjeta de crédito/débito. El monto se convierte a USD al tipo de cambio oficial del BCCR.
                  </p>
                ) : (
                  <p className="text-xs text-[#8e8e9a] leading-relaxed">
                    Serás redirigido a la página de pago segura de <strong className="text-[#e8e8ed]">PayXpert</strong>.
                    Visa, Mastercard y Amex aceptadas. Tus datos bancarios nunca pasan por nuestros servidores.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Notas */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-[#111114] border border-white/8 rounded-2xl p-6"
            >
              <h2 className="font-semibold text-[#e8e8ed] mb-4">
                {t('checkout.notes')} <span className="text-[#8e8e9a] font-normal text-sm">(opcional)</span>
              </h2>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones especiales, dirección de entrega, etc."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e8e8ed] placeholder-[#8e8e9a] resize-none focus:outline-none focus:border-[#4f7cff] transition-colors"
              />
            </motion.div>

            {/* Error */}
            {estado === 'failed' && error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400"
              >
                <p className="font-medium mb-1">Error al procesar el pago</p>
                <p>{error}</p>
                {intentos < maxIntentos && (
                  <button
                    onClick={handlePagar}
                    className="mt-3 text-[#4f7cff] hover:underline text-xs"
                  >
                    Intentar de nuevo ({maxIntentos - intentos} intentos restantes)
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Resumen derecha */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-24 bg-[#111114] border border-white/8 rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-semibold text-[#e8e8ed]">{t('checkout.orderSummary')}</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-[#8e8e9a]">
                    <span className="truncate mr-2">{item.nombre} ×{item.cantidad}</span>
                    <span className="shrink-0">{formatPrice((item.precio ?? item.precioVenta ?? 0) * item.cantidad)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/8 space-y-2 text-sm">
                <div className="flex justify-between text-[#8e8e9a]">
                  <span>Subtotal</span>
                  <span>{formatPrice(total())}</span>
                </div>
                <div className="flex justify-between text-[#8e8e9a]">
                  <span>Envío</span>
                  <span>{costoEnvio === 0 ? 'Gratis' : formatPrice(costoEnvio)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/8 flex justify-between font-bold text-[#e8e8ed]">
                <span>{t('checkout.total')}</span>
                <span className="text-lg text-[#4f7cff]">{formatPrice(totalFinal)}</span>
              </div>

              {/* Nota TC para PayPal */}
              {metodoPago === 'PAYPAL' && (
                <p className="text-[10px] text-[#8e8e9a] leading-relaxed bg-blue-500/8 border border-blue-500/20 rounded-lg p-2.5">
                  El monto se convertirá a USD al tipo de cambio del BCCR al momento del pago.
                </p>
              )}

              <button
                onClick={handlePagar}
                disabled={estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos}
                className="w-full py-3.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm
                           transition-all shadow-[0_0_20px_rgba(79,124,255,0.3)]
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LockIcon />
                {metodoPago === 'PAYPAL' ? 'Pagar con PayPal' : t('checkout.payNow')} · {formatPrice(totalFinal)}
              </button>

              <p className="text-[10px] text-[#8e8e9a] text-center leading-relaxed">
                Al hacer clic aceptas nuestros términos y condiciones.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

// ================================================================
// Íconos
// ================================================================

function PayPalIcon({ selected }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-60'}`} fill="none">
      <text x="0" y="16" fontSize="11" fontWeight="800" fontFamily="sans-serif" fill="#003087">Pay</text>
      <text x="9" y="16" fontSize="11" fontWeight="800" fontFamily="sans-serif" fill="#009cde">Pal</text>
    </svg>
  )
}

function CardIcon({ selected }) {
  return (
    <svg className={`w-8 h-5 ${selected ? 'opacity-100' : 'opacity-50'}`} viewBox="0 0 32 20" fill="none">
      <rect width="32" height="20" rx="3" fill="#1a1a2e" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
      <rect y="4" width="32" height="4" fill="rgba(255,255,255,0.15)"/>
      <rect x="4" y="12" width="10" height="3" rx="1" fill="rgba(255,255,255,0.4)"/>
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
