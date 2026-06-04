import { useEffect, useRef } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'

export default function PaymentStatusPage() {
  const [params]      = useSearchParams()
  const { pathname }  = useLocation()
  const numeroPedido  = params.get('order')
  const provider      = params.get('provider')
  const paypalToken   = params.get('token')
  const esCancelacion = pathname === '/pago/cancelado'

  const { clearCart }                                                           = useCartStore()
  const { token }                                                               = useAuthStore()
  const { estado, pagoData, error, iniciarPolling, stopPolling,
          capturarPayPal, cancelarPedido }                                      = usePayment()
  const ran = useRef(false)
  const { t } = useTranslation()

  // Limpiar el polling al desmontar el componente
  useEffect(() => () => stopPolling(), [stopPolling])

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
  if (isBusy) {
    const msg = estado === 'capturing'
      ? 'Confirmando tu pago…'
      : 'Verificando tu pago…'
    const sub = 'Esto puede tardar unos segundos'
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
          <p className="text-[#e8e8ed] text-lg font-medium">{msg}</p>
          <p className="text-[#8e8e9a] text-sm">{sub}</p>
        </div>
      </MainLayout>
    )
  }

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

            <p className="text-xs text-[#8e8e9a] mb-6">
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
                  href="https://wa.me/50689745370"
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
            <div className="w-16 h-16 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">Tu pago está siendo revisado</h1>
            <p className="text-[#8e8e9a] text-sm mb-2">
              La confirmación puede tardar unos minutos más. Te enviaremos un correo cuando se procese.
            </p>
            <p className="text-xs text-[#8e8e9a] mb-6">
              Si tu banco ya lo cobró y no recibes confirmación en 15 minutos, contáctanos.
            </p>

            {pagoData?.numeroPedido && (
              <div className="bg-white/5 rounded-xl p-3 text-sm mb-6">
                <span className="text-[#8e8e9a]">Pedido: </span>
                <span className="text-[#e8e8ed] font-mono font-medium">{pagoData.numeroPedido}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <a
                href="https://wa.me/50689745370"
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
          <p className="text-xs text-[#8e8e9a] mb-6">
            Si el problema persiste, contáctanos a{' '}
            <a href="mailto:hotclick.cr@gmail.com" className="text-[#4f7cff] hover:underline">
              hotclick.cr@gmail.com
            </a>
          </p>

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
