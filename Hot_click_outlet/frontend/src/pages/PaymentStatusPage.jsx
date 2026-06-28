import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import AIPostPaySection from '@/components/ai/AIPostPaySection'

const BENEFITS = [
  { icon: '🛡', text: 'Tu compra está protegida con garantía de 40 días' },
  { icon: '📦', text: 'Tu pedido será preparado con cuidado' },
  { icon: '🚀', text: 'Envíos rápidos a todo Costa Rica' },
  { icon: '💬', text: 'Soporte por WhatsApp disponible 24/7' },
  { icon: '🔒', text: 'Pago 100% seguro y encriptado' },
  { icon: '⭐', text: 'Miles de clientes satisfechos en Costa Rica' },
]

function PaymentLoadingScreen({ estado, stripeApproved }) {
  const [progress, setProgress] = useState(0)
  const [benefitIdx, setBenefitIdx] = useState(0)

  // Barra de progreso: llega a 85% mientras espera, salta a 100% al completar
  useEffect(() => {
    const target = estado === 'capturing' ? 60 : 85
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= target) { clearInterval(interval); return p }
        const step = (target - p) * 0.04
        return Math.min(p + Math.max(step, 0.3), target)
      })
    }, 120)
    return () => clearInterval(interval)
  }, [estado])

  // Rotación de beneficios cada 3s
  useEffect(() => {
    const id = setInterval(() => setBenefitIdx(i => (i + 1) % BENEFITS.length), 3000)
    return () => clearInterval(id)
  }, [])

  const benefit = BENEFITS[benefitIdx]

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-4 py-24 flex flex-col items-center gap-8 text-center">

        {/* Ícono animado */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '2px solid color-mix(in srgb, var(--hc-accent) 30%, transparent)' }}>
            <svg className="w-9 h-9 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="var(--hc-accent)" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: 'var(--hc-accent)' }} />
        </div>

        {/* Texto principal */}
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--hc-text)' }}>
            ¡Gracias por tu compra!
          </h2>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {estado === 'capturing'
              ? 'Confirmando tu pago…'
              : stripeApproved
                ? 'Pago aprobado — registrando en el sistema…'
                : 'Verificando el pago con el banco…'}
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full">
          <div className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--hc-surface-2)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--hc-accent), color-mix(in srgb, var(--hc-accent) 70%, var(--hc-blue-300)))' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--hc-muted)' }}>
            Esto puede tardar unos segundos…
          </p>
        </div>

        {/* Beneficios rotativos */}
        <div className="w-full rounded-2xl p-4 min-h-[64px] flex items-center justify-center"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={benefitIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className="text-2xl">{benefit.icon}</span>
              <span className="text-sm font-medium text-left" style={{ color: 'var(--hc-text)' }}>
                {benefit.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </MainLayout>
  )
}

