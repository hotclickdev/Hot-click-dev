import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { WhatsAppIcon } from './checkoutIcons'
import { WHATSAPP } from './checkoutHelpers'
import type { ReactNode, RefObject } from 'react'
import type { TFunction } from 'i18next'

function WhatsAppAtajo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full min-h-11 inline-flex items-center justify-center gap-2 text-sm font-medium"
      style={{ color: 'var(--hc-muted)' }}
    >
      <WhatsAppIcon />
      {children}
    </a>
  )
}

function ErrorStock({ productoBloqueado }: { productoBloqueado: string | null }) {
  return (
    <div className="space-y-2">
      <p>
        {productoBloqueado
          ? <>El producto <strong className="text-red-300">"{productoBloqueado}"</strong> ya no tiene stock disponible.</>
          : 'Uno o más productos ya no tienen stock disponible.'}
      </p>
      <p className="text-xs text-red-300/80">
        Retirá ese producto del pedido y volvé a intentarlo.
      </p>
      <Link to="/carrito" className="hc-btn hc-btn-primary mt-1 min-h-11 inline-flex items-center justify-center">
        Ir al pedido
      </Link>
    </div>
  )
}

function ErrorPago({
  errorStr, intentos, maxIntentos, onPagar, t,
}: {
  errorStr: string
  intentos: number
  maxIntentos: number
  onPagar: () => void
  t: TFunction
}) {
  return (
    <div className="space-y-3">
      <p>{errorStr}</p>
      {intentos < maxIntentos && (
        <button type="button" onClick={onPagar} className="hc-btn hc-btn-primary w-full min-h-11">
          {t('checkout.retry', { remaining: maxIntentos - intentos })}
        </button>
      )}
    </div>
  )
}

type CheckoutPayErrorProps = {
  estado: string
  error: unknown
  intentos: number
  maxIntentos: number
  onPagar: () => void
  toWhatsAppMessage: () => string
  errorBannerRef: RefObject<HTMLDivElement | null>
}

export default function CheckoutPayError({
  estado,
  error,
  intentos,
  maxIntentos,
  onPagar,
  toWhatsAppMessage,
  errorBannerRef,
}: CheckoutPayErrorProps) {
  const { t } = useTranslation()
  if (estado !== 'failed' || !error) return null

  const errorStr = typeof error === 'string' ? error : JSON.stringify(error)
  const isStockError = /stock insuficiente|stock\s*=\s*0|disponible=0/i.test(errorStr)
  const stockMatch = errorStr.match(/para\s+'([^']+)'/)
  const hrefWa = `https://wa.me/${WHATSAPP}?text=${toWhatsAppMessage()}`
  const etiquetaWa = isStockError
    ? 'Consultar disponibilidad por WhatsApp'
    : t('cart.orderWhatsapp')

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
        {isStockError
          ? <ErrorStock productoBloqueado={stockMatch?.[1] ?? null} />
          : (
            <ErrorPago
              errorStr={errorStr}
              intentos={intentos}
              maxIntentos={maxIntentos}
              onPagar={onPagar}
              t={t}
            />
          )}
      </div>
      <WhatsAppAtajo href={hrefWa}>{etiquetaWa}</WhatsAppAtajo>
    </motion.div>
  )
}
