import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'
import useCartStore from '@/store/cartStore'

// Tiempo antes de verificar (da chance al webhook de llegar)
const DELAY_PAYXPERT_MS = 2500

export default function PaymentStatusPage() {
  const [params]   = useSearchParams()
  const numeroPedido = params.get('order')
  const provider     = params.get('provider')     // "paypal" si viene de PayPal
  const paypalToken  = params.get('token')        // PayPal order ID en URL de retorno

  const { clearCart }                                           = useCartStore()
  const { estado, pagoData, error, verificarEstado, capturarPayPal } = usePayment()
  const ran = useRef(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!numeroPedido || ran.current) return
    ran.current = true

    const handlePayPal = async () => {
      if (!paypalToken) {
        // URL de cancelación de PayPal — no hay token
        await verificarEstado(numeroPedido)
        return
      }
      const data = await capturarPayPal(paypalToken, numeroPedido)
      if (data?.estadoPago === 'CAPTURADO') clearCart()
    }

    const handlePayXpert = async () => {
      await new Promise((r) => setTimeout(r, DELAY_PAYXPERT_MS))
      const data = await verificarEstado(numeroPedido)
      if (data?.estadoPago === 'CAPTURADO') clearCart()
    }

    if (provider === 'paypal') {
      handlePayPal()
    } else {
      handlePayXpert()
    }
  }, [numeroPedido])

  const isBusy = estado === 'idle' || estado === 'polling' || estado === 'capturing'

  // Pantalla de carga
  if (isBusy) {
    const msg = estado === 'capturing' ? 'Confirmando tu pago con PayPal…' : t('common.loading')
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
          <p className="text-[#e8e8ed] text-lg font-medium">{msg}</p>
          <p className="text-[#8e8e9a] text-sm">Esto puede tardar unos segundos</p>
        </div>
      </MainLayout>
    )
  }

  // Pago exitoso
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

            <p className="text-xs text-[#8e8e9a] mb-6">
              Recibirás un correo de confirmación. ¿Tienes dudas? Contáctanos por WhatsApp.
            </p>

            <Link
              to="/"
              className="inline-block w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center"
            >
              {t('payment.home')}
            </Link>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  // Pago cancelado
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

  // Pago fallido / pendiente / error
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

          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">
            {estado === 'pending' ? 'Pago en proceso' : 'Pago no completado'}
          </h1>
          <p className="text-[#8e8e9a] text-sm mb-2">
            {estado === 'pending'
              ? 'Tu pago está siendo procesado. Recibirás un correo cuando se confirme.'
              : error || 'Tu tarjeta no fue cargada. Puedes intentarlo nuevamente.'}
          </p>
          <p className="text-xs text-[#8e8e9a] mb-6">
            Si el problema persiste, contáctanos a{' '}
            <a href="mailto:soporte@hotclick.com" className="text-[#4f7cff] hover:underline">
              soporte@hotclick.com
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