export default function PaymentStatusPage() {
  const [params]      = useSearchParams()
  const { pathname }  = useLocation()
  const numeroPedido  = params.get('order')
  const provider      = params.get('provider')
  const paypalToken   = params.get('token')
  // Stripe agrega redirect_status=succeeded cuando el pago ya fue aprobado
  const redirectStatus = params.get('redirect_status')
  const stripeApproved = redirectStatus === 'succeeded'
  const esCancelacion = pathname === '/pago/cancelado' || redirectStatus === 'failed'

  const { clearCart }                                                           = useCartStore()
  const { token }                                                               = useAuthStore()
  const { estado, pagoData, error, iniciarPolling, stopPolling,
          capturarPayPal, cancelarPedido }                                      = usePayment()
  const ran = useRef(false)
  const { t } = useTranslation()

  // Limpiar el polling al desmontar el componente
  useEffect(() => () => stopPolling(), [stopPolling])

  // Scroll al inicio al regresar de la pasarela de pago
  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Limpiar carrito cuando el pago se confirma (independiente del proveedor)
  useEffect(() => {
    if (estado === 'success') clearCart()
  }, [estado, clearCart])

  // Iniciar el flujo según si es cancelación o retorno de pago
  useEffect(() => {
    if (!numeroPedido || ran.current) return
    ran.current = true

    if (esCancelacion) {
      // El usuario canceló en la página del proveedor — liberar stock reservado
      cancelarPedido(numeroPedido)
      return
    }

    if (provider === 'paypal' && paypalToken) {
      // URL de retorno PayPal con aprobación — capturar el pago directamente
      capturarPayPal(paypalToken, numeroPedido)
    } else {
      // Stripe (y otros) — el webhook confirma el pago; iniciamos polling
      iniciarPolling(numeroPedido)
    }
  }, [numeroPedido])

  const isBusy = estado === 'idle' || estado === 'polling' || estado === 'capturing'

  // ── Pantalla de carga ──────────────────────────────────────────────
  if (isBusy) return <PaymentLoadingScreen estado={estado} stripeApproved={stripeApproved} />

  // ── Pago exitoso ───────────────────────────────────────────────────
  if (estado === 'success') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">{t('payment.success')}</h1>
            <p className="text-[#8e8e9a] text-sm mb-6">{t('payment.successSub')}</p>

            {pagoData && (
              <div className="bg-white/5 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-[#8e8e9a]">{t('payment.orderNumber')}</span>
                  <span className="text-[#e8e8ed] font-mono font-medium">{pagoData.numeroPedido}</span>
                </div>
                {pagoData.total && (
                  <div className="flex justify-between">
                    <span className="text-[#8e8e9a]">Total pagado</span>
                    <span className="text-[#4f7cff] font-bold">{formatPrice(pagoData.total)}</span>
                  </div>
                )}
                {pagoData.metodoPago && (
                  <div className="flex justify-between">
                    <span className="text-[#8e8e9a]">Método</span>
                    <span className="text-[#e8e8ed]">{pagoData.metodoPago}</span>
                  </div>
                )}
                {pagoData.cardLast4 && (
                  <div className="flex justify-between">
                    <span className="text-[#8e8e9a]">Tarjeta</span>
                    <span className="text-[#e8e8ed]">{pagoData.cardBrand} •••• {pagoData.cardLast4}</span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 text-sm text-center mb-4">
              <span className="text-emerald-400 font-medium">🛡 Tu garantía de 40 días está activa</span>
              <p className="text-[#8e8e9a] text-xs mt-1">
                Si tienes cualquier problema, contáctanos por WhatsApp.
              </p>
            </div>

            <AIPostPaySection
              tipo="success"
              numeroPedido={pagoData?.numeroPedido || numeroPedido || ''}
              metodoPago={pagoData?.metodoPago || ''}
            />

            <p className="text-xs text-[#8e8e9a] mb-6 mt-4">
              Recibirás un correo de confirmación. ¿Tienes dudas? Contáctanos por WhatsApp.
            </p>

            <div className="flex flex-col gap-3">
              {token ? (
                <Link
                  to="/mis-pedidos"
                  className="inline-block w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center"
                >
                  Ver mis pedidos
                </Link>
              ) : (
                <a
                  href="https://wa.me/50686667888"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-sm transition-all text-center"
                >
                  📱 Consultar mi pedido por WhatsApp
                </a>
              )}
              <Link
                to="/"
                className="inline-block w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center"
              >
                {t('payment.home')}
              </Link>
              {!token && (
                <Link
                  to="/registro"
                  className="text-xs text-center text-[#4f7cff] hover:underline"
                >
                  Crear cuenta para ver el historial de pedidos →
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  // ── Pago cancelado ─────────────────────────────────────────────────
  if (estado === 'cancelled') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">{t('payment.cancelled')}</h1>
            <p className="text-[#8e8e9a] text-sm mb-6">{t('payment.cancelledSub')}</p>
            <div className="flex flex-col gap-3">
              <Link to="/checkout" className="w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center">
                {t('payment.retry')}
              </Link>
              <Link to="/carrito" className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center">
                {t('checkout.backToCart')}
              </Link>
            </div>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  // ── Timeout — pago en revisión ─────────────────────────────────────
  if (estado === 'timeout') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">
              {stripeApproved ? '¡Pago aprobado!' : 'Tu pago está siendo revisado'}
            </h1>
            <p className="text-[#8e8e9a] text-sm mb-2">
              {stripeApproved
                ? 'Tu banco ya confirmó el pago. Estamos registrando tu pedido — recibirás un correo en unos minutos.'
                : 'La confirmación puede tardar unos minutos más. Te enviaremos un correo cuando se procese.'}
            </p>
            <p className="text-xs text-[#8e8e9a] mb-6">
              Si no recibes confirmación en 15 minutos, contáctanos por WhatsApp con el número de pedido.
            </p>

            {pagoData?.numeroPedido && (
              <div className="bg-white/5 rounded-xl p-3 text-sm mb-6">
                <span className="text-[#8e8e9a]">Pedido: </span>
                <span className="text-[#e8e8ed] font-mono font-medium">{pagoData.numeroPedido}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <a
                href="https://wa.me/50686667888"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-sm transition-all text-center"
              >
                📱 Contactar soporte por WhatsApp
              </a>
              <Link to="/mis-pedidos" className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center">
                Ver mis pedidos
              </Link>
            </div>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  // ── Pago fallido / error ───────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">Pago no completado</h1>
          <p className="text-[#8e8e9a] text-sm mb-2">
            {error || 'Tu tarjeta no fue cargada. Puedes intentarlo nuevamente.'}
          </p>
          <AIPostPaySection
            tipo="failed"
            numeroPedido={numeroPedido || ''}
            errorCode={error || ''}
          />

          <div className="flex flex-col gap-3 mt-4">
            <Link to="/checkout" className="w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center">
              {t('payment.retry')}
            </Link>
            <Link to="/carrito" className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center">
              {t('checkout.backToCart')}
            </Link>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}
