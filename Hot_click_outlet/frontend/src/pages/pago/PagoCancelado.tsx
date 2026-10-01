import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { paymentService } from '@/services/paymentService'
import { useToast } from '@/components/ui/Toast'
import CheckoutTilopayCard from '@/pages/checkout/CheckoutTilopayCard'
import FalloPago from './FalloPago'
import type { TilopayCardPayload } from '@/hooks/usePayment'

/** Pantalla cuando el pago fue cancelado o rechazado en el proveedor (Figma `29:1999`). */
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
    <FalloPago
      motivo={motivo}
      numeroPedido={numeroPedido}
      onReintentar={() => void onReintentar()}
      reintentando={reintentando}
    />
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
