import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { paymentService } from '@/services/paymentService'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import CheckoutTilopayCard from '@/pages/checkout/CheckoutTilopayCard'
import { WHATSAPP } from '@/pages/checkout/checkoutHelpers'
import { leerCompra } from '@/pages/checkout/compraGuardada'
import EncabezadoCompraSegura from '@/pages/checkout/EncabezadoCompraSegura'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { numeroCompraVisible } from '@/pages/checkout/validacionCompra'
import type { TilopayCardPayload } from '@/hooks/usePayment'

type PagoCanceladoProps = {
  /** Razón ya conocida (p. ej. error del polling); si falta, se lee del enlace de retorno. */
  motivoError?: string | null
}

/** Pago rechazado, fallido o cancelado en el proveedor (Figma `29:1999`). */
export default function PagoCancelado({ motivoError }: PagoCanceladoProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { showToast } = useToast()
  const motivo = (motivoError || params.get('motivo') || params.get('description') || '').trim()
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

  const mensajeSoporte = numeroPedido
    ? t('compra.fallido.mensajeSoporte', { numero: numeroPedido })
    : t('compra.fallido.mensajeSoporteSinNumero')

  return (
    <div className="min-h-screen bg-hc-n-50">
      <EncabezadoCompraSegura />
      <main className="mx-auto flex w-full max-w-[480px] flex-col">
        <div className="flex flex-col items-center gap-[10px] px-[16px] pb-[12px] pt-[32px] text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-[#fef2f1] text-hc-red-600">
            <IconoFigma src={ICONOS_COMPRA.fallido} size={34} />
          </span>
          <h1 className="font-display text-[19px] font-bold text-hc-n-900">{t('compra.fallido.titulo')}</h1>
          <p className="text-[14px] leading-[20px] text-hc-n-600">
            {[motivo, t('compra.fallido.texto')].filter(Boolean).join(' ')}
          </p>
        </div>
        <div className="px-[16px] py-[8px]">
          <ConsejosPagoFallido />
        </div>
        <div className="flex flex-col gap-[10px] px-[16px] pb-[10px] pt-[12px]">
          <button
            type="button"
            onClick={() => void onReintentar()}
            disabled={reintentando}
            className="flex items-center justify-center gap-[8px] rounded-[12px] bg-hc-red-500 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-0 disabled:opacity-50"
          >
            <IconoFigma src={ICONOS_COMPRA.reintentar} size={18} />
            {reintentando ? t('compra.fallido.reintentando') : t('compra.fallido.reintentar')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="flex items-center justify-center gap-[8px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-900"
          >
            <IconoFigma src={ICONOS_COMPRA.tarjeta} size={18} />
            {t('compra.fallido.cambiarMetodo')}
          </button>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensajeSoporte)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-[8px] text-[14px] font-semibold text-hc-blue-600"
          >
            <IconoFigma src={ICONOS_COMPRA.whatsapp} size={16} />
            {t('compra.fallido.soporte')}
          </a>
        </div>
        <ResumenPedidoGuardado numeroPedido={numeroPedido} />
      </main>
    </div>
  )
}

function ConsejosPagoFallido() {
  const { t } = useTranslation()
  const consejos = [t('compra.fallido.consejo1'), t('compra.fallido.consejo2'), t('compra.fallido.consejo3')]
  return (
    <section className="flex flex-col gap-[10px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-[16px]">
      <h2 className="text-[15px] font-semibold text-hc-n-900">{t('compra.fallido.queHacer')}</h2>
      <ul className="flex flex-col gap-[10px]">
        {consejos.map((consejo) => (
          <li key={consejo} className="text-[13px] leading-[19px] text-hc-n-600">• {consejo}</li>
        ))}
      </ul>
    </section>
  )
}

/** «Pedido #HC-10482 · 2 productos ₡33.400» (Figma `29:2032`), con lo guardado al pagar. */
function ResumenPedidoGuardado({ numeroPedido }: { numeroPedido: string }) {
  const { t } = useTranslation()
  const [compra] = useState(leerCompra)
  if (!numeroPedido || !compra) return null
  const numero = numeroCompraVisible(numeroPedido, compra.paquetes.length)
  return (
    <div className="px-[16px] pb-[24px] pt-[10px]">
      <p className="flex items-center justify-between gap-[12px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-[16px]">
        <span className="text-[13px] text-hc-n-600">
          {t('compra.fallido.resumen', { numero, productos: t('compra.resumen.cantidad', { count: compra.cantidadProductos }) })}
        </span>
        <span className="font-display text-[15px] font-bold text-hc-n-900">{formatPrice(compra.total)}</span>
      </p>
    </div>
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
