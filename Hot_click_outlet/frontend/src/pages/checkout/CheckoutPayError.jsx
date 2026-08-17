import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { WhatsAppIcon } from './checkoutIcons'
import { WHATSAPP } from './checkoutHelpers'

export default function CheckoutPayError({
  estado,
  error,
  intentos,
  maxIntentos,
  onPagar,
  toWhatsAppMessage,
  errorBannerRef,
}) {
  const { t } = useTranslation()
  if (estado !== 'failed' || !error) return null
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
              <button onClick={onPagar} className="mt-3 text-[#4f7cff] hover:underline text-xs">
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
}
