import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { paymentService } from '@/services/paymentService'
import { useToast } from '@/components/ui/Toast'
import CheckoutTilopayCard from '@/pages/checkout/CheckoutTilopayCard'
import type { TilopayCardPayload } from '@/hooks/usePayment'

/** Pantalla cuando el usuario canceló el pago en el proveedor. */
export default function PagoCancelado() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { showToast } = useToast()
  const motivo = (params.get('motivo') || params.get('description') || '').trim()
  const numeroPedido = (params.get('order') || params.get('numeroPedido') || '').trim()
  const [reintentando, setReintentando] = useState(false)
  const [tilopayRetry, setTilopayRetry] = useState<TilopayCardPayload | null>(null)

  async function onReintentar() {
    if (!numeroPedido) {
      navigate('/checkout')
      return
    }
    setReintentando(true)
    try {
      const { data } = await paymentService.reintentarTilopay(numeroPedido)
      const payload = payloadDesdeReintento(data, numeroPedido)
      if (payload) {
        setTilopayRetry(payload)
        return
      }
      showToast(t('payment.retryUnavailable'), 'error')
      navigate('/checkout')
    } catch {
      showToast(t('payment.retryUnavailable'), 'error')
    } finally {
      setReintentando(false)
    }
  }

  if (tilopayRetry) {
    return (
      <CheckoutTilopayCard
        payload={tilopayRetry}
        onVolver={() => navigate('/checkout')}
      />
    )
  }

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
          <p className="text-[#8e8e9a] text-sm mb-2">{t('payment.cancelledSub')}</p>
          {motivo && (
            <p className="text-amber-400/90 text-sm mb-6 rounded-xl px-3 py-2 border border-amber-500/25 bg-amber-500/10">
              {motivo}
            </p>
          )}
          {!motivo && <div className="mb-6" />}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void onReintentar()}
              disabled={reintentando}
              className="hc-btn hc-btn-primary w-full min-h-11 disabled:opacity-50"
            >
              {reintentando ? t('payment.retrying') : t('payment.retryPayment')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all"
            >
              {t('payment.changeMethod')}
            </button>
            <Link to="/carrito" className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center">
              {t('checkout.backToCart')}
            </Link>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}

function payloadDesdeReintento(data: unknown, fallbackNumero: string): TilopayCardPayload | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const sdkToken = typeof d.sdkToken === 'string' ? d.sdkToken : ''
  if (!sdkToken) return null
  const numeroPedido = typeof d.numeroPedido === 'string' ? d.numeroPedido : fallbackNumero
  const orderNumber = typeof d.orderNumber === 'string' ? d.orderNumber : numeroPedido
  const monto = Number(d.monto ?? d.total ?? 0) || 0
  const redirectUrl = typeof d.redirectUrl === 'string' ? d.redirectUrl : undefined
  return { numeroPedido, sdkToken, monto, orderNumber, redirectUrl }
}
